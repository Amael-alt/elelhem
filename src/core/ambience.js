// Les sons d'ambiance, tous fabriqués par le code avec Web Audio : aucun
// fichier sonore en plus de la musique.
//
// - Sources continues, dont le volume et la position gauche-droite suivent le
//   héros : la rivière, la cascade, les feux (forge et feu de camp), le vent.
// - Sons ponctuels, déclenchés au fil du temps : oiseaux (partout, à gauche ou
//   à droite au hasard), roucoulements près du colombier, marteau sur
//   l'enclume près de la forge.
// - Les pas du héros, selon le sol : pavés, terre, herbe.
// La caméra ne tourne jamais : la droite de l'écran est toujours l'est (+x),
// le panoramique vient donc directement de l'écart en x.

const PAN_SPREAD = 9; // unités : au-delà, le son est tout à gauche ou à droite
const UPDATE_SECONDS = 0.1; // les volumes suivent le héros dix fois par seconde
const SMOOTHING = 0.25; // constante de temps des changements de volume

const BLIP_BASE = 540; // hertz, la voix moyenne des dialogues
export const HAMMER_PERIOD = 1.6; // secondes entre deux coups de marteau de Ferrand (le son et le geste)
const LEVELS = {
  bip: 0.045, // la frappe du texte des dialogues
  carillon: 0.11, // les petits sons d'événements (pièce, coffre, parchemin)
  riviere: 0.16,
  cascade: 0.22,
  feu: 0.2,
  vent: 0.045,
  oiseau: 0.035,
  pigeon: 0.06,
  marteau: 0.07,
  pas: 0.07,
};
const REACH = { riviere: 10, cascade: 16, feu: 7, pigeon: 9, marteau: 13 };
const STRIDE = 0.62; // unités entre deux pas
const INDOOR_WIND = 0.12; // part du vent qu'on entend encore dans une maison

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Volume selon la distance : plein près de la source, nul à « reach ».
const falloff = (distance, reach) => clamp(1 - distance / reach, 0, 1) ** 2;

