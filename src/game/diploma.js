// Le diplôme d'apprenti mage d'Elelhem : dessiné sur un canvas 2D, au prénom du joueur et à
// la date du jour, avec les huit notions apprises, un sceau de cire et les
// signatures de l'architecte et de la guide, et une mention selon les erreurs.
// On le partage d'un geste depuis un téléphone, on le télécharge en image, et
// on copie le lien du jeu.
//
// Aucune image chargée : le parchemin est un bruit tiré au hasard (avec une
// graine, il est le même à chaque fois), les filets et le sceau sont tracés.
// Les textes viennent de data/dialogues.js, les couleurs de data/palette.js.

import { createRng } from '../gfx/pixels.js';
import { diplomaColors as COLORS } from '../data/palette.js';
import { saveGameState } from './state.js';

const WIDTH = 1600; // proportions d'une feuille A4 en paysage
const HEIGHT = 1130;
const SEED = 1789;
const NAME_MAX = 24;
const COPIED_MS = 2200;
const FILE_DELAY_MS = 250; // attente après une frappe du prénom avant de refaire l'image
// JPEG plutôt que PNG : le grain du parchemin ne se compresse pas en PNG
// (2,8 Mo), il pèse 300 Ko en JPEG, ce qui compte pour un partage depuis
// un téléphone.
const IMAGE_TYPE = 'image/jpeg';
const IMAGE_QUALITY = 0.92;
const FONT = 'Newsreader, Georgia, serif';
const FONTS = ['500 40px Newsreader', '600 40px Newsreader'];

// « rgb(r g b / a) » depuis une couleur hexadécimale de la palette.
function withAlpha(hex, alpha) {
  const value = parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255} / ${alpha})`;
}

function setFont(context, size, { weight = 500, italic = false } = {}) {
  context.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`;
}

// Écrit une ligne centrée (ou alignée), en réduisant la taille si elle
// dépasse maxWidth.
function write(context, text, x, y, { size, weight, italic, color, align = 'center', maxWidth = WIDTH - 260, spacing = 0 }) {
  let fitted = size;
  setFont(context, fitted, { weight, italic });
  context.letterSpacing = `${spacing}px`;
  while (context.measureText(text).width > maxWidth && fitted > 12) {
    fitted -= 2;
    setFont(context, fitted, { weight, italic });
  }
  context.fillStyle = color;
  context.textAlign = align;
  context.fillText(text, x, y);
  context.letterSpacing = '0px';
}

function diamond(context, x, y, radius, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x, y - radius);
  context.lineTo(x + radius, y);
  context.lineTo(x, y + radius);
  context.lineTo(x - radius, y);
  context.closePath();
  context.fill();
}

// Un filet d'or qui s'efface aux deux bouts, un losange au milieu.
function ornament(context, cx, y, halfWidth) {
  const gradient = context.createLinearGradient(cx - halfWidth, 0, cx + halfWidth, 0);
  gradient.addColorStop(0, withAlpha(COLORS.or, 0));
  gradient.addColorStop(0.2, COLORS.or);
  gradient.addColorStop(0.8, COLORS.or);
  gradient.addColorStop(1, withAlpha(COLORS.or, 0));
  context.fillStyle = gradient;
  context.fillRect(cx - halfWidth, y - 1, halfWidth - 18, 2);
  context.fillRect(cx + 18, y - 1, halfWidth - 18, 2);
  diamond(context, cx, y, 8, COLORS.or);
}

