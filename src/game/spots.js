// Les points d'action du village (version 2.3) : des endroits où le bouton
// d'action fait autre chose que parler. Le puits à vœux (un Token jeté, une
// maxime rendue, parfois le double), le feu de camp et les bancs (s'asseoir
// pour reprendre ses clartés), les tonneaux, caisses et meules à fouiller (une
// fois chacun, quelques Tokens cachés), la pomme du verger (une clarté, une
// fois par visite de la lande), l'étal du marchand de fioles, et le défi du
// mannequin sur le terrain d'entraînement. Les textes sont dans
// data/dialogues.js (textesInterface.lieux... et textesInterface.points).
//
// Chaque point est un hotspot de game/interaction.js : { world, x, z, y,
// radius, label, available(), action() }.

const REST_SECONDS = 3.6; // le temps de s'asseoir, avant que les clartés reviennent
const REST_ZOOM = 0.72; // la caméra recule d'autant pendant le repos
const DOUBLE_CHANCE = 0.1; // une fois sur dix, le puits rend le double
const SEARCH_PATTERN = [2, 0, 1, 0, 3, 0, 0, 2]; // Tokens cachés, dans l'ordre des cachettes
const MAX_VIALS = 3; // la réserve de fioles
const VIAL_PRICE = 8;
const CHALLENGE_SECONDS = 20;
const CHALLENGE_GOAL = 15; // coups à placer pour la prime
const CHALLENGE_TOKENS_PER = 5; // un Token tous les cinq coups
const CHALLENGE_BONUS = 10; // la prime, une seule fois

