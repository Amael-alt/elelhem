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
//
// Sauvegarde dans localStorage, entourée de try/catch : en navigation privée
// ou avec les données de site bloquées, il peut être absent ou lancer. Le jeu
// marche alors sans sauvegarde, rien de plus.

// Nouvelle clé avec « The Legend of Elelhem » (étape 3c) : Lia n'y est plus
// un personnage, une partie de l'ancien village ne se reprend pas.
const STORAGE_KEY = 'elelhem-v1';

function emptyState() {
  return { prenom: '', parchemins: new Set(), visites: new Map(), choix: new Map(), erreurs: new Map() };
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
    }));
  } catch {
    // Pas de sauvegarde possible : on joue quand même.
  }
}

// restore : charger la sauvegarde existante (faux avec ?reset, qui repart de zéro).
export function createGameState({ restore = true } = {}) {
  const state = emptyState();
  const saved = restore ? read() : null;
  if (saved && typeof saved === 'object') {
    // Une sauvegarde abîmée ne doit jamais empêcher de jouer : champ par champ.
    if (typeof saved.prenom === 'string') state.prenom = saved.prenom.slice(0, 24);
    if (Array.isArray(saved.parchemins)) state.parchemins = new Set(saved.parchemins.filter((id) => typeof id === 'string'));
    if (Array.isArray(saved.visites)) state.visites = new Map(saved.visites.filter(([id, n]) => typeof id === 'string' && Number.isInteger(n)));
    if (Array.isArray(saved.choix)) state.choix = new Map(saved.choix.filter(([id, n]) => typeof id === 'string' && Number.isInteger(n)));
    if (Array.isArray(saved.erreurs)) state.erreurs = new Map(saved.erreurs.filter(([id, n]) => typeof id === 'string' && Number.isInteger(n)));
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
  state.prenom = '';
  state.parchemins.clear();
  state.visites.clear();
  state.choix.clear();
  state.erreurs.clear();
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
