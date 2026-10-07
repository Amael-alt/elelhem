// Bandeau de lieu : quand le héros entre dans un quartier, son nom apparaît
// en haut de l'écran entre deux filets dorés, puis s'efface. Les quartiers
// viennent de world/places.js, leurs noms de data/dialogues.js.

import { regionAt, roomKey } from '../world/places.js';

const SHOW_MS = 2600;
const EXIT_MS = 900; // durée de la sortie (lieu-sort dans styles.css)

// element : #lieu ; names : id -> nom affiché ; place : #endroit (version 2.6),
// l'étiquette permanente sous la minimap : le monde où l'on est (setWorld) et,
// dessous, le quartier ou la pièce.
export function createAreaBanner(element, names, { place = null } = {}) {
  const title = element.querySelector('.lieu-nom');
  const placeWorld = place?.querySelector('.endroit-monde');
  const placeArea = place?.querySelector('.endroit-lieu');
  let current = null;
  let timer = 0;

  const setArea = (text) => {
    if (placeArea && placeArea.textContent !== text) placeArea.textContent = text;
  };

  // Le bandeau sort, puis se cache vraiment : sans animation (mouvement
  // réduit), la classe de sortie seule le laisserait affiché.
  function leave() {
    clearTimeout(timer);
    element.classList.add('lieu-sortie');
    timer = setTimeout(() => {
      element.hidden = true;
    }, EXIT_MS);
  }

  function show(id) {
    title.textContent = names[id] ?? '';
    element.hidden = false;
    element.classList.remove('lieu-sortie');
    clearTimeout(timer);
    timer = setTimeout(leave, SHOW_MS);
  }

  return {
    // À chaque image : affiche le bandeau quand on change de quartier.
    update(position) {
      const id = regionAt(position.x, position.z);
      if (id === current) return;
      current = id;
      if (id) show(id);
      else if (!element.hidden) leave(); // entre deux quartiers, le bandeau s'efface
      setArea(id ? names[id] ?? '' : '');
    },
    // L'étiquette permanente : le monde (le village, la lande), et le lieu
    // dedans s'il est fixe (une pièce) ; sinon update le suit.
    setWorld(world, area = null) {
      if (!place) return;
      place.hidden = !world;
      if (placeWorld.textContent !== world) placeWorld.textContent = world;
      if (area !== null) setArea(area); // sinon, le lieu déjà affiché (une pièce) reste
    },
    // En entrant dans une pièce (world/rooms.js) : son nom, une fois. En
    // ressortant, le prochain update retrouve le quartier et l'affiche.
    showRoom(id) {
      current = roomKey(id);
      show(id);
      setArea(names[id] ?? '');
    },
    get current() {
      return current;
    },
  };
}
