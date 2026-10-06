// La minimap, en haut à droite : le village vu d'en haut, le héros en flèche,
// les habitants en points (dorés tant que leur parchemin reste à gagner). Un
// toucher, ou la touche C, ouvre la carte en grand, avec le nom des quartiers.
// Dessinée en canvas 2D depuis la grille de world/map.js : aucune image.

import { mapColors as COLORS } from '../data/palette.js';

const CELL = 8; // pixels par case dans le plan de référence (dessiné une fois)
const REFRESH_SECONDS = 0.1; // les repères se redessinent dix fois par seconde
const TOGGLE_KEY = 'KeyC';
const LABEL_SIZE = 15; // taille des noms de quartier sur la carte, en pixels CSS
// Pointe de la flèche du héros selon son regard (vers le haut de l'écran = nord).
const HEADINGS = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };

// Le plan de référence : cases, toits des bâtiments, couronnes des arbres.
function paintPlan(map, trees) {
  const canvas = document.createElement('canvas');
  canvas.width = map.width * CELL;
  canvas.height = map.depth * CELL;
  const context = canvas.getContext('2d');
  for (let z = 0; z < map.depth; z += 1) {
    for (let x = 0; x < map.width; x += 1) {
      context.fillStyle = map.isBuilt(x, z) ? COLORS.toit : COLORS.cases[map.charAt(x, z)] ?? COLORS.fond;
      context.fillRect(x * CELL, z * CELL, CELL, CELL);
    }
  }
  // Le bord des toits : un liseré sombre là où une case bâtie touche une case libre.
  context.fillStyle = COLORS.toitBord;
  for (let z = 0; z < map.depth; z += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (!map.isBuilt(x, z)) continue;
      if (!map.isBuilt(x, z - 1)) context.fillRect(x * CELL, z * CELL, CELL, 1.5);
      if (!map.isBuilt(x, z + 1)) context.fillRect(x * CELL, (z + 1) * CELL - 2.5, CELL, 2.5);
      if (!map.isBuilt(x - 1, z)) context.fillRect(x * CELL, z * CELL, 1.5, CELL);
      if (!map.isBuilt(x + 1, z)) context.fillRect((x + 1) * CELL - 1.5, z * CELL, 1.5, CELL);
    }
  }
  context.fillStyle = COLORS.arbre;
  for (const [x, z, size = 1] of trees) {
    context.beginPath();
    context.arc(x * CELL, z * CELL, CELL * 0.75 * size, 0, Math.PI * 2);
    context.fill();
  }
  return canvas;
}

// Prépare un canvas à la taille affichée, en tenant compte de la densité de
// pixels de l'écran. Renvoie l'échelle (pixels de canvas par case).
function fit(canvas, map) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { scale: width / map.width, ratio };
}

function dot(context, x, y, radius, fill) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();
  context.lineWidth = Math.max(1, radius * 0.4);
  context.strokeStyle = COLORS.contour;
  context.stroke();
}

function arrow(context, x, y, size, angle) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.beginPath();
  context.moveTo(size, 0);
  context.lineTo(-size * 0.7, size * 0.75);
  context.lineTo(-size * 0.35, 0);
  context.lineTo(-size * 0.7, -size * 0.75);
  context.closePath();
  context.fillStyle = COLORS.heros;
  context.fill();
  context.lineWidth = Math.max(1, size * 0.25);
  context.strokeStyle = COLORS.contour;
  context.stroke();
  context.restore();
}

// small : le bouton #minimap (son canvas dedans) ; overlay : #carte ; map :
// la grille du village ; trees : TREES de world/layout.js ; regions et names :
// les quartiers et leurs noms ; player : { position, facing } ; markers() :
// les repères à dessiner, [{ x, z, kind }] en coordonnées du village, kind
// valant 'guide', 'quete' ou 'fait' ;
// labels : textesInterface.carte ; canOpen() : faux tant que la carte ne peut
// pas s'ouvrir (écran titre, conversation).
export function createMinimap(small, overlay, { map, trees, regions, names, player, markers, labels, canOpen }) {
  const plan = paintPlan(map, trees);
  const smallCanvas = small.querySelector('canvas');
  const bigCanvas = overlay.querySelector('.carte-toile');
  small.setAttribute('aria-label', labels.ouvrir);
  overlay.querySelector('.carte-titre').textContent = labels.titre;
  const close = overlay.querySelector('.carte-fermer');
  close.textContent = labels.fermer;
  const legend = overlay.querySelector('.carte-legende');
  legend.replaceChildren(...['heros', 'guide', 'quete', 'fait'].map((kind) => {
    const item = document.createElement('li');
    item.dataset.repere = kind;
    item.textContent = labels.legende[kind];
    return item;
  }));

  let visible = false;
  let open = false;
  let elapsed = REFRESH_SECONDS;

  // Le plan, les repères des habitants, puis le héros par-dessus.
  function draw(canvas, big) {
    const { scale, ratio } = fit(canvas, map);
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = !big; // en grand, des cases nettes
    context.drawImage(plan, 0, 0, canvas.width, canvas.height);
    if (big) {
      context.font = `600 ${Math.round(LABEL_SIZE * ratio)}px Newsreader, Georgia, serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.lineJoin = 'round';
      for (const { id, rect: [x0, z0, x1, z1] } of regions) {
        const text = names[id];
        if (!text) continue;
        // Le nom au centre du quartier, sans déborder du bord de la carte.
        const half = context.measureText(text).width / 2 + 4 * ratio;
        const cx = Math.min(Math.max(((x0 + x1) / 2) * scale, half), canvas.width - half);
        const cy = ((z0 + z1) / 2) * scale;
        context.lineWidth = 4 * ratio;
        context.strokeStyle = COLORS.contour;
        context.strokeText(text, cx, cy);
        context.fillStyle = COLORS.heros;
        context.fillText(text, cx, cy);
      }
    }
    const radius = Math.max(2.5 * ratio, scale * (big ? 0.42 : 0.55));
    for (const { x, z, kind } of markers()) dot(context, x * scale, z * scale, radius, COLORS[kind]);
    arrow(context, player.position.x * scale, player.position.z * scale, radius * 1.6, HEADINGS[player.facing] ?? 0);
  }

  function hide() {
    if (!open) return;
    open = false;
    if (overlay.contains(document.activeElement)) document.activeElement.blur();
    overlay.hidden = true;
  }

  function show() {
    open = true;
    overlay.hidden = false;
    draw(bigCanvas, true);
  }

  small.addEventListener('click', () => {
    small.blur(); // Espace et Entrée reviennent au jeu
    if (canOpen()) show();
  });
  close.addEventListener('click', hide);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) hide();
  });
  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.target instanceof HTMLInputElement) return;
    if (open && (event.code === 'Escape' || event.code === TOGGLE_KEY)) {
      event.preventDefault();
      hide();
    } else if (!open && event.code === TOGGLE_KEY && visible && canOpen()) {
      event.preventDefault();
      show();
    }
  });

  return {
    get isOpen() {
      return open;
    },
    // Montrée en jeu, cachée sur l'écran titre (et, plus tard, dans les intérieurs).
    setVisible(on) {
      visible = on;
      small.hidden = !on;
      if (!on) hide();
    },
    open: show,
    close: hide,
    update(dt) {
      elapsed += dt;
      if (elapsed < REFRESH_SECONDS) return;
      elapsed = 0;
      if (visible) draw(smallCanvas, false);
      if (open) draw(bigCanvas, true);
    },
  };
}
