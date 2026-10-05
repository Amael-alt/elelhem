// Musique de fond : une boucle douce, lancée au premier geste du joueur (les
// navigateurs interdisent le son avant), montée en fondu, baissée pendant les
// dialogues, coupée quand l'onglet est caché. Le joueur peut la couper (bouton
// en haut à droite, ou touche M) ; ce choix est retenu dans le navigateur.
//
// Le volume passe par Web Audio (un nœud de gain) : sur iPhone, le volume
// d'un élément audio est ignoré, seul un gain le règle vraiment.

const VOLUME = 0.26; // assez bas pour rester une ambiance
const DUCK = 0.55; // part du volume pendant un dialogue
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
export function createMusic(src, button, labels) {
  const audio = new Audio();
  audio.src = src;
  audio.loop = true;
  audio.preload = 'none'; // rien n'est téléchargé avant le lancement du jeu
  let context = null;
  let gain = null;
  let started = false;
  let muted = readMuted();
  let ducked = false;
  let pauseTimer = 0;

  const level = () => (muted ? 0 : VOLUME * (ducked ? DUCK : 1));

  function fadeTo(seconds) {
    if (gain) {
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(level(), now + seconds);
    } else {
      audio.volume = level();
    }
  }

  function play() {
    clearTimeout(pauseTimer);
    context?.resume();
    audio.play().catch(() => {});
  }

  function refreshButton() {
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? labels.remettre : labels.couper);
    button.dataset.coupe = muted ? 'oui' : 'non';
  }

  // À appeler pendant un geste du joueur (clic, touche) : crée le contexte
  // audio, branche la musique sur le gain et lance le fondu.
  function start() {
    if (started) return;
    started = true;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (AudioContextClass) {
      try {
        context = new AudioContextClass();
        gain = context.createGain();
        gain.gain.value = 0;
        context.createMediaElementSource(audio).connect(gain).connect(context.destination);
      } catch {
        context = null;
        gain = null;
      }
    }
    if (!gain) audio.volume = 0;
    if (!muted) play();
    fadeTo(FADE_IN);
  }

  function toggle() {
    muted = !muted;
    writeMuted(muted);
    refreshButton();
    if (!started) {
      start();
      return;
    }
    fadeTo(FADE_SHORT);
    if (muted) pauseTimer = setTimeout(() => audio.pause(), FADE_SHORT * 1000 + 50);
    else play();
  }

  button.addEventListener('click', () => {
    button.blur();
    toggle();
  });
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyM' || event.repeat || event.target instanceof HTMLInputElement) return;
    toggle();
  });
  // Onglet caché : la musique s'arrête, elle reprend au retour.
  document.addEventListener('visibilitychange', () => {
    if (!started || muted) return;
    if (document.hidden) audio.pause();
    else play();
  });
  refreshButton();

  return {
    start,
    toggle,
    showButton() {
      button.hidden = false;
    },
    // Pendant un dialogue, la musique se fait plus discrète.
    setDucked(on) {
      if (on === ducked) return;
      ducked = on;
      if (started) fadeTo(FADE_SHORT * 2);
    },
    get state() {
      return { started, muted, ducked, paused: audio.paused, time: Number(audio.currentTime.toFixed(1)), gain: gain ? Number(gain.gain.value.toFixed(3)) : audio.volume };
    },
  };
}
