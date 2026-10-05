// Le son du jeu : la musique de fond et le bus des sons d'ambiance
// (core/ambience.js), réunis sous un même volume général.
//
// - Tout démarre au premier geste du joueur (les navigateurs interdisent le
//   son avant) : le contexte audio naît là, la musique monte en fondu.
// - La musique se fait plus discrète pendant les dialogues.
// - Onglet caché : tout le son se met en pause, il reprend au retour.
// - Le joueur peut couper le son (bouton en haut à droite, ou touche M) ; ce
//   choix est retenu dans le navigateur.
//
// Les volumes passent par Web Audio (des nœuds de gain) : sur iPhone, le
// volume d'un élément audio est ignoré, seul un gain le règle vraiment.

const MUSIC_VOLUME = 0.21; // assez bas pour rester une ambiance (0,26 avant, baissé de 20 % à la demande de Jordan)
const DUCK = 0.55; // part du volume de la musique pendant un dialogue
const FADE_IN = 3; // secondes
const FADE_SHORT = 0.5;
const PREFERENCE_KEY = 'village-lia-son';

function readMuted() {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) === 'coupe';
  } catch {
    return false;
  }
}

function writeMuted(muted) {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, muted ? 'coupe' : 'actif');
  } catch {
    // préférence non retenue : sans gravité
  }
}

// src : le fichier de musique ; button : le bouton #son ; labels : { couper,
// remettre }, les textes du bouton pour un lecteur d'écran.
export function createAudio(src, button, labels) {
  const audio = new Audio();
  audio.src = src;
  audio.loop = true;
  audio.preload = 'none'; // rien n'est téléchargé avant le lancement du jeu
  let context = null;
  let master = null; // volume général : coupé, il fait taire tout le jeu
  let musicGain = null;
  let ambienceBus = null;
  let started = false;
  let muted = readMuted();
  let ducked = false;
  let suspendTimer = 0;
  const startListeners = [];

  const musicLevel = () => MUSIC_VOLUME * (ducked ? DUCK : 1);

  function ramp(param, value, seconds) {
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  function resume() {
    clearTimeout(suspendTimer);
    context?.resume();
    audio.play().catch(() => {});
  }

  function pause() {
    audio.pause();
    context?.suspend();
  }

  function refreshButton() {
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? labels.remettre : labels.couper);
    button.dataset.coupe = muted ? 'oui' : 'non';
  }

  // À appeler pendant un geste du joueur (clic, touche).
  function start() {
    if (started) return;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return; // navigateur sans Web Audio : le jeu reste muet
    started = true;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(context.destination);
    musicGain = context.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);
    ambienceBus = context.createGain();
    ambienceBus.connect(master);
    try {
      context.createMediaElementSource(audio).connect(musicGain);
    } catch {
      // musique indisponible : l'ambiance marche quand même
    }
    if (muted) context.suspend();
    else resume();
    ramp(musicGain.gain, musicLevel(), FADE_IN);
    for (const listener of startListeners) listener({ context, destination: ambienceBus });
  }

  function toggle() {
    muted = !muted;
    writeMuted(muted);
    refreshButton();
    if (!started) {
      start();
      return;
    }
    if (muted) {
      ramp(master.gain, 0, FADE_SHORT);
      suspendTimer = setTimeout(pause, FADE_SHORT * 1000 + 50);
    } else {
      resume();
      ramp(master.gain, 1, FADE_SHORT);
    }
  }

  button.addEventListener('click', () => {
    button.blur();
    toggle();
  });
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyM' || event.repeat || event.target instanceof HTMLInputElement) return;
    toggle();
  });
  // Onglet caché : tout s'arrête, tout reprend au retour.
  document.addEventListener('visibilitychange', () => {
    if (!started || muted) return;
    if (document.hidden) pause();
    else resume();
  });
  refreshButton();

  return {
    start,
    toggle,
    // listener({ context, destination }) : appelé quand le son démarre (tout
    // de suite s'il a déjà démarré). C'est là que l'ambiance se branche.
    onStart(listener) {
      if (started) listener({ context, destination: ambienceBus });
      else startListeners.push(listener);
    },
    showButton() {
      button.hidden = false;
    },
    // Pendant un dialogue, la musique se fait plus discrète.
    setDucked(on) {
      if (on === ducked) return;
      ducked = on;
      if (started) ramp(musicGain.gain, musicLevel(), FADE_SHORT * 2);
    },
    get state() {
      return {
        started,
        muted,
        ducked,
        paused: audio.paused,
        time: Number(audio.currentTime.toFixed(1)),
        gain: musicGain ? Number(musicGain.gain.value.toFixed(3)) : 0,
        context: context?.state ?? 'absent',
      };
    },
  };
}
