// L'état de la partie : ce que les dialogues lisent pour choisir leurs variantes,
// et ce qui survit à un rechargement de la page. Depuis la version 2.10, ce
// module répond aussi aux questions de progression (tous les parchemins
// réunis ? cet habitant a-t-il encore une quête ?) et note les découvertes :
// la forme des champs n'est écrite qu'ici, dans FIELDS.
//
// Forme (gelée, c'est celle que reçoivent les fonctions de data/dialogues.js) :
//   { prenom, parchemins: Set, visites: Map, choix: Map, erreurs: Map }
//   - prenom      : chaîne vide tant que le joueur n'a pas donné le sien
//   - parchemins  : identifiants des parchemins obtenus
//   - visites     : identifiant d'habitant -> nombre de conversations
//   - choix       : identifiant d'habitant -> indice du choix retenu à sa question
//   - erreurs     : identifiant d'habitant -> mauvaises réponses données avant
//                   la bonne (ajouté à l'étape 3b pour la mention du diplôme ;
//                   absent des sauvegardes plus anciennes, il vaut alors zéro)
// Ajoutés à l'étape 3c, pour les Tokens (data/tokens.js) :
//   - tokens      : la bourse du héros
//   - tenues      : identifiants des tenues achetées (la première est offerte)
//   - tenue       : celle que le héros porte
//   - decouvertes : lieux déjà découverts (clés de world/places.js), payés une fois
//   - coffres     : coffres déjà ouverts
// Ajouté en version 2.0 (le combat, data/enemies.js) :
//   - epee        : niveau de l'épée forgée chez Ferrand (0 : aucune, 1 bois, 2 fer, 3 acier)
// Ajoutés en version 2.3 (game/spots.js, game/exploits.js) :
//   - voeux       : Tokens jetés dans le puits
//   - fouilles    : cachettes déjà fouillées (tonneaux, caisses, meules)
//   - etincelles  : étincelles cachées déjà ramassées
//   - fioles      : fioles de clarté en réserve (0 à 3), bues d'elles-mêmes
//   - pomme       : la pomme du verger est cueillie (elle repousse après la lande)
//   - dissipees   : Hallucinations dissipées, en tout
//   - defiRecord  : meilleur nombre de coups au défi du mannequin, defiPrime : la prime touchée
//   - exploits    : titres déjà décrochés
//
// Règle : qui change l'état sauvegarde aussitôt (saveGameState). Sauvegarde
// dans localStorage, entourée de try/catch : en navigation privée ou avec les
// données de site bloquées, il peut être absent ou lancer. Le jeu marche alors
// sans sauvegarde, rien de plus.

// Nouvelle clé avec « The Legend of Elelhem » (étape 3c) : Lia n'y est plus
// un personnage, une partie de l'ancien village ne se reprend pas.
const STORAGE_KEY = 'elelhem-v1';
const FIRST_OUTFIT = 'voyage';

// Les champs, dans l'ordre de la sauvegarde. kind : text (chaîne, coupée à
// max), set (identifiants), map (identifiant -> entier), count (entier
// positif, plafonné à max), flag (booléen). always : entrées toujours
// présentes dans un set ; accept(valeur, état) : condition de plus à la
// relecture (la tenue portée doit être possédée).
const FIELDS = [
  { name: 'prenom', kind: 'text', max: 24 },
  { name: 'parchemins', kind: 'set' },
  { name: 'visites', kind: 'map' },
  { name: 'choix', kind: 'map' },
  { name: 'erreurs', kind: 'map' },
  { name: 'tokens', kind: 'count' },
  { name: 'tenues', kind: 'set', always: [FIRST_OUTFIT] },
  { name: 'tenue', kind: 'text', initial: FIRST_OUTFIT, accept: (value, state) => state.tenues.has(value) },
  { name: 'decouvertes', kind: 'set' },
  { name: 'coffres', kind: 'set' },
  { name: 'epee', kind: 'count', max: 3 },
  { name: 'voeux', kind: 'count' },
  { name: 'fouilles', kind: 'set' },
  { name: 'etincelles', kind: 'set' },
  { name: 'fioles', kind: 'count', max: 3 },
  { name: 'pomme', kind: 'flag' },
  { name: 'dissipees', kind: 'count' },
  { name: 'defiRecord', kind: 'count' },
  { name: 'defiPrime', kind: 'flag' },
  { name: 'exploits', kind: 'set' },
];

