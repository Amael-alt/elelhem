// Réglages de l'appareil, gardés à part de la partie : une nouvelle partie ne
// les efface pas. Le joystick à droite et le bouton d'action à gauche, pour
// jouer de la main gauche (choisi sur l'écran titre), et depuis la version 2.3
// la légende des touches repliée (touche T).
// localStorage dans un try/catch, comme la sauvegarde (game/state.js).

const STORAGE_KEY = 'elelhem-reglages-v1';

export function loadSettings() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    return { mainGauche: saved?.mainGauche === true, touchesRepliees: saved?.touchesRepliees === true };
  } catch {
    return { mainGauche: false, touchesRepliees: false };
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mainGauche: settings.mainGauche, touchesRepliees: settings.touchesRepliees }));
  } catch {
    // Navigation privée ou stockage bloqué : le réglage vaut pour cette visite.
  }
}
