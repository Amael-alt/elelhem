// Collisions : le personnage est un cercle, les cases pleines de la carte sont
// des carrés. Après chaque pas, on repousse le cercle hors des carrés qu'il
// touche, le long de la normale du contact : contre un mur en biais, le
// personnage glisse au lieu de s'arrêter net.

const MAX_STEP = 0.2; // au-delà, on découpe le pas pour ne jamais traverser un mur
const PASSES = 2;

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

  return {
    // Déplace position (objet { x, z }) de (dx, dz) et la corrige sur place.
    move(position, dx, dz, radius) {
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / MAX_STEP));
      for (let s = 0; s < steps; s += 1) {
        position.x += dx / steps;
        position.z += dz / steps;
        for (let p = 0; p < PASSES; p += 1) pushOut(position, radius);
      }
      return position;
    },
  };
}
