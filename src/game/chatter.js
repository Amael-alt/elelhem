// Les répliques des figurants : quand le héros passe près d'un apprenti, ou
// sous le colombier, une bulle s'affiche au-dessus de sa tête le temps de la
// lire, puis s'efface. Pas d'action à faire, pas de question : de la vie.
// Une réplique à chaque passage, à tour de rôle ; il faut s'éloigner puis
// revenir pour entendre la suivante. Les textes viennent de data/dialogues.js.

import * as THREE from 'three';
import { projectToScreen } from './ui.js';

const HEAR_RADIUS = 2.6; // en dessous, le figurant parle
const LEAVE_RADIUS = 4.0; // au-delà, il pourra reparler au prochain passage
const READ_SECONDS_PER_CHAR = 0.055; // temps de lecture, selon la longueur
const MIN_SHOW_SECONDS = 3.2;

// element : #replique ; speakers : [{ id, lines, position: { x, z }, headPoint(target),
// radius? }] ; player : { position } ; camera, canvas : pour placer la bulle.
export function createChatter(element, { speakers, player, camera, canvas }) {
  const head = new THREE.Vector3();
  const screen = { x: 0, y: 0 };
  const turns = new Map(speakers.map((speaker) => [speaker.id, 0]));
  const armed = new Map(speakers.map((speaker) => [speaker.id, true]));
  let current = null; // celui qui parle
  let remaining = 0;

  const distance = (speaker) => Math.hypot(speaker.position.x - player.position.x, speaker.position.z - player.position.z);

  function hide() {
    current = null;
    element.hidden = true;
  }

  function say(speaker) {
    const turn = turns.get(speaker.id);
    const line = speaker.lines[turn % speaker.lines.length];
    turns.set(speaker.id, turn + 1);
    armed.set(speaker.id, false);
    current = speaker;
    remaining = Math.max(MIN_SHOW_SECONDS, line.length * READ_SECONDS_PER_CHAR);
    element.textContent = line;
    element.hidden = false;
  }

  return {
    // dt : temps réel ; quiet : vrai pendant une conversation ou un écran
    // (diplôme, grimoire) : aucune bulle.
    update(dt, quiet) {
      for (const speaker of speakers) {
        if (!armed.get(speaker.id) && distance(speaker) > LEAVE_RADIUS) armed.set(speaker.id, true);
      }
      if (quiet) {
        if (current) hide();
        return;
      }
      if (current) {
        remaining -= dt;
        if (remaining <= 0 || distance(current) > LEAVE_RADIUS) hide();
      }
      if (!current) {
        const near = speakers.find((speaker) => armed.get(speaker.id) && distance(speaker) <= (speaker.radius ?? HEAR_RADIUS));
        if (near) say(near);
      }
      if (!current) return;
      const anchor = projectToScreen(current.headPoint(head), camera, canvas, screen);
      if (!anchor) {
        element.hidden = true;
        return;
      }
      element.hidden = false;
      element.style.transform = `translate(${Math.round(anchor.x)}px, ${Math.round(anchor.y)}px)`;
    },
    // Pour les tests : qui parle, et quoi.
    snapshot: () => (current ? { id: current.id, texte: element.textContent } : null),
  };
}