// Distance d'un point à un segment [a, b] (en x, z).
function segmentDistance(px, pz, [ax, az], [bx, bz]) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function createNoiseBuffer(context, seconds = 2) {
  const buffer = context.createBuffer(1, Math.round(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Crépitement : un souffle grave et des craquements brefs, en boucle.
function createCrackleBuffer(context, seconds = 3) {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.round(rate * seconds), rate);
  const data = buffer.getChannelData(0);
  let low = 0;
  for (let i = 0; i < data.length; i += 1) {
    low = low * 0.985 + (Math.random() * 2 - 1) * 0.015;
    data[i] = low * 2.2;
  }
  const pops = Math.round(seconds * 22);
  for (let p = 0; p < pops; p += 1) {
    const start = Math.floor(Math.random() * (data.length - rate * 0.01));
    const length = Math.floor(rate * (0.002 + Math.random() * 0.006));
    const amplitude = 0.25 + Math.random() * 0.75;
    for (let i = 0; i < length; i += 1) data[start + i] += (Math.random() * 2 - 1) * amplitude * Math.exp(-i / (length * 0.3));
  }
  return buffer;
}

// sources : { river: [[x, z], ...] (tracé), waterfall: [x, z], fires: [[x, z], ...],
// anvil: [x, z], dovecote: [x, z] } ; surfaceAt(x, z) : 'cobble' | 'dirt' | 'grass' | ...
export function createAmbience(audio, sources, surfaceAt) {
  let engine = null;
  let clock = 0;
  let lastHammer = -1;
  // Dans un intérieur : { fires: [[x, z], ...] } dans les coordonnées de la
  // pièce ; dehors : null. Dedans, ni rivière, ni oiseaux, ni forge lointaine,
  // le vent étouffé, seulement le feu de la pièce.
  let indoors = null;
  let sinceUpdate = UPDATE_SECONDS;
  let stride = 0;
  let last = null;
  const timers = { oiseau: 2, pigeon: 3, marteau: 1.5 };

  audio.onStart(({ context, destination }) => {
    const noise = createNoiseBuffer(context);
    const crackle = createCrackleBuffer(context);

    // Une source continue : bruit filtré, gain réglable, panoramique.
    const loop = (buffer, filters) => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0;
      let node = source;
      for (const [type, frequency, q = 0.7] of filters) {
        const filter = context.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = q;
        node.connect(filter);
        node = filter;
      }
      const gain = context.createGain();
      gain.gain.value = 0;
      const pan = context.createStereoPanner();
      node.connect(gain).connect(pan).connect(destination);
      source.start(0, Math.random() * buffer.duration);
      return { gain, pan };
    };

    const river = loop(noise, [['bandpass', 900, 0.5], ['lowpass', 2600]]);
    const waterfall = loop(noise, [['lowpass', 1500], ['peaking', 400, 1]]);
    const fire = loop(crackle, [['highpass', 300]]);
    const wind = loop(noise, [['lowpass', 380]]);
    // Le vent respire : une oscillation très lente module son volume.
    const gust = context.createOscillator();
    gust.frequency.value = 0.07;
    const gustDepth = context.createGain();
    gustDepth.gain.value = LEVELS.vent * 0.6;
    gust.connect(gustDepth).connect(wind.gain.gain);
    gust.start();
    wind.gain.gain.value = LEVELS.vent;
    // À l'abri d'un mur, le vent ne passe presque plus.
    const shelter = context.createGain();
    wind.pan.disconnect();
    wind.pan.connect(shelter).connect(destination);

    engine = { context, destination, noise, river, waterfall, fire, shelter };
    if (indoors) shelter.gain.value = INDOOR_WIND;
  });

  // Chaque son ponctuel part d'une hauteur un peu différente, entre 95 et
  // 105 % (version 2.8) : deux pas ne sonnent jamais tout à fait pareil.
  const pitch = () => 0.95 + Math.random() * 0.1;

  // Un son ponctuel : enveloppe d'attaque et de chute, panoramique.
  function voice(pan, level) {
    const { context, destination } = engine;
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    panner.pan.value = clamp(pan, -0.95, 0.95);
    gain.gain.value = 0;
    gain.connect(panner).connect(destination);
    return { gain, now: context.currentTime, level };
  }

  // Gazouillis : deux à cinq notes qui glissent vers l'aigu.
  function bird(pan) {
    const { context } = engine;
    const { gain, now, level } = voice(pan, LEVELS.oiseau * (0.6 + Math.random() * 0.6));
    const notes = 2 + Math.floor(Math.random() * 4);
    const base = (2300 + Math.random() * 1600) * pitch();
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.connect(gain);
    for (let i = 0; i < notes; i += 1) {
      const t = now + i * (0.09 + Math.random() * 0.05);
      osc.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), t);
      osc.frequency.exponentialRampToValueAtTime(base * 1.5, t + 0.06);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(level, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.075);
    }
    osc.start(now);
    osc.stop(now + notes * 0.16 + 0.1);
  }

  // Roucoulement : « rou-rou », deux notes graves qui fléchissent.
  function coo(pan, volume) {
    const { context } = engine;
    const { gain, now } = voice(pan, 0);
    const osc = context.createOscillator();
    osc.type = 'sine';
    const wobble = context.createOscillator();
    wobble.frequency.value = 18;
    const wobbleDepth = context.createGain();
    wobbleDepth.gain.value = 14;
    wobble.connect(wobbleDepth).connect(osc.frequency);
    osc.connect(gain);
    const shift = pitch();
    for (const [offset, from, to] of [[0, 430, 390], [0.42, 410, 360]]) {
      const t = now + offset;
      osc.frequency.setValueAtTime(from * shift, t);
      osc.frequency.linearRampToValueAtTime(to * shift, t + 0.32);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.06);
      gain.gain.linearRampToValueAtTime(0, t + 0.34);
    }
    osc.start(now);
    wobble.start(now);
    osc.stop(now + 0.85);
    wobble.stop(now + 0.85);
  }

  // Marteau sur l'enclume : deux partiels métalliques qui résonnent, et le choc.
  function clang(pan, volume) {
    const { context, noise } = engine;
    const { gain, now } = voice(pan, 0);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.7);
    const shift = pitch();
    for (const [frequency, share] of [[1160, 0.6], [2930, 0.3], [4410, 0.12]]) {
      const osc = context.createOscillator();
      osc.frequency.value = frequency * shift;
      const partial = context.createGain();
      partial.gain.value = share;
      osc.connect(partial).connect(gain);
      osc.start(now);
      osc.stop(now + 0.75);
    }
    const hit = context.createBufferSource();
    hit.buffer = noise;
    const hitGain = context.createGain();
    hitGain.gain.setValueAtTime(volume * 1.4, now);
    hitGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.03);
    hit.connect(hitGain).connect(gain);
    hit.start(now, Math.random());
    hit.stop(now + 0.04);
  }

  // Un pas : un bref souffle de bruit, filtré selon le sol.
  const STEP_FILTERS = {
    cobble: ['bandpass', 2200, 1.4, 0.05],
    dirt: ['lowpass', 700, 0.8, 0.07],
    grass: ['highpass', 2600, 0.5, 0.09],
    wood: ['bandpass', 420, 2.2, 0.07], // plancher : un bruit sourd et creux
  };
  function step(surface) {
    const { context, noise } = engine;
    const [type, frequency, q, duration] = STEP_FILTERS[surface] ?? STEP_FILTERS.dirt;
    const { gain, now } = voice((Math.random() - 0.5) * 0.15, 0);
    const level = LEVELS.pas * (surface === 'grass' ? 0.7 : 1) * (0.8 + Math.random() * 0.4);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);
    const source = context.createBufferSource();
    source.buffer = noise;
    source.playbackRate.value = pitch();
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency * (0.9 + Math.random() * 0.2);
    filter.Q.value = q;
    source.connect(filter).connect(gain);
    source.start(now, Math.random() * 1.5);
    source.stop(now + duration + 0.02);
  }

  // Le bip d'une lettre qui s'écrit dans un dialogue (version 2.8) : une note
  // brève, dont la hauteur tient de l'habitant (voix, 1 pour une voix
  // moyenne, moins pour une voix grave) et varie d'une lettre à l'autre.
  function blip(voix = 1) {
    if (!engine || engine.context.state !== 'running') return;
    const { context } = engine;
    const { gain, now } = voice(0, 0);
    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = BLIP_BASE * voix * (0.9 + Math.random() * 0.2);
    osc.connect(gain);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(LEVELS.bip, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.045);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Les petits sons d'événements (version 2.9) : une note ou deux, tirées
  // d'une sinusoïde avec une pointe de triangle, en Web Audio comme le reste.
  const CHIMES = {
    piece: [[1320, 0, 0.05], [1980, 0.04, 0.09]], // un tintement qui monte
    coffre: [[520, 0, 0.14], [780, 0.12, 0.18], [1040, 0.24, 0.3]], // trois notes, un accord brisé
    parchemin: [[880, 0, 0.12], [1108, 0.1, 0.12], [1318, 0.2, 0.12], [1760, 0.3, 0.4]], // un carillon montant
    quete: [[640, 0, 0.05], [420, 0.04, 0.08]], // un « pop » qui descend : la quête est faite
    porte: [[300, 0, 0.1], [240, 0.08, 0.16]], // un battant qui se referme
  };
  function chime(kind) {
    if (!engine || engine.context.state !== 'running' || !CHIMES[kind]) return;
    const { context } = engine;
    const { gain, now } = voice(0, 0);
    const shift = pitch();
    for (const [frequency, at, duration] of CHIMES[kind]) {
      const osc = context.createOscillator();
      osc.type = kind === 'porte' ? 'triangle' : 'sine';
      osc.frequency.value = frequency * shift;
      const partial = context.createGain();
      partial.gain.setValueAtTime(0, now + at);
      partial.gain.linearRampToValueAtTime(LEVELS.carillon, now + at + 0.008);
      partial.gain.exponentialRampToValueAtTime(0.0005, now + at + duration);
      osc.connect(partial).connect(gain);
      osc.start(now + at);
      osc.stop(now + at + duration + 0.02);
    }
    gain.gain.value = 1;
  }

  const setLevel = (channel, level, pan) => {
    const now = engine.context.currentTime;
    channel.gain.gain.setTargetAtTime(level, now, SMOOTHING);
    channel.pan.pan.setTargetAtTime(clamp(pan, -0.9, 0.9), now, SMOOTHING);
  };

  return {
    blip,
    chime,
    // De 0 à 1 dans le coup de marteau en cours : le marteau de Ferrand suit (gfx/fx/critters.js).
    get hammerPhase() {
      return (clock % HAMMER_PERIOD) / HAMMER_PERIOD;
    },
    // position : { x, z } du héros ; dt : durée de l'image (temps réel).
    update(position, dt) {
      if (!engine || engine.context.state !== 'running') return;
      clock += dt;
      sinceUpdate += dt;
      const { x, z } = position;

      // Pas : un son à chaque foulée parcourue.
      if (last) {
        stride += Math.hypot(x - last.x, z - last.z);
        if (stride >= STRIDE) {
          stride = 0;
          step(surfaceAt(x, z));
        }
      }
      last = { x, z };

      if (sinceUpdate >= UPDATE_SECONDS) {
        sinceUpdate = 0;
        // La rivière : le point le plus proche de son tracé.
        let riverDistance = Infinity;
        let riverX = x;
        for (let i = 0; i + 1 < sources.river.length; i += 1) {
          const d = segmentDistance(x, z, sources.river[i], sources.river[i + 1]);
          if (d < riverDistance) {
            riverDistance = d;
            riverX = sources.river[i][0];
          }
        }
        if (indoors) riverDistance = Infinity;
        setLevel(engine.river, LEVELS.riviere * falloff(riverDistance, REACH.riviere), (riverX - x) / PAN_SPREAD);
        const [wx, wz] = sources.waterfall;
        setLevel(engine.waterfall, indoors ? 0 : LEVELS.cascade * falloff(Math.hypot(wx - x, wz - z), REACH.cascade), (wx - x) / PAN_SPREAD);
        let fireDistance = Infinity;
        let fireX = x;
        for (const [fx, fz] of indoors ? indoors.fires : sources.fires) {
          const d = Math.hypot(fx - x, fz - z);
          if (d < fireDistance) {
            fireDistance = d;
            fireX = fx;
          }
        }
        setLevel(engine.fire, LEVELS.feu * falloff(fireDistance, REACH.feu), (fireX - x) / PAN_SPREAD);
      }

      // Sons ponctuels, dehors seulement.
      for (const key of Object.keys(timers)) timers[key] -= dt;
      if (indoors) return;
      if (timers.oiseau <= 0) {
        timers.oiseau = 1.8 + Math.random() * 5;
        bird((Math.random() - 0.5) * 1.6);
      }
      const [dx, dz] = sources.dovecote;
      const dovecote = falloff(Math.hypot(dx - x, dz - z), REACH.pigeon);
      if (timers.pigeon <= 0) {
        timers.pigeon = 3.5 + Math.random() * 5;
        if (dovecote > 0.01) coo((dx - x) / PAN_SPREAD, LEVELS.pigeon * dovecote);
      }
      const [ax, az] = sources.anvil;
      const forge = falloff(Math.hypot(ax - x, az - z), REACH.marteau);
      // Le marteau frappe en rythme, à la fin de chaque période (le geste et le son ensemble).
      const hammerNow = Math.floor(clock / HAMMER_PERIOD);
      if (hammerNow !== lastHammer) {
        lastHammer = hammerNow;
        timers.marteau = 0;
      } else timers.marteau = 1;
      if (timers.marteau <= 0) {
        // Deux coups rapprochés, puis une pause : le rythme d'une forge.
        if (forge > 0.01) clang((ax - x) / PAN_SPREAD, LEVELS.marteau * forge);
      }
    },
    // room : { fires } en entrant dans une pièce, null en sortant.
    setIndoors(room) {
      indoors = room;
      if (engine) engine.shelter.gain.setTargetAtTime(room ? INDOOR_WIND : 1, engine.context.currentTime, SMOOTHING);
    },
    get state() {
      if (!engine) return { contexte: 'absent' };
      const level = (channel) => Number(channel.gain.gain.value.toFixed(3));
      return {
        contexte: engine.context.state,
        horloge: Number(clock.toFixed(1)),
        riviere: level(engine.river),
        cascade: level(engine.waterfall),
        feu: level(engine.fire),
      };
    },
  };
}
