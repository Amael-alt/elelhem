// L'état de la partie : ce que les dialogues lisent pour choisir leurs variantes,
// et ce qui survit à un rechargement de la page.
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
//   - decouvertes : lieux déjà découverts (quartiers et pièces), payés une fois
//   - coffres     : coffres déjà ouverts
//
// Sauvegarde dans localStorage, entourée de try/catch : en navigation privée
// ou avec les données de site bloquées, il peut être absent ou lancer. Le jeu
// marche alors sans sauvegarde, rien de plus.

// Nouvelle clé avec « The Legend of Elelhem » (étape 3c) : Lia n'y est plus
// un personnage, une partie de l'ancien village ne se reprend pas.
const STORAGE_KEY = 'elelhem-v1';
const FIRST_OUTFIT = 'voyage';

function emptyState() {
  return {
    prenom: '',
    parchemins: new Set(),
    visites: new Map(),
    choix: new Map(),
    erreurs: new Map(),
    tokens: 0,
    tenues: new Set([FIRST_OUTFIT]),
    tenue: FIRST_OUTFIT,
    decouvertes: new Set(),
    coffres: new Set(),
  };
}

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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      prenom: state.prenom,
      parchemins: [...state.parchemins],
      visites: [...state.visites],
      choix: [...state.choix],
      erreurs: [...state.erreurs],
      tokens: state.tokens,
      tenues: [...state.tenues],
      tenue: state.tenue,
      decouvertes: [...state.decouvertes],
      coffres: [...state.coffres],
    }));
  } catch {
    // Pas de sauvegarde possible : on joue quand même.
  }
}

const isPair = (entry) => Array.isArray(entry) && typeof entry[0] === 'string' && Number.isInteger(entry[1]);
const strings = (list) => list.filter((id) => typeof id === 'string');

// restore : charger la sauvegarde existante (faux avec ?reset, qui repart de zéro).
export function createGameState({ restore = true } = {}) {
  const state = emptyState();
  const saved = restore ? read() : null;
  if (saved && typeof saved === 'object') {
    // Une sauvegarde abîmée ne doit jamais empêcher de jouer : champ par champ.
    if (typeof saved.prenom === 'string') state.prenom = saved.prenom.slice(0, 24);
    if (Array.isArray(saved.parchemins)) state.parchemins = new Set(strings(saved.parchemins));
    if (Array.isArray(saved.visites)) state.visites = new Map(saved.visites.filter(isPair));
    if (Array.isArray(saved.choix)) state.choix = new Map(saved.choix.filter(isPair));
    if (Array.isArray(saved.erreurs)) state.erreurs = new Map(saved.erreurs.filter(isPair));
    if (Number.isInteger(saved.tokens) && saved.tokens >= 0) state.tokens = saved.tokens;
    if (Array.isArray(saved.tenues)) state.tenues = new Set([FIRST_OUTFIT, ...strings(saved.tenues)]);
    if (typeof saved.tenue === 'string' && state.tenues.has(saved.tenue)) state.tenue = saved.tenue;
    if (Array.isArray(saved.decouvertes)) state.decouvertes = new Set(strings(saved.decouvertes));
    if (Array.isArray(saved.coffres)) state.coffres = new Set(strings(saved.coffres));
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
