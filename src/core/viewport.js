// Hauteur de page réelle sur téléphone. Sur mobile, la barre d'adresse qui se
// replie change la hauteur visible sans toujours changer celle de la page : on
// suit visualViewport et on la publie dans --hauteur, que styles.css utilise.

export function trackViewportHeight() {
  const root = document.documentElement;
  const apply = () => {
    const height = window.visualViewport?.height ?? window.innerHeight;
    root.style.setProperty('--hauteur', `${Math.round(height)}px`);
  };
  apply();
  window.visualViewport?.addEventListener('resize', apply);
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
}