// Le parchemin : un dégradé du cœur clair vers les bords tachés, puis des
// taches larges et un grain fin, tirés au hasard à basse définition et
// agrandis en douceur.
function paintParchment(context, rng) {
  const glow = context.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.25, WIDTH / 2, HEIGHT / 2, WIDTH * 0.62);
  glow.addColorStop(0, COLORS.parchemin[2]);
  glow.addColorStop(0.65, COLORS.parchemin[1]);
  glow.addColorStop(1, COLORS.parchemin[0]);
  context.fillStyle = glow;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const layer = (width, height, strength) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const small = canvas.getContext('2d');
    const image = small.createImageData(width, height);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = rng();
      const dark = value < 0.5;
      image.data[i] = dark ? 96 : 255;
      image.data[i + 1] = dark ? 66 : 248;
      image.data[i + 2] = dark ? 34 : 228;
      image.data[i + 3] = Math.abs(value - 0.5) * 2 * strength;
    }
    small.putImageData(image, 0, 0);
    context.imageSmoothingEnabled = true;
    context.drawImage(canvas, 0, 0, WIDTH, HEIGHT);
  };
  layer(32, 23, 50); // taches
  layer(200, 141, 30); // grain
}

function paintFrame(context) {
  context.strokeStyle = COLORS.or;
  context.lineWidth = 4;
  context.strokeRect(46, 46, WIDTH - 92, HEIGHT - 92);
  context.lineWidth = 1.5;
  context.strokeRect(62, 62, WIDTH - 124, HEIGHT - 124);
  for (const [x, y] of [[46, 46], [WIDTH - 46, 46], [46, HEIGHT - 46], [WIDTH - 46, HEIGHT - 46]]) {
    diamond(context, x, y, 14, COLORS.or);
    diamond(context, x, y, 6, COLORS.parchemin[2]);
  }
}

// Le sceau : deux rubans, une goutte de cire au bord irrégulier, un anneau
// gravé et trois lettres en creux.
function paintSeal(context, cx, cy, radius, label, rng) {
  context.fillStyle = COLORS.cire[1];
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(cx + side * 18, cy);
    context.lineTo(cx + side * 62, cy + radius + 30);
    context.lineTo(cx + side * 44, cy + radius + 20);
    context.lineTo(cx + side * 30, cy + radius + 38);
    context.lineTo(cx - side * 14, cy + 10);
    context.closePath();
    context.fill();
  }

  const wax = context.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.1, cx, cy, radius * 1.1);
  wax.addColorStop(0, COLORS.cire[3]);
  wax.addColorStop(0.45, COLORS.cire[2]);
  wax.addColorStop(1, COLORS.cire[0]);
  context.fillStyle = wax;
  context.beginPath();
  const points = 36;
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const r = radius * (1 + (rng() - 0.5) * 0.09);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.fill();

  context.lineWidth = 3;
  context.strokeStyle = COLORS.cire[0];
  context.beginPath();
  context.arc(cx, cy, radius * 0.74, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = withAlpha(COLORS.cire[3], 0.7);
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(cx + 1.5, cy + 1.5, radius * 0.74, 0, Math.PI * 2);
  context.stroke();

  // Lettres en creux : le reflet décalé, puis l'ombre de la gravure.
  write(context, label, cx + 2, cy + radius * 0.2 + 2, { size: radius * 0.52, weight: 600, color: withAlpha(COLORS.cire[3], 0.8), spacing: 3 });
  write(context, label, cx, cy + radius * 0.2, { size: radius * 0.52, weight: 600, color: COLORS.cire[0], spacing: 3 });
  diamond(context, cx, cy - radius * 0.5, 5, COLORS.cire[0]);
  diamond(context, cx, cy + radius * 0.47, 5, COLORS.cire[0]);
}

