// Parler à un habitant : trouve celui qui est à portée, montre l'indicateur
// au-dessus de sa tête, et ouvre la conversation à l'action (touche, clic ou
// toucher sur la bulle, bouton d'action des écrans tactiles). Ce qui se dit, et dans quel ordre, est l'affaire de
// quest.js.

import * as THREE from 'three';
import { directionToward, INTERACTION_RADIUS, NAME_RADIUS } from './npc.js';
import { projectToScreen } from './ui.js';

const LABEL_LIFT = 52; // pixels : l'étiquette passe au-dessus de la bulle

// player : { position, facing, face } ; npcs : liste ; hint, label, dialogue :
// voir ui.js et dialogue.js ; quest : voir quest.js (talk, isBusy) ; camera et
// canvas servent à ancrer l'indicateur à l'écran ; talkLabel(nom) : le texte
// de la bulle pour un lecteur d'écran ; button : le bouton d'action (ui.js),
// et idleLabel son texte quand personne n'est à portée.
// hotspots : [{ world (le lieu, ou null pour partout), x, z, y (hauteur de
// l'indicateur), radius, label, action() }] : des points où l'action fait
// autre chose que parler (l'enclume de la forge ouvre le menu Forger).
// currentWorld() : le lieu où l'on est.
export function createInteraction({ player, npcs, hint, label, dialogue, quest, talkLabel, camera, canvas, button, idleLabel, hotspots = [], currentWorld = () => null }) {
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

  // Ouvre la conversation de npc. Le héros et l'habitant se font face.
  function start(npc) {
    npc.faceToward(player.position);
    player.face(directionToward(npc.position.x - player.position.x, npc.position.z - player.position.z, player.facing));
    hint.hide();
    label.hide();
    quest.talk(npc);
  }

  return {
    // Conversation ou diplôme à l'écran : le héros reste immobile.
    get isTalking() {
      return quest.isBusy;
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
      // Le bouton d'action : caché pendant une conversation ou un écran
      // ouvert, une bulle quand quelqu'un est à portée.
      if (quest.isBusy) button.hide();
      if (dialogue.isOpen) {
        if (wanted) dialogue.advance();
        dialogue.update(dt);
        target = null;
        return;
      }
      target = quest.isBusy ? null : nearest(INTERACTION_RADIUS, true);
      if (wanted && target) {
        start(target);
        return;
      }
      // Un point d'action à portée, s'il n'y a personne à qui parler.
      const world = currentWorld();
      const spot = quest.isBusy || target ? null : hotspots.find((h) => (h.world === null || h.world === world)
        && Math.hypot(h.x - player.position.x, h.z - player.position.z) <= h.radius);
      if (spot) {
        if (wanted) {
          hint.hide();
          label.hide();
          spot.action();
          return;
        }
        button.show('parler', spot.label);
        const spotAnchor = projectToScreen(head.set(spot.x, spot.y ?? 1.2, spot.z), camera, canvas, screen);
        if (spotAnchor) {
          hint.show(spotAnchor, spot.label);
          label.show(spotAnchor, spot.label, LABEL_LIFT);
        }
        return;
      }
      if (!quest.isBusy) button.show(target ? 'parler' : 'repos', target ? talkLabel(target.character.nom) : idleLabel);
      // Le nom s'affiche dès qu'on approche, la bulle seulement à portée de parole.
      const named = quest.isBusy ? null : target ?? nearest(NAME_RADIUS, false);
      const anchor = named ? projectToScreen(named.headPoint(head), camera, canvas, screen) : null;
      if (!anchor) {
        hint.hide();
        label.hide();
        return;
      }
      if (target) hint.show(anchor, talkLabel(target.character.nom));
      else hint.hide();
      label.show(anchor, named.character.nom, target ? LABEL_LIFT : 0);
    },
  };
}
