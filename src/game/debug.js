// Outils de mesure et de test.

import * as THREE from 'three';
// - Le panneau ?debug : images par seconde, coût d'une image, appels de
//   dessin, triangles et définition réelle du canvas.
// - window.__lia : commandes pour des captures reproductibles et des tests
//   scriptés (téléporter, figer le temps, avancer image par image, mesurer).

const REFRESH_SECONDS = 0.5;

export function isDebugEnabled() {
  return new URLSearchParams(window.location.search).has('debug');
}

export function createDebugPanel(renderer) {
  const panel = document.getElementById('debug');
  panel.hidden = false;

  let frames = 0;
  let elapsed = 0;

  return {
    // À appeler juste après renderer.render(), tant que renderer.info
    // contient encore les chiffres de l'image qui vient d'être dessinée.
    update(dt) {
      frames += 1;
      elapsed += dt;
      if (elapsed < REFRESH_SECONDS) return;

      const fps = frames / elapsed;
      const { calls, triangles } = renderer.info.render;
      const canvas = renderer.domElement;
      panel.textContent = [
        `images/s  ${fps.toFixed(0)}  (${(1000 / fps).toFixed(1)} ms)`,
        `appels    ${calls}`,
        `triangles ${triangles}`,
        `ratio px  ${renderer.getPixelRatio().toFixed(2)}`,
        `canvas    ${canvas.width}×${canvas.height}`,
      ].join('\n');

      frames = 0;
      elapsed = 0;
    },
  };
}

// Planche de sprites agrandie dans un coin de l'écran, pour juger le dessin
// pixel par pixel. Dessinée depuis le tampon généré : aucune image chargée.
function createSheetViewer(buffer, scale = 4) {
  const canvas = document.createElement('canvas');
  canvas.width = buffer.width * scale;
  canvas.height = buffer.height * scale;
  canvas.style.cssText = 'position:fixed;right:8px;top:8px;z-index:30;image-rendering:pixelated;'
    + 'background:#8f8a9e;border:1px solid #1b1a2e;max-width:calc(100% - 16px);pointer-events:none';
  const source = document.createElement('canvas');
  source.width = buffer.width;
  source.height = buffer.height;
  source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height), 0, 0);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// game : { renderer, player, follow, tick, state, sheet }.
export function installDebugApi(game) {
  const { renderer, player, follow, tick, state, sheet } = game;
  let viewer = null;

  const info = () => ({
    x: Number(player.position.x.toFixed(3)),
    z: Number(player.position.z.toFixed(3)),
    facing: player.facing,
    moving: player.moving,
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    programs: renderer.info.programs?.length ?? 0,
  });

  // Dessine une image et la relit aussitôt, avant que le navigateur ne
  // l'efface : base des mesures sur les pixels.
  function readFrame() {
    tick(0, true);
    const gl = renderer.getContext();
    const { width, height } = renderer.domElement;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return { width, height, pixels };
  }

  window.__lia = {
    info,
    // Couleur moyenne d'un carré de pixels autour d'un point de l'écran, en
    // pixels CSS depuis le coin haut gauche.
    pixel(x, y, radius = 2) {
      const { width, height, pixels } = readFrame();
      const ratio = renderer.getPixelRatio();
      const cx = Math.round(x * ratio);
      const cy = height - 1 - Math.round(y * ratio);
      const sum = [0, 0, 0];
      let count = 0;
      for (let py = cy - radius; py <= cy + radius; py += 1) {
        for (let px = cx - radius; px <= cx + radius; px += 1) {
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const i = (py * width + px) * 4;
          sum[0] += pixels[i];
          sum[1] += pixels[i + 1];
          sum[2] += pixels[i + 2];
          count += 1;
        }
      }
      return sum.map((v) => Math.round(v / count));
    },
    // Couleur d'un point du monde, vu par la caméra (il doit être visible).
    probe(x, y, z, radius = 1) {
      const point = new THREE.Vector3(x, y, z).project(follow.camera);
      const canvas = renderer.domElement;
      return this.pixel((point.x * 0.5 + 0.5) * canvas.clientWidth, (0.5 - point.y * 0.5) * canvas.clientHeight, radius);
    },
    // Part des pixels saturés (une composante à 250 ou plus) et blanchis
    // (les trois composantes à 250 ou plus) dans l'image.
    stats() {
      const { pixels } = readFrame();
      let saturated = 0;
      let whitened = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const high = (pixels[i] >= 250) + (pixels[i + 1] >= 250) + (pixels[i + 2] >= 250);
        if (high > 0) saturated += 1;
        if (high === 3) whitened += 1;
      }
      const percent = (count) => Number(((count / (pixels.length / 4)) * 100).toFixed(2));
      return { saturatedPercent: percent(saturated), whitenedPercent: percent(whitened), ...info() };
    },
    teleport(x, z) {
      player.teleport(x, z);
      follow.snap(player.worldPosition(game.focusTarget));
      tick(0);
      return info();
    },
    freeze(on = true) {
      state.frozen = on;
      return state.frozen;
    },
    // Avance le jeu image par image, même quand la page ne s'anime pas
    // (onglet masqué) : base des tests scriptés.
    step(frames = 1, dt = 1 / 60) {
      for (let i = 0; i < frames; i += 1) tick(dt, true);
      return info();
    },
    // Coût moyen d'une image, GPU compris : on attend la fin du dessin en
    // relisant un pixel. Utile quand la page ne s'anime pas.
    bench(frames = 60) {
      const gl = renderer.getContext();
      const pixel = new Uint8Array(4);
      tick(0, true);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      const start = performance.now();
      for (let i = 0; i < frames; i += 1) tick(0, true);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      const ms = (performance.now() - start) / frames;
      return { msPerFrame: Number(ms.toFixed(2)), fpsCeiling: Math.round(1000 / ms), ...info() };
    },
    showSheet(on = true) {
      if (on && !viewer) {
        viewer = createSheetViewer(sheet.buffer);
        document.body.append(viewer);
      } else if (!on && viewer) {
        viewer.remove();
        viewer = null;
      }
      return Boolean(viewer);
    },
  };
}
