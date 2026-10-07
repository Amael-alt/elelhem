// L'ordre des passes de post-traitement, leurs cibles et les vues de débogage.
//
// Une image :
// 1. la scène, sans les sprites, en HDR linéaire (demi-flottants, MSAA ×4) avec
//    sa profondeur en texture flottante ;
// 2. préfiltre en demi-résolution (bornée à 540 pixels de haut) : couleur et
//    distance à la caméra ;
// 3. flou de profondeur, toujours en demi-résolution ;
// 4. bloom : seuil, quatre descentes, quatre remontées (cinq mips) ;
// 5. composition vers l'écran, étalonnage et passage en sRGB ;
// 6. les sprites, dessinés par-dessus : jamais flous, toujours nets. Ils
//    testent eux-mêmes la profondeur de la scène et s'étalonnent pareil.
//
// ?nofx court-circuite tout : rendu direct, la version de référence.
// ?view=raw | coc | bloom montre une étape à la fois.

import * as THREE from 'three';
import { createFullscreenTriangle } from './screen-triangle.js';
import { BAND_HALF_WIDTH, createDofGatherMaterial, createDofPrefilterMaterial, MAX_BLUR } from './dof.js';
import { createBloomMaterials } from './bloom.js';
import { createCompositeMaterial, GRADE_GLSL } from './composite.js';

export const SCENE_LAYER = 0;
export const SPRITE_LAYER = 1;

const HALF_MAX_HEIGHT = 540;
const BLOOM_MIPS = 5;
const BAND_LIMITS = [0.2, 0.8];
// Dans une pièce : la bande nette couvre presque tout l'écran et le flou qui
// reste (par la profondeur) est atténué. La maquette, c'est dehors.
const INTERIOR_BAND_HALF_WIDTH = 0.45;
const INTERIOR_BLUR_SCALE = 0.6;

function createTarget(options = {}) {
  return new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    ...options,
  });
}

