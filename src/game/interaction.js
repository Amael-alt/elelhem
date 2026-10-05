// Parler à un habitant : trouve celui qui est à portée, montre l'indicateur
// au-dessus de sa tête, ouvre sa conversation à l'action (touche, clic ou
// toucher sur la bulle) et compte la visite. Le choix du texte est le seul
// endroit où le moteur lit data/dialogues.js, et il ne lit que l'état.

import * as THREE from 'three';
import { directionToward, INTERACTION_RADIUS, NAME_RADIUS } from './npc.js';
import { recordVisit } from './state.js';
import { projectToScreen } from './ui.js';

const LABEL_LIFT = 52; // pixels : l'étiquette passe au-dessus de la bulle

// player : { position, facing, face } ; npcs : liste ; hint, dialogue : voir
// ui.js et dialogue.js ; state : voir state.js ; texts : data/dialogues.js ;
// camera et canvas servent à ancrer l'indicateur à l'écran ; label : l'étiquette
// de nom (ui.js).
export function createInteraction({ player, npcs, hint, label, dialogue, state, texts, camera, canvas }) {
  const head = new THREE.Vector3();
  const screen = { x: 0, y: 0 };
  let requested = false;
  let target = null;

  // Le plus proche des habitants (pas des figurants) dans un rayon donné.
  function nearest(radius, needsDialogue) {
    let best = null;
    let bestDistance = radius;
    for (const npc of npcs) {
      if (npc.isExtra || (needsDialogue && !npc.character.dialogue)) continue;
      const distance = npc.distanceTo(player.position);
      if (distance <= bestDistance) {
        best = npc;
        bestDistance = distance;
      }
    }
    return best;
  }

  // Ouvre la conversation de npc : présentation la première fois, retour
  // ensuite. Le héros et l'habitant se font face.
  function start(npc) {
    const entry = texts[npc.character.dialogue];
    const first = (state.visites.get(npc.id) ?? 0) === 0;
    const pages = first ? entry.intro(state) : entry.retour(state);
    recordVisit(state, npc.id);
    npc.faceToward(player.position);
    player.face(directionToward(npc.position.x - player.position.x, npc.position.z - player.position.z, player.facing));
    hint.hide();
    label.hide();
    dialogue.open(entry.nom, pages);
  }

  return {
    get isTalking() {
      return dialogue.isOpen;
    },
    get target() {
      return target;
    },
    // Demande d'action venue de la bulle (toucher ou clic).
    request() {
      requested = true;
    },
    start,
    // dt : temps réel de l'image ; action : la touche d'action a été pressée.
    update(dt, action) {
      const wanted = action || requested;
      requested = false;
      if (dialogue.isOpen) {
        if (wanted) dialogue.advance();
        dialogue.update(dt);
        target = null;
        return;
      }
      target = nearest(INTERACTION_RADIUS, true);
      if (wanted && target) {
        start(target);
        return;
      }
      // Le nom s'affiche dès qu'on approche, la bulle seulement à portée de parole.
      const named = target ?? nearest(NAME_RADIUS, false);
      const anchor = named ? projectToScreen(named.headPoint(head), camera, canvas, screen) : null;
      if (!anchor) {
        hint.hide();
        label.hide();
        return;
      }
      if (target) hint.show(anchor, `Parler à ${target.character.nom}`);
      else hint.hide();
      label.show(anchor, named.character.nom, target ? LABEL_LIFT : 0);
    },
  };
}