const INITIAL = {
  text: (field) => field.initial ?? '',
  set: (field) => new Set(field.always ?? []),
  map: () => new Map(),
  count: () => 0,
  flag: () => false,
};

function emptyState() {
  const state = {};
  for (const field of FIELDS) state[field.name] = INITIAL[field.kind](field);
  return state;
}

const isPair = (entry) => Array.isArray(entry) && typeof entry[0] === 'string' && Number.isInteger(entry[1]);
const strings = (list) => list.filter((id) => typeof id === 'string');

// Relit un champ sauvegardé, ou garde la valeur de départ si la sauvegarde
// est abîmée : une sauvegarde cassée ne doit jamais empêcher de jouer.
function restoreField(state, field, value) {
  switch (field.kind) {
    case 'text':
      if (typeof value === 'string' && (!field.accept || field.accept(value, state))) state[field.name] = value.slice(0, field.max ?? Infinity);
      break;
    case 'set':
      if (Array.isArray(value)) state[field.name] = new Set([...(field.always ?? []), ...strings(value)]);
      break;
    case 'map':
      if (Array.isArray(value)) state[field.name] = new Map(value.filter(isPair));
      break;
    case 'count':
      if (Number.isInteger(value) && value >= 0) state[field.name] = Math.min(value, field.max ?? Infinity);
      break;
    case 'flag':
      state[field.name] = value === true;
      break;
    default:
      break;
  }
}

// Le champ tel qu'il s'écrit (JSON) : les ensembles et les tables en listes.
const plain = (value) => (value instanceof Set || value instanceof Map ? [...value] : value);

function read() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(state) {
  try {
    const payload = {};
    for (const field of FIELDS) payload[field.name] = plain(state[field.name]);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Pas de sauvegarde possible : on joue quand même.
  }
}

// restore : charger la sauvegarde existante (faux avec ?reset, qui repart de zéro).
export function createGameState({ restore = true } = {}) {
  const state = emptyState();
  const saved = restore ? read() : null;
  if (saved && typeof saved === 'object') {
    for (const field of FIELDS) {
      if (field.name in saved) restoreField(state, field, saved[field.name]);
    }
  }
  if (!restore) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // rien à effacer
    }
  }
  return state;
}

export function saveGameState(state) {
  write(state);
}

// Nouvelle partie : tout est vidé, la sauvegarde aussi.
export function resetGameState(state) {
  Object.assign(state, emptyState());
  write(state);
}

// Note une mauvaise réponse à la question d'un habitant et sauvegarde aussitôt.
export function recordMistake(state, id) {
  state.erreurs.set(id, (state.erreurs.get(id) ?? 0) + 1);
  write(state);
}

// Note une conversation avec un habitant et sauvegarde aussitôt.
export function recordVisit(state, id) {
  state.visites.set(id, (state.visites.get(id) ?? 0) + 1);
  write(state);
}

// Note un lieu découvert (clé de world/places.js) et sauvegarde ; vrai la
// première fois seulement, pour le payer une fois.
export function discover(state, key) {
  if (!key || state.decouvertes.has(key)) return false;
  state.decouvertes.add(key);
  write(state);
  return true;
}

// Tous les parchemins de la liste sont-ils gagnés ?
export function hasAllScrolls(state, scrollIds) {
  return scrollIds.every((id) => state.parchemins.has(id));
}

// Où en est la quête d'un habitant, d'après son entrée de data/dialogues.js :
// 'guide' (il n'enseigne rien), 'quete' (sa leçon reste à prendre ; pour
// l'habitant du diplôme, dès que tous les parchemins sont réunis et tant que
// sa question n'a pas sa réponse), 'fait', ou null sans entrée.
export function questStatus(state, key, entry, scrollIds) {
  if (!entry) return null;
  if (entry.guide) return 'guide';
  if (entry.diplome) return !state.choix.has(key) && hasAllScrolls(state, scrollIds) ? 'quete' : 'fait';
  return state.parchemins.has(key) ? 'fait' : 'quete';
}

// Une copie lisible de l'état, tous champs compris, pour les tests
// (window.__lia.gameState) : les ensembles en listes, les tables en objets.
export function snapshot(state) {
  const copy = {};
  for (const field of FIELDS) {
    const value = state[field.name];
    copy[field.name] = value instanceof Map ? Object.fromEntries(value) : value instanceof Set ? [...value] : value;
  }
  return copy;
}
