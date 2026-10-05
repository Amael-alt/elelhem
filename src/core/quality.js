// Échelle de rendu automatique. Si l'image moyenne sur WINDOW_SECONDS passe
// sous MIN_FPS, on dessine à une définition plus basse (0,75 puis 0,6 du ratio
// de pixels). On ne remonte jamais : mieux vaut un village un peu plus doux
// qu'un va-et-vient de définition. Le plafond du ratio de pixels (1,5) est
// dans renderer.js.

const SCALES = [1, 0.75, 0.6];
const MIN_FPS = 40;
const WINDOW_SECONDS = 3;
const SETTLE_SECONDS = 1; // après un changement, on laisse les shaders se compiler
const SPIKE_SECONDS = 0.25; // une image plus longue (onglet en veille) ne compte pas

// onChange(scale) est appelé à chaque changement ; fixed : échelle imposée
// (?scale=0.75), sans automatisme.
export function createQualityGovernor({ onChange, fixed = null }) {
  let level = 0;
  let frames = 0;
  let elapsed = 0;
  let settle = SETTLE_SECONDS;

  if (fixed !== null) onChange(fixed);

  return {
    get scale() {
      return fixed ?? SCALES[level];
    },
    // dt : durée réelle de l'image écoulée, en secondes.
    update(dt) {
      if (fixed !== null || level === SCALES.length - 1 || dt > SPIKE_SECONDS) return;
      if (settle > 0) {
        settle -= dt;
        return;
      }
      frames += 1;
      elapsed += dt;
      if (elapsed < WINDOW_SECONDS) return;
      if (frames / elapsed < MIN_FPS) {
        level += 1;
        onChange(SCALES[level]);
        settle = SETTLE_SECONDS;
      }
      frames = 0;
      elapsed = 0;
    },
  };
}
