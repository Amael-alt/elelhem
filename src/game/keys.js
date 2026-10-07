// La légende des touches, en bas à gauche sur ordinateur : chaque ligne, une
// touche dessinée et ce qu'elle fait. Elle ne s'affiche que là où il y a un
// clavier (styles.css : hover et pointeur fin), s'efface pendant une
// conversation, et la ligne « Frapper » n'apparaît que sur la lande, l'épée
// à la main. Les lettres des touches de déplacement sont lues sur le clavier
// réel quand le navigateur le permet (ZQSD sur un AZERTY, WASD ailleurs).
//
// La touche T la replie sur son seul titre (elle prenait un coin d'écran) et
// la déplie ; le choix est gardé avec les réglages de l'appareil
// (game/settings.js). Aucune phrase ici : les textes viennent de
// data/dialogues.js (textesInterface.touches).

// Les lignes, dans l'ordre : codes physiques des touches, puis le libellé.
// « move » est remplacé par les quatre lettres du clavier réel.
const ROWS = [
  { keys: ['move'], label: 'deplacer' },
  { keys: ['ShiftLeft'], label: 'courir' },
  { keys: ['KeyE'], label: 'parler' },
  { keys: ['KeyJ'], label: 'frapper', fight: true },
  { keys: ['KeyF'], label: 'fiche' },
  { keys: ['KeyG'], label: 'grimoire' },
  { keys: ['KeyC'], label: 'carte' },
  { keys: ['KeyM'], label: 'son' },
  { keys: ['Escape'], label: 'fermer' },
  { keys: ['KeyT'], label: 'replier' },
];
export const TOGGLE_KEY = 'KeyT';
const MOVE_CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];

// root : #touches ; texts : textesInterface.touches ; collapsed : repliée au
// départ ; onCollapse(on) : appelé quand le joueur la replie ou la déplie.
export function createKeyGuide(root, { texts, collapsed = false, onCollapse = () => {} }) {
  const title = root.querySelector('.touches-titre');
  let folded = Boolean(collapsed);
  const renderTitle = () => {
    // Repliée, le titre dit comment la rouvrir : « Commandes (T) ».
    title.textContent = folded ? texts.titreReplie : texts.titre;
    root.dataset.replie = folded ? 'oui' : 'non';
  };
  renderTitle();
  const list = root.querySelector('.touches-liste');
  const fightRows = [];

  // Le nom affiché d'une touche : la lettre de la touche réelle, ou un mot.
  const special = { ShiftLeft: texts.maj, Escape: texts.echap, Enter: texts.entree };
  const labelOf = (code, layout) => {
    if (special[code]) return special[code];
    const real = layout?.get(code);
    if (real) return real.toUpperCase();
    return code.replace('Key', '');
  };

  function render(layout) {
    list.replaceChildren();
    fightRows.length = 0;
    for (const row of ROWS) {
      const item = document.createElement('li');
      const caps = document.createElement('span');
      caps.className = 'touches-touches';
      const codes = row.keys[0] === 'move' ? MOVE_CODES : row.keys;
      // Sans carte du clavier, les lettres ZQSD ou WASD seraient fausses pour
      // la moitié des joueurs : on montre les flèches.
      if (row.keys[0] === 'move' && !layout) {
        const cap = document.createElement('kbd');
        cap.textContent = texts.fleches;
        caps.append(cap);
      } else {
        for (const code of codes) {
          const cap = document.createElement('kbd');
          cap.textContent = labelOf(code, layout);
          caps.append(cap);
        }
      }
      const label = document.createElement('span');
      label.className = 'touches-action';
      label.textContent = texts[row.label];
      item.append(caps, label);
      if (row.fight) {
        item.hidden = true;
        fightRows.push(item);
      }
      list.append(item);
    }
  }

  render(null);
  // La carte du clavier réel (Chromium seulement) : les lettres justes.
  navigator.keyboard?.getLayoutMap?.().then((layout) => render(layout)).catch(() => {});

  let shown = false;
  let fighting = false;
  return {
    show() {
      if (shown) return;
      shown = true;
      root.hidden = false;
    },
    hide() {
      if (!shown) return;
      shown = false;
      root.hidden = true;
    },
    // Sur la lande avec une épée : la ligne « Frapper » apparaît.
    setFighting(on) {
      if (fighting === Boolean(on)) return;
      fighting = Boolean(on);
      for (const row of fightRows) row.hidden = !fighting;
    },
    // Pendant une conversation ou un panneau, la légende s'efface (CSS lit data-efface).
    setFaded(on) {
      root.dataset.efface = on ? 'oui' : 'non';
    },
    // La touche T : repliée sur son titre, ou dépliée.
    toggle() {
      folded = !folded;
      renderTitle();
      onCollapse(folded);
    },
    get isCollapsed() {
      return folded;
    },
  };
}
