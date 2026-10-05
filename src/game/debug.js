// Panneau de mesure, affiché seulement avec ?debug dans l'adresse.
// Images par seconde, coût d'une image, appels de dessin, triangles et
// définition réelle du canvas : les chiffres qui décident sur un téléphone.

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
