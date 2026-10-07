// Outils communs aux particules (lucioles, poussière, fumée). Toutes sont des
// Points animés par le GPU : leur position est une fonction du temps et d'une
// graine tirée au chargement, aucun calcul par image côté JavaScript. Leur
// taille à l'écran est arrondie au pixel entier, et les disques sont tracés
// en gros pixels : des particules de pixel art, pas des taches floues.

import * as THREE from 'three';

export const ART_PIXELS_PER_UNIT = 32; // version 2.7 : des particules deux fois plus fines

// Uniformes partagés par tous les effets, mis à jour une fois par image.
export function createFxUniforms() {
  return {
    uTime: { value: 0 },
    uPointScale: { value: 1 }, // hauteur du tampon / (2 tan(champ / 2)) : pixels par unité à distance 1
    uFocus: { value: new THREE.Vector3() },
    uHero: { value: new THREE.Vector3() }, // la position du héros : l'herbe et les buissons se couchent sur son passage (version 2.8)
  };
}

export const POINT_SIZE_GLSL = /* glsl */`
uniform float uPointScale;

// Taille à l'écran, en pixels entiers, d'un objet de worldSize unités.
float pixelPointSize( float worldSize, vec4 mvPosition ) {
  return max( 1.0, floor( worldSize * uPointScale / - mvPosition.z + 0.5 ) );
}
`;

export const PIXEL_DISC_GLSL = /* glsl */`
// Vrai hors d'un disque dessiné sur une grille de artPixels gros pixels.
bool outsidePixelDisc( float artPixels ) {
  vec2 q = ( floor( gl_PointCoord * artPixels ) + 0.5 ) / artPixels;
  return length( q - 0.5 ) > 0.5;
}
`;

// Fin commune des fragment shaders d'effets : rien en HDR (post-traitement),
// ACES et sRGB en rendu direct (?nofx).
export const FX_OUTPUT_GLSL = /* glsl */`
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;
