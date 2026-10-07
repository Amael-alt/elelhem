// Collisions : le personnage est un cercle, les cases pleines de la carte sont
// des carrés. Après chaque pas, on repousse le cercle hors des carrés qu'il
// touche, le long de la normale du contact : contre un mur en biais, le
// personnage glisse au lieu de s'arrêter net.
//
// Version 2.8, l'aide aux coins : quand un pas est presque entièrement
// absorbé (le personnage bute), on essaie le même pas depuis une position
// décalée de côté, de quelques centimètres jusqu'à CORNER_REACH. Si l'un de
// ces pas passe, c'est qu'on accrochait un coin d'obstacle : on le prend. Le
// héros glisse autour des angles des maisons et des tonneaux au lieu de s'y
// coller.

const MAX_STEP = 0.2; // au-delà, on découpe le pas pour ne jamais traverser un mur
const PASSES = 2;
const CORNER_REACH = 0.28; // décalage de côté toléré, en unités
const CORNER_STEP = 0.07; // par essais successifs de ce pas
const STUCK_SHARE = 0.35; // en deçà de cette part du pas, on bute
const FREE_SHARE = 0.85; // au-delà, le pas décalé passe

// posts : obstacles ronds posés hors de la grille (poteaux de lanterne),
// liste de { x, z, radius }.
export function createCollider(map, posts = []) {
  function pushOutOfPosts(position, radius) {
    for (const post of posts) {
      const dx = position.x - post.x;
      const dz = position.z - post.z;
      const distance = Math.hypot(dx, dz);
      const reach = radius + post.radius;
      if (distance >= reach || distance < 1e-6) continue;
      position.x += (dx / distance) * (reach - distance);
      position.z += (dz / distance) * (reach - distance);
    }
  }

  function pushOut(position, radius) {
    pushOutOfPosts(position, radius);
    const minX = Math.floor(position.x - radius);
    const maxX = Math.floor(position.x + radius);
    const minZ = Math.floor(position.z - radius);
    const maxZ = Math.floor(position.z + radius);
    for (let z = minZ; z <= maxZ; z += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (!map.isSolid(x, z)) continue;
        // Point du carré le plus proche du centre du cercle.
        const nearX = Math.min(Math.max(position.x, x), x + 1);
        const nearZ = Math.min(Math.max(position.z, z), z + 1);
        let dx = position.x - nearX;
        let dz = position.z - nearZ;
        const distance = Math.hypot(dx, dz);
        if (distance >= radius) continue;
        if (distance > 1e-6) {
          const push = (radius - distance) / distance;
          position.x += dx * push;
          position.z += dz * push;
        } else {
          // Centre déjà dans le carré : sortie par le bord le plus proche.
          const exits = [
            [x - radius - position.x, 0], [x + 1 + radius - position.x, 0],
            [0, z - radius - position.z], [0, z + 1 + radius - position.z],
          ];
          [dx, dz] = exits.reduce((best, e) => (Math.hypot(...e) < Math.hypot(...best) ? e : best));
          position.x += dx;
          position.z += dz;
        }
      }
    }
  }

  // Un pas de (dx, dz) depuis (x, z), corrigé ; renvoie la position et la part
  // du pas réellement parcourue dans sa direction.
  const scratch = { x: 0, z: 0 };
  function tryStep(x, z, dx, dz, radius) {
    scratch.x = x + dx;
    scratch.z = z + dz;
    for (let p = 0; p < PASSES; p += 1) pushOut(scratch, radius);
    const length = Math.hypot(dx, dz) || 1;
    const progress = ((scratch.x - x) * dx + (scratch.z - z) * dz) / (length * length);
    return progress;
  }

  return {
    // Déplace position (objet { x, z }) de (dx, dz) et la corrige sur place.
    move(position, dx, dz, radius) {
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / MAX_STEP));
      const sx = dx / steps;
      const sz = dz / steps;
      const length = Math.hypot(sx, sz) || 1;
      // La perpendiculaire au pas, pour les essais décalés.
      const px = -sz / length;
      const pz = sx / length;
      for (let s = 0; s < steps; s += 1) {
        const fromX = position.x;
        const fromZ = position.z;
        let progress = tryStep(fromX, fromZ, sx, sz, radius);
        if (progress < STUCK_SHARE) {
          // On bute : un coin, peut-être. Essais de côté, de plus en plus loin.
          let found = false;
          for (let k = 1; k * CORNER_STEP <= CORNER_REACH && !found; k += 1) {
            for (const side of [1, -1]) {
              const ox = px * side * k * CORNER_STEP;
              const oz = pz * side * k * CORNER_STEP;
              // Le décalage lui-même doit être libre, sinon on traverserait.
              if (tryStep(fromX, fromZ, ox, oz, radius) < 0.95) continue;
              const shiftedX = scratch.x;
              const shiftedZ = scratch.z;
              if (tryStep(shiftedX, shiftedZ, sx, sz, radius) >= FREE_SHARE) {
                found = true;
                break;
              }
            }
          }
          if (!found) progress = tryStep(fromX, fromZ, sx, sz, radius);
        }
        position.x = scratch.x;
        position.z = scratch.z;
        void progress;
      }
      return position;
    },
  };
}
