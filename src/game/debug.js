// Outils de mesure et de test.
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

  window.__lia = {
    info,
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