// Dessine tout le diplôme. data : { prenom, jour (Date), texts, notions,
// mention (texte, vide s'il n'y en a pas) }.
export function drawDiploma(context, { prenom, jour, texts, notions, mention = '' }) {
  const rng = createRng(SEED);
  const cx = WIDTH / 2;
  context.save();
  context.textBaseline = 'alphabetic';
  paintParchment(context, rng);
  paintFrame(context);

  write(context, texts.village.toUpperCase(), cx, 156, { size: 30, weight: 600, color: COLORS.sepia, spacing: 8 });
  write(context, texts.titre, cx, 262, { size: 104, weight: 600, color: COLORS.encre });
  ornament(context, cx, 306, 300);
  write(context, texts.decerne, cx, 376, { size: 36, italic: true, color: COLORS.sepia });

  // Le prénom (ou une ligne pointillée à remplir), puis la mention : avec une
  // mention, le bloc remonte un peu pour lui faire de la place.
  const nameY = mention ? 462 : 478;
  const motifY = mention ? 580 : 560;
  if (prenom) {
    write(context, prenom, cx, nameY, { size: 92, weight: 600, color: COLORS.nom, maxWidth: 1000 });
  } else {
    context.strokeStyle = COLORS.sepia;
    context.lineWidth = 3;
    context.setLineDash([3, 8]);
    context.beginPath();
    context.moveTo(cx - 360, nameY - 8);
    context.lineTo(cx + 360, nameY - 8);
    context.stroke();
    context.setLineDash([]);
  }

  if (mention) write(context, mention, cx, 526, { size: 36, italic: true, weight: 600, color: COLORS.nom });
  write(context, texts.motif, cx, motifY, { size: 32, color: COLORS.encre });

  // Les notions, sur deux colonnes, précédées d'un losange.
  const list = Object.values(notions);
  const rows = Math.ceil(list.length / 2);
  list.forEach((notion, i) => {
    const column = Math.floor(i / rows);
    const x = column === 0 ? 410 : 890;
    const y = motifY + 70 + (i % rows) * 50;
    diamond(context, x - 22, y - 10, 6, COLORS.or);
    write(context, notion, x, y, { size: 31, color: COLORS.encre, align: 'left', maxWidth: 440 });
  });

  // Date à gauche, sceau au milieu, signatures à droite.
  write(context, texts.date(jour), 150, 912, { size: 28, italic: true, color: COLORS.sepia, align: 'left', maxWidth: 520 });
  paintSeal(context, cx, 870, 78, texts.sceau, rng);
  texts.signatures.forEach(({ nom, role }, i) => {
    const x = 1110 + i * 250;
    write(context, nom, x, 888, { size: 46, weight: 600, italic: true, color: COLORS.encre, maxWidth: 220 });
    context.fillStyle = COLORS.or;
    context.fillRect(x - 95, 904, 190, 1.5);
    write(context, role, x, 936, { size: 24, color: COLORS.sepia, spacing: 2, maxWidth: 220 });
  });

  write(context, `${texts.pied}  ·  ${texts.site}`, cx, 1008, { size: 23, color: COLORS.sepia });
  write(context, texts.jeu.replace('https://', '').replace(/\/$/, ''), cx, 1042, { size: 23, weight: 600, color: COLORS.or });
  context.restore();
}

// Le navigateur sait-il partager un fichier image (Web Share) ? Vrai sur la
// plupart des téléphones, faux sur beaucoup d'ordinateurs.
function canShareFiles() {
  try {
    const probe = new File([new Uint8Array(1)], 'essai.jpg', { type: IMAGE_TYPE });
    return Boolean(navigator.canShare?.({ files: [probe] }));
  } catch {
    return false;
  }
}

// Copie du texte dans le presse-papiers, avec un repli pour les navigateurs
// qui n'ont pas l'API moderne (ou une page hors contexte sécurisé).
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(field);
    field.select();
    let done = false;
    try {
      done = document.execCommand('copy');
    } catch {
      done = false;
    }
    field.remove();
    return done;
  }
}

