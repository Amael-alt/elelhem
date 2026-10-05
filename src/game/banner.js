// Bandeau de lieu : quand le héros entre dans un quartier, son nom apparaît
// en haut de l'écran entre deux filets dorés, puis s'efface. Les quartiers
// sont des rectangles de world/layout.js, leurs noms dans data/dialogues.js.

const SHOW_MS = 2600;

// element : #lieu ; regions : liste { id, rect: [x0, z0, x1, z1] } (la
// première qui contient le point l'emporte) ; names : id -> nom affiché.
export function createAreaBanner(element, regions, names) {
  const title = element.querySelector('.lieu-nom');
  let current = null;
  let timer = 0;

  function regionAt(x, z) {
    const found = regions.find(({ rect: [x0, z0, x1, z1] }) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
    return found ? found.id : null;
  }

  function show(id) {
    title.textContent = names[id] ?? '';
    element.hidden = false;
    element.classList.remove('lieu-sortie');
    clearTimeout(timer);
    timer = setTimeout(() => element.classList.add('lieu-sortie'), SHOW_MS);
  }

  return {
    // À chaque image : affiche le bandeau quand on change de quartier.
    update(position) {
      const id = regionAt(position.x, position.z);
      if (id === current) return;
      current = id;
      if (id) show(id);
      else element.classList.add('lieu-sortie'); // entre deux quartiers, le bandeau s'efface
    },
    get current() {
      return current;
    },
  };
}