// village : le monde du dehors ; layout : { well, campfire, benches, barrels,
// crates, haystacks, apple, vialStall, training } (positions de
// world/layout.js) ; player, state, wallet, combat, dialogue, counter, follow :
// les modules du jeu ; texts : textesInterface.points ; tokenTexts :
// textesInterface.tokens ; save() : sauvegarde l'état ; rng : hasard.
export function createSpots({ village, layout, player, state, wallet, combat, dialogue, counter, follow, texts, tokenTexts, save, rng = Math.random }) {
  let rest = null; // { remaining, zoomStart }
  let challenge = null; // { remaining, hits }
  let lastHit = null; // le dernier mannequin touché, pour ne pas compter deux fois le même coup

  // --- Le puits à vœux -------------------------------------------------------
  function wish() {
    if (!wallet.spend(1)) {
      dialogue.open(texts.puits.nom, [texts.puits.sansToken]);
      return;
    }
    state.voeux = (state.voeux ?? 0) + 1;
    save();
    if (rng() < DOUBLE_CHANCE) {
      dialogue.open(texts.puits.nom, [texts.puits.double], () => wallet.earn(2));
      return;
    }
    const maxims = texts.puits.maximes;
    dialogue.open(texts.puits.nom, [maxims[Math.floor(rng() * maxims.length)]]);
  }

  // --- S'asseoir ---------------------------------------------------------------
  function sit() {
    if (rest) return;
    rest = { remaining: REST_SECONDS, zoomStart: follow.zoom };
    player.face('down');
  }

  // --- Fouiller ----------------------------------------------------------------
  const searchSpot = (id, index, { x, z }) => ({
    world: village, x, z, y: 1.1, radius: 1.15, label: texts.fouille.action,
    available: () => !state.fouilles.has(id),
    action() {
      state.fouilles.add(id);
      save();
      const found = SEARCH_PATTERN[index % SEARCH_PATTERN.length];
      if (found > 0) {
        wallet.earn(found);
        counter.say(texts.fouille.trouve, tokenTexts.contenu(found));
      } else {
        const lines = texts.fouille.rien;
        counter.say(texts.fouille.vide, lines[index % lines.length]);
      }
    },
  });

  // --- La pomme du verger ------------------------------------------------------
  function pickApple() {
    state.pomme = true;
    save();
    const healed = combat.heal(1);
    counter.say(texts.verger.titre, healed ? texts.verger.detail : texts.verger.pleine);
  }

  // --- L'étal du marchand de fioles -------------------------------------------
  function buyVial() {
    if ((state.fioles ?? 0) >= MAX_VIALS) {
      dialogue.open(texts.marche.nom, [texts.marche.plein]);
      return;
    }
    if (!wallet.spend(VIAL_PRICE)) {
      dialogue.open(texts.marche.nom, [texts.marche.manque(VIAL_PRICE - wallet.balance)]);
      return;
    }
    state.fioles = (state.fioles ?? 0) + 1;
    save();
    counter.say(texts.marche.achetee, texts.marche.reserve(state.fioles));
  }

  // --- Le défi du mannequin ----------------------------------------------------
  function startChallenge() {
    if (challenge) return;
    challenge = { remaining: CHALLENGE_SECONDS, hits: 0 };
    lastHit = null;
    counter.say(texts.defi.debut, texts.defi.consigne(CHALLENGE_SECONDS));
  }

  function endChallenge() {
    const { hits } = challenge;
    challenge = null;
    let tokens = Math.floor(hits / CHALLENGE_TOKENS_PER);
    const record = Math.max(state.defiRecord ?? 0, hits);
    state.defiRecord = record;
    let detail = texts.defi.gain(tokens);
    if (hits >= CHALLENGE_GOAL && !state.defiPrime) {
      state.defiPrime = true;
      tokens += CHALLENGE_BONUS;
      detail = texts.defi.prime(tokens);
    } else if (hits < CHALLENGE_TOKENS_PER) {
      detail = texts.defi.rate;
    }
    save();
    if (tokens > 0) wallet.earn(tokens);
    counter.say(texts.defi.fin(hits), detail);
  }

  const { well, campfire, benches, barrels, crates, haystacks, apple, vialStall, training } = layout;
  const hotspots = [
    { world: village, x: well.x, z: well.z, y: 2.1, radius: 1.9, label: texts.puits.action, action: wish },
    { world: village, x: campfire.x, z: campfire.z, y: 1.0, radius: 1.5, label: texts.repos.action, action: sit },
    ...benches.map((bench) => ({ world: village, x: bench.x, z: bench.z, y: 1.0, radius: 1.3, label: texts.repos.action, action: sit })),
    ...barrels.map((spot, i) => searchSpot(`tonneau:${i}`, i, spot)),
    ...crates.map((spot, i) => searchSpot(`caisse:${i}`, barrels.length + i, spot)),
    ...haystacks.map((spot, i) => searchSpot(`meule:${i}`, barrels.length + crates.length + i, spot)),
    {
      world: village, x: apple.x, z: apple.z, y: 1.6, radius: 1.3, label: texts.verger.action,
      available: () => !state.pomme, action: pickApple,
    },
    { world: village, x: vialStall.x, z: vialStall.z + 1.3, y: 1.9, radius: 1.4, label: texts.marche.action(VIAL_PRICE), action: buyVial },
    {
      world: village, x: training.x, z: training.z, y: 1.5, radius: 2.0, label: texts.defi.action,
      available: () => combat.hasSword && !challenge, action: startChallenge,
    },
  ];

  return {
    hotspots,
    // Le héros est assis : il ne bouge pas.
    get isResting() {
      return rest !== null;
    },
    get isChallenging() {
      return challenge !== null;
    },
    // Dans l'enclos, pendant le défi, l'épée sert (combat.canFight).
    get fightingHere() {
      return challenge !== null;
    },
    // Un coup d'épée a touché un mannequin (combat.js) : compte pour le défi.
    dummyHit(dummy) {
      if (!challenge || dummy === lastHit) return;
      lastHit = dummy;
      challenge.hits += 1;
      counter.say(texts.defi.coup(challenge.hits), texts.defi.reste(Math.ceil(challenge.remaining)));
    },
    // Un nouveau coup commence : le même mannequin peut compter de nouveau.
    strikeStarted() {
      lastHit = null;
    },
    // De retour de la lande, la pomme a repoussé.
    regrowApple() {
      if (!state.pomme) return;
      state.pomme = false;
      save();
    },
    // Une fiole de la réserve, bue d'elle-même quand les clartés tombent à zéro
    // sur la lande (combat.onEmpty). Renvoie vrai si une fiole a été bue.
    drinkVial() {
      if ((state.fioles ?? 0) <= 0) return false;
      state.fioles -= 1;
      save();
      counter.say(texts.marche.bue, texts.marche.reserve(state.fioles));
      return true;
    },
    update(dt) {
      if (rest) {
        rest.remaining -= dt;
        // La caméra recule doucement, puis revient.
        const progress = 1 - Math.max(0, rest.remaining) / REST_SECONDS;
        const wanted = rest.zoomStart * (1 - (1 - REST_ZOOM) * Math.sin(progress * Math.PI));
        follow.zoomByFactor(wanted / follow.zoom);
        if (rest.remaining <= 0) {
          follow.zoomByFactor(rest.zoomStart / follow.zoom);
          rest = null;
          const healed = combat.heal(combat.maxClartes);
          counter.say(texts.repos.titre, healed ? texts.repos.detail : texts.repos.pleine);
        }
      }
      if (challenge) {
        challenge.remaining -= dt;
        if (challenge.remaining <= 0) endChallenge();
      }
    },
  };
}
