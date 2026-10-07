// Les portes : entrer dans une maison et en ressortir. Dehors, on pousse la
// porte (on marche vers elle, vers le nord) ; dedans, on franchit le seuil vers
// le sud. Le passage se fait dans un fondu au noir : on change de scène au
// moment où l'écran est noir, le joueur ne voit jamais la bascule.

const FADE_MS = 240;
const DOOR_HALF_WIDTH = 0.45; // demi-largeur de la porte où l'on peut entrer
const DOOR_REACH = 0.45; // arrêté par le mur, le héros est à 0,3 de la façade
const THRESHOLD_REACH = 0.55; // dedans, jusqu'où avancer sur le seuil
const OUTSIDE_STEP = 1.0; // en sortant, on réapparaît un pas devant la porte
const PUSH = 0.5; // part du geste dirigée vers la porte (au joystick, on pousse rarement droit)

// fade : l'élément #fondu ; village : le monde du dehors ; rooms : { id:
// intérieur (world/interior.js) } ; houses : HOUSES de world/layout.js ;
// player : le héros ; onChange(world, room) : appelé à chaque changement de
// lieu, room vaut null dehors.
// gates : passages entre deux mondes de plein air, [{ from, to, zone: { x0, x1,
// z0, z1 }, push: { x, z } (sens du geste qui fait passer), at: { x, z,
// direction } (où l'on arrive), allowed() (facultatif : faux et le passage
// reste fermé, onRefused est appelé) }].
// irisAt() : le point de l'écran (pixels CSS) où l'iris se ferme et se rouvre,
// le héros sur sa porte (version 2.9) ; sans lui, le fondu part du centre.
export function createDoors(fade, { village, rooms, houses, player, onChange, gates = [], onRefused = () => {}, irisAt = null }) {
  // La porte de chaque maison qui a un intérieur : au milieu de sa façade sud,
  // décalée comme dans world/props.js.
  const doors = Object.entries(rooms).map(([id, interior]) => {
    const house = houses[interior.room.house];
    if (house.ridge !== 'x' || house.door?.side !== 'south') {
      throw new Error(`Porte de « ${interior.room.house} » : seules les portes au sud sont prévues.`);
    }
    return { id, interior, x: house.x + house.sizeX / 2 + (house.door.offset ?? 0), z: house.z + house.sizeZ };
  });

  let current = village;
  let room = null;
  let busy = false;

  function swap(world, nextRoom, x, z, direction) {
    current = world;
    room = nextRoom;
    player.setWorld(world, x, z, direction);
    onChange(world, room);
  }

  // Bascule de lieu, dans un fondu au noir sauf si instant.
  function go(world, nextRoom, x, z, direction, instant) {
    if (busy) return;
    if (instant) {
      swap(world, nextRoom, x, z, direction);
      return;
    }
    busy = true;
    const at = irisAt?.();
    if (at) {
      fade.style.setProperty('--iris-x', `${Math.round(at.x)}px`);
      fade.style.setProperty('--iris-y', `${Math.round(at.y)}px`);
    }
    fade.hidden = false;
    void fade.offsetWidth; // la transition part bien de l'écran clair
    fade.classList.add('fondu-noir');
    setTimeout(() => {
      swap(world, nextRoom, x, z, direction);
      fade.classList.remove('fondu-noir');
      setTimeout(() => {
        fade.hidden = true;
        busy = false;
      }, FADE_MS);
    }, FADE_MS);
  }

  function enter(id, { instant = false, at = null } = {}) {
    const door = doors.find((d) => d.id === id);
    const spot = at ?? door.interior.spawn;
    go(door.interior, id, spot.x, spot.z, spot.direction ?? 'up', instant);
  }

  // Passe un portail (vers la lande, ou retour), sans fondu si instant.
  function travel(gate, { instant = false } = {}) {
    go(gate.to, null, gate.at.x, gate.at.z, gate.at.direction ?? 'left', instant);
  }

  function exit({ instant = false } = {}) {
    const door = doors.find((d) => d.id === room);
    if (!door) return;
    go(village, null, door.x, door.z + OUTSIDE_STEP, 'down', instant);
  }

  return {
    get current() {
      return current;
    },
    get room() {
      return room;
    },
    get isBusy() {
      return busy;
    },
    doors,
    gates,
    enter,
    exit,
    travel,
    // À chaque image : le héros pousse-t-il une porte, ou franchit-il un seuil ?
    // move : la direction demandée par le joueur ({ x, z }) ; c'est elle qui
    // compte, pas le regard du sprite.
    update(move) {
      if (busy || !player.moving) return;
      const { x, z } = player.position;
      // Seule l'orientation du geste compte, pas sa force : au joystick, une
      // poussée douce vers la porte l'ouvre aussi.
      const length = Math.hypot(move.x, move.z);
      if (length === 0) return;
      const towardNorth = -move.z / length;
      // Un portail du monde où l'on est, si le geste le pousse et qu'on est dedans.
      for (const gate of gates) {
        if (gate.from !== current) continue;
        const { x0, x1, z0, z1 } = gate.zone;
        if (x < x0 || x > x1 || z < z0 || z > z1) continue;
        if ((move.x * gate.push.x + move.z * gate.push.z) / length < PUSH) continue;
        if (gate.allowed && !gate.allowed()) {
          onRefused(gate);
          return;
        }
        travel(gate);
        return;
      }
      if (current === village) {
        if (towardNorth < PUSH) return;
        const door = doors.find((d) => Math.abs(x - d.x) < DOOR_HALF_WIDTH && z > d.z && z - d.z < DOOR_REACH);
        if (door) enter(door.id);
        return;
      }
      if (-towardNorth < PUSH) return;
      // Un monde de plein air sans porte de sortie (la lande) : rien à franchir.
      if (!current.door) return;
      const threshold = current.door;
      if (Math.abs(x - threshold.x) < DOOR_HALF_WIDTH && z > threshold.z - THRESHOLD_REACH) exit();
    },
  };
}
