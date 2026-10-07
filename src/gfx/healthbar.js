// Les barres de vie (version 2.1) : une petite image de pixels dessinée par le
// code et redessinée quand la jauge change. Deux formes : une barre debout
// qui fait face à la caméra, au-dessus d'une Hallucination ; une barre posée
// à plat sur le sol, sous les pieds du héros, qui ne cache rien de lui. Les
// couleurs viennent de data/palette.js (barColors).
//
// Version 2.8 : une double jauge. La part pleine descend aussitôt sous le
// coup ; derrière elle, une jauge de retard (retard) attend LAG_DELAY
// secondes puis rattrape la première peu à peu : on lit la perte d'un coup
// d'œil. update(dt) fait avancer le retard.

import * as THREE from 'three';
import { createPixelBuffer, hexToRgb, setPixel, toDataTexture } from './pixels.js';

const WIDTH = 32; // pixels de la texture
const HEIGHT = 5;
const UNITS_WIDE = 0.9; // largeur dans le monde, en unités
const UNITS_TALL = UNITS_WIDE * (HEIGHT / WIDTH);
const LAG_DELAY = 0.4; // secondes avant que la jauge de retard ne bouge
const LAG_SPEED = 1.1; // part de la barre rattrapée par seconde

// Dessine la jauge : contour sombre, fond, la jauge de retard, puis la part
// pleine avec un liseré clair sur sa première ligne.
function paint(buffer, ratio, lag, colors) {
  const frame = hexToRgb(colors.cadre);
  const back = hexToRgb(colors.fond);
  const full = hexToRgb(colors.plein);
  const light = hexToRgb(colors.clair);
  const late = hexToRgb(colors.retard ?? '#f2c84b');
  const inner = WIDTH - 2;
  const filled = ratio <= 0 ? 0 : Math.max(1, Math.round(inner * Math.min(1, ratio)));
  const lagged = lag <= 0 ? 0 : Math.max(filled, Math.round(inner * Math.min(1, lag)));
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const edge = x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1;
      let rgb = back;
      if (edge) rgb = frame;
      else if (x - 1 < filled) rgb = y === 1 ? light : full;
      else if (x - 1 < lagged) rgb = late;
      setPixel(buffer, x, y, rgb);
    }
  }
}

// colors : { cadre, fond, plein, clair, retard } ; ground : à plat sur le sol
// (le héros), sinon debout face à la caméra (une Hallucination).
export function createHealthBar(colors, { ground = false } = {}) {
  const buffer = createPixelBuffer(WIDTH, HEIGHT);
  let ratio = 1;
  let lag = 1;
  let wait = 0; // temps avant que le retard ne bouge
  paint(buffer, ratio, lag, colors);
  const texture = toDataTexture(buffer, { repeat: false, mipmaps: false });
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;

  // toDataTexture copie les pixels (retournés) dans la texture : repeindre le
  // tampon ne suffit pas, il faut recopier dans l'image de la texture.
  const refresh = () => {
    paint(buffer, ratio, lag, colors);
    const row = WIDTH * 4;
    for (let y = 0; y < HEIGHT; y += 1) {
      texture.image.data.set(buffer.data.subarray(y * row, (y + 1) * row), (HEIGHT - 1 - y) * row);
    }
    texture.needsUpdate = true;
  };

  let object;
  if (ground) {
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    object = new THREE.Mesh(new THREE.PlaneGeometry(UNITS_WIDE, UNITS_TALL), material);
    object.rotation.x = -Math.PI / 2;
    object.renderOrder = 2;
  } else {
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    object = new THREE.Sprite(material);
    object.scale.set(UNITS_WIDE, UNITS_TALL, 1);
  }
  object.visible = false;

  return {
    object,
    // Part pleine, de 0 à 1 ; la texture n'est refaite que si elle change. Une
    // baisse lance le retard ; une hausse (une fiole) l'aligne aussitôt.
    setRatio(next) {
      const clamped = Math.max(0, Math.min(1, next));
      if (Math.abs(clamped - ratio) < 1e-3) return;
      if (clamped < ratio) wait = LAG_DELAY;
      else lag = Math.max(lag, clamped);
      ratio = clamped;
      refresh();
    },
    // La jauge de retard rattrape la part pleine, après son délai.
    update(dt) {
      if (lag <= ratio + 1e-3) return;
      if (wait > 0) {
        wait -= dt;
        return;
      }
      lag = Math.max(ratio, lag - LAG_SPEED * dt);
      refresh();
    },
    // Tout au plein, sans retard (au réveil).
    reset() {
      ratio = 1;
      lag = 1;
      wait = 0;
      refresh();
    },
    setVisible(on) {
      object.visible = Boolean(on);
    },
    get visible() {
      return object.visible;
    },
    get lag() {
      return lag;
    },
  };
}