// options : { enabled, view, narrowScreen }.
export function createPipeline(renderer, { enabled = true, view = 'final', narrowScreen = false } = {}) {
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  renderer.shadowMap.autoUpdate = false;

  const time = { value: 0 };
  const invResolution = { value: new THREE.Vector2(1, 1) };

  if (!enabled) {
    return {
      enabled,
      spriteHooks: null,
      setSize() {},
      setInterior() {},
      render(scene, camera) {
        renderer.info.reset();
        renderer.shadowMap.needsUpdate = true;
        camera.layers.enableAll();
        renderer.setRenderTarget(null);
        renderer.clear();
        renderer.render(scene, camera);
      },
    };
  }

  const depthTexture = new THREE.DepthTexture(1, 1, THREE.FloatType);
  const sceneTarget = createTarget({ samples: 4, depthBuffer: true, depthTexture });
  const halfTarget = createTarget();
  const dofTarget = createTarget();
  const bloomTargets = Array.from({ length: BLOOM_MIPS }, () => createTarget());

  // Uniformes partagés : un seul objet par valeur, lu par toutes les passes.
  const shared = {
    uFocusDistance: { value: 10 },
    uBandCenter: { value: 0.5 },
    uBandHalfWidth: { value: BAND_HALF_WIDTH },
    uNear: { value: 1 },
    uFar: { value: 100 },
    uTime: time,
    uInterior: { value: 0 }, // 1 dans une pièce : l'étalonnage change (composite.js)
  };
  let blurScale = 1;
  const prefilter = createDofPrefilterMaterial(shared);
  const gather = createDofGatherMaterial(shared, narrowScreen ? 16 : 24);
  const bloom = createBloomMaterials();
  const composite = createCompositeMaterial(shared, view);

  const triangle = createFullscreenTriangle();
  const postScene = new THREE.Scene();
  postScene.add(triangle);
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function draw(material, target) {
    triangle.material = material;
    renderer.setRenderTarget(target);
    renderer.render(postScene, postCamera);
  }

  const focus = new THREE.Vector3();
  let fullHeight = 1;
  let halfHeight = 1;

  return {
    enabled,
    // Ce dont les sprites ont besoin pour se dessiner après la composition.
    spriteHooks: {
      uniforms: {
        uSceneDepth: { value: depthTexture }, uInvResolution: invResolution, uTime: time, uNear: shared.uNear, uFar: shared.uFar,
        uInterior: shared.uInterior,
      },
      grading: GRADE_GLSL,
    },
    // Dedans ou dehors : règle la bande nette, la force du flou et l'étalonnage.
    setInterior(on) {
      shared.uBandHalfWidth.value = on ? INTERIOR_BAND_HALF_WIDTH : BAND_HALF_WIDTH;
      blurScale = on ? INTERIOR_BLUR_SCALE : 1;
      shared.uInterior.value = on ? 1 : 0;
    },
    // width, height : taille réelle du tampon de dessin, en pixels.
    setSize(width, height) {
      fullHeight = height;
      sceneTarget.setSize(width, height);
      depthTexture.image.width = width;
      depthTexture.image.height = height;
      invResolution.value.set(1 / width, 1 / height);
      halfHeight = Math.min(Math.round(height / 2), HALF_MAX_HEIGHT);
      const halfWidth = Math.max(1, Math.round((halfHeight * width) / height));
      halfTarget.setSize(halfWidth, halfHeight);
      dofTarget.setSize(halfWidth, halfHeight);
      bloomTargets.forEach((target, i) => target.setSize(Math.max(1, halfWidth >> i), Math.max(1, halfHeight >> i)));
    },
    // focusPoint : point du monde à garder net (le buste du héros).
    render(scene, camera, focusPoint, seconds) {
      renderer.info.reset();
      time.value = seconds;

      // 1. Scène sans sprites, en HDR. Les ombres se calculent ici, une fois.
      renderer.shadowMap.needsUpdate = true;
      camera.layers.set(SCENE_LAYER);
      renderer.setRenderTarget(sceneTarget);
      renderer.clear();
      renderer.render(scene, camera);

      // Point net : distance du héros, et sa hauteur à l'écran pour la bande.
      camera.updateMatrixWorld();
      focus.copy(focusPoint).applyMatrix4(camera.matrixWorldInverse);
      shared.uFocusDistance.value = -focus.z;
      focus.copy(focusPoint).project(camera);
      shared.uBandCenter.value = THREE.MathUtils.clamp(focus.y * 0.5 + 0.5, ...BAND_LIMITS);
      shared.uNear.value = camera.near;
      shared.uFar.value = camera.far;

      // 2 et 3. Flou de profondeur en demi-résolution.
      prefilter.uniforms.uScene.value = sceneTarget.texture;
      prefilter.uniforms.uDepth.value = depthTexture;
      prefilter.uniforms.uSceneTexel.value.set(1 / sceneTarget.width, 1 / sceneTarget.height);
      draw(prefilter, halfTarget);
      gather.uniforms.uHalf.value = halfTarget.texture;
      gather.uniforms.uHalfTexel.value.set(1 / halfTarget.width, 1 / halfTarget.height);
      gather.uniforms.uMaxBlurPixels.value = MAX_BLUR * halfHeight * blurScale;
      draw(gather, dofTarget);

      // 4. Bloom.
      bloom.threshold.uniforms.uSource.value = halfTarget.texture;
      draw(bloom.threshold, bloomTargets[0]);
      for (let i = 1; i < BLOOM_MIPS; i += 1) {
        const source = bloomTargets[i - 1];
        bloom.down.uniforms.uSource.value = source.texture;
        bloom.down.uniforms.uTexel.value.set(1 / source.width, 1 / source.height);
        draw(bloom.down, bloomTargets[i]);
      }
      for (let i = BLOOM_MIPS - 1; i > 0; i -= 1) {
        const source = bloomTargets[i];
        bloom.up.uniforms.uSource.value = source.texture;
        bloom.up.uniforms.uTexel.value.set(1 / source.width, 1 / source.height);
        draw(bloom.up, bloomTargets[i - 1]);
      }

      // 5. Composition vers l'écran.
      composite.uniforms.uScene.value = sceneTarget.texture;
      composite.uniforms.uDepth.value = depthTexture;
      composite.uniforms.uDof.value = dofTarget.texture;
      composite.uniforms.uBloom.value = bloomTargets[0].texture;
      composite.uniforms.uMaxBlurPixels.value = MAX_BLUR * fullHeight * blurScale;
      draw(composite, null);

      // 6. Sprites par-dessus, nets. Pas dans les vues de débogage du flou
      // et du bloom.
      if (view === 'coc' || view === 'bloom') return;
      camera.layers.set(SPRITE_LAYER);
      renderer.clearDepth();
      // Un fond uni (celui des intérieurs) forcerait three.js à effacer l'écran
      // avant les sprites, image composée comprise : on le retire le temps de
      // cette passe.
      const background = scene.background;
      scene.background = null;
      renderer.render(scene, camera);
      scene.background = background;
    },
  };
}