// root : #diplome ; texts : textesInterface.diplome ; notions : identifiant ->
// notion ; state : l'état de partie (le prénom tapé ici y est enregistré).
export function createDiploma(root, { texts, notions, state }) {
  const canvas = root.querySelector('.diplome-toile');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  root.querySelector('.diplome-prenom span').textContent = texts.champ;
  const input = root.querySelector('.diplome-prenom input');
  input.maxLength = NAME_MAX;
  const share = root.querySelector('.diplome-partager');
  const download = root.querySelector('.diplome-telecharger');
  const copy = root.querySelector('.diplome-copier');
  const close = root.querySelector('.diplome-fermer');
  share.textContent = texts.partager;
  download.textContent = texts.telecharger;
  copy.textContent = texts.copier;
  close.textContent = texts.fermer;

  // Partager en un geste : la feuille de partage du téléphone, avec l'image.
  // Seulement si le navigateur sait partager un fichier ; sinon on garde
  // Télécharger et Copier le lien.
  const canShare = canShareFiles();
  share.hidden = !canShare;
  (canShare ? share : download).classList.add('principal');

  let open = false;
  let afterClose = null; // la suite, une fois le diplôme refermé (le générique)
  let jour = new Date();
  let copiedTimer = 0;
  let file = null; // l'image prête à partager, refaite après chaque dessin
  let fileTimer = 0;
  const fontsReady = Promise.all(FONTS.map((font) => document.fonts?.load(font).catch(() => {})));

  const name = () => input.value.trim().slice(0, NAME_MAX);

  // Mauvaises réponses de toute la partie : elles décident de la mention.
  const mistakes = () => [...state.erreurs.values()].reduce((sum, n) => sum + n, 0);

  // L'image du diplôme en fichier, prête avant le toucher : Safari n'ouvre la
  // feuille de partage que dans le geste lui-même, sans attente.
  function makeFile() {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob ? new File([blob], texts.fichier, { type: IMAGE_TYPE }) : null), IMAGE_TYPE, IMAGE_QUALITY);
    });
  }

  function draw() {
    drawDiploma(context, { prenom: name(), jour, texts, notions, mention: texts.mention(mistakes()) });
    canvas.setAttribute('aria-label', texts.alt(name()));
    file = null;
    if (!canShare) return;
    clearTimeout(fileTimer);
    fileTimer = setTimeout(async () => {
      file = await makeFile();
    }, FILE_DELAY_MS);
  }

  function hide() {
    if (!open) return;
    open = false;
    // Le focus quitte le diplôme : les touches reviennent au jeu.
    if (root.contains(document.activeElement)) document.activeElement.blur();
    root.hidden = true;
    const next = afterClose;
    afterClose = null;
    next?.();
  }

  input.addEventListener('input', () => {
    state.prenom = name();
    saveGameState(state);
    draw();
  });

  share.addEventListener('click', async () => {
    const shared = file ?? (await makeFile());
    if (!shared) return;
    try {
      await navigator.share({ files: [shared], title: texts.partage.titre, text: texts.partage.texte });
    } catch {
      // Partage annulé, ou refusé : rien à faire, les autres boutons restent là.
    }
  });

  download.addEventListener('click', () => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = texts.fichier;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, IMAGE_TYPE, IMAGE_QUALITY);
  });

  // Si le navigateur refuse la copie, le bouton montre l'adresse : on peut
  // toujours la recopier à la main.
  copy.addEventListener('click', async () => {
    const copied = await copyText(texts.jeu);
    copy.textContent = copied ? texts.copie : texts.jeu.replace('https://', '');
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copy.textContent = texts.copier;
    }, copied ? COPIED_MS : COPIED_MS * 4);
  });

  close.addEventListener('click', hide);
  // Un clic sur le fond (hors du cadre) ferme aussi.
  root.addEventListener('click', (event) => {
    if (event.target === root) hide();
  });
  window.addEventListener('keydown', (event) => {
    if (open && event.code === 'Escape') {
      event.preventDefault();
      hide();
    }
  });

  return {
    get isOpen() {
      return open;
    },
    // then : appelé quand on le referme (le générique, la première fois).
    async open(then = null) {
      afterClose = then;
      jour = new Date();
      input.value = state.prenom;
      open = true;
      root.hidden = false;
      draw();
      await fontsReady;
      if (open) draw(); // la police est là : on redessine avec elle
      // Le focus sur un bouton, pas sur le champ : sur téléphone, le clavier
      // ne s'ouvre pas tout seul.
      if (open && window.matchMedia?.('(hover: hover)').matches) (canShare ? share : download).focus({ preventScroll: true });
    },
    close: hide,
    // Pour les tests : l'image téléchargée, en data URL.
    toDataURL: () => canvas.toDataURL(IMAGE_TYPE, IMAGE_QUALITY),
  };
}
