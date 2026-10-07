// L'hôte des panneaux (version 2.10) : le grimoire, la carte, la fiche, la
// boutique, la forge, le diplôme et le générique se posent par-dessus le jeu
// et le suspendent. Ce qu'ils avaient tous recopié vit ici, une fois : la
// touche Échap referme le dernier ouvert, un clic sur le fond referme, et
// « le jeu est-il occupé » se demande à un seul endroit. Chaque panneau ne
// garde que son contenu : isOpen, open(), close().

export function createOverlayHost() {
  const panels = [];

  // Ferme le panneau ouvert le plus récemment attaché ; vrai si l'un l'était.
  function closeTop() {
    const top = [...panels].reverse().find((panel) => panel.isOpen);
    if (!top) return false;
    top.close();
    return true;
  }

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape' || !closeTop()) return;
    event.preventDefault();
  });

  return {
    // panel : { isOpen, close() } ; root : l'élément plein écran du panneau,
    // dont le fond (hors du cadre) referme ; null pour un panneau qui gère
    // lui-même ses touchers (le générique). Renvoie le panneau, pour chaîner.
    attach(panel, root = null) {
      panels.push(panel);
      if (root) {
        root.addEventListener('click', (event) => {
          if (event.target === root) panel.close();
        });
      }
      return panel;
    },
    get isBusy() {
      return panels.some((panel) => panel.isOpen);
    },
    closeTop,
  };
}
