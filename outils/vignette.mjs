// Refait l'image de partage des réseaux sociaux, assets/social-preview.png
// (1200 × 630, lue par LinkedIn et les autres via og:image) : ouvre le jeu en
// mode ?vignette dans un Chrome ou un Edge sans fenêtre, attend que le
// village soit dessiné, et capture la page. Même la vignette est fabriquée
// par le code.
//
// Aucune dépendance : le protocole de débogage du navigateur, parlé avec le
// WebSocket intégré à Node (version 22 ou plus). Un outil du poste, pas du jeu.
//
// Usage, le serveur local lancé (npx -y http-server . -p 8080 -c-1) :
//   node outils/vignette.mjs
// Variables facultatives : NAVIGATEUR (chemin de Chrome ou d'Edge, s'il n'est
// pas trouvé seul), ADRESSE (par défaut http://localhost:8080/).

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WIDTH = 1200;
const HEIGHT = 630;
const DEBUG_PORT = 9333;
const ADDRESS = process.env.ADRESSE ?? 'http://localhost:8080/';
const OUTPUT = new URL('../assets/social-preview.png', import.meta.url);
const SETTLE_FRAMES = 90; // images dessinées avant la capture (lucioles, fumée, flou posés)
const SETTLE_MS = 1500; // le temps que les fondus de l'écran titre finissent
const TIMEOUT_MS = 60000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Chrome ou Edge, aux emplacements habituels de Windows, de macOS et de Linux.
function findBrowser() {
  if (process.env.NAVIGATEUR) return process.env.NAVIGATEUR;
  const candidates = [];
  for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]) {
    if (!base) continue;
    candidates.push(join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    candidates.push(join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  }
  candidates.push(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  );
  return candidates.find((path) => existsSync(path));
}

// Une session du protocole de débogage : send(méthode, paramètres) renvoie
// la réponse du navigateur.
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = nextId++;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close: () => socket.close(),
  };
}

// L'onglet ouvert par le navigateur, dès que son port de débogage répond.
async function pageTarget() {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = targets.find((target) => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // Le navigateur démarre encore.
    }
    await wait(250);
  }
  throw new Error("Le navigateur n'a pas ouvert son port de débogage.");
}

async function evaluate(session, expression) {
  const { result, exceptionDetails } = await session.send('Runtime.evaluate', { expression, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

async function main() {
  const browser = findBrowser();
  if (!browser) throw new Error('Ni Chrome ni Edge trouvé : indiquer son chemin dans la variable NAVIGATEUR.');
  const profile = await mkdtemp(join(tmpdir(), 'elelhem-vignette-'));
  const child = spawn(browser, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--enable-unsafe-swiftshader', // WebGL même sans carte graphique accessible
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    const session = await connect(await pageTarget());
    await session.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
    await session.send('Page.enable');
    await session.send('Page.navigate', { url: `${ADDRESS}?vignette&reset` });

    // Le jeu est prêt quand window.__lia existe et que la police est chargée.
    const deadline = Date.now() + TIMEOUT_MS;
    for (;;) {
      const state = await evaluate(session, `({
        ready: typeof window.__lia === 'object' && document.fonts.status === 'loaded',
        message: document.getElementById('message')?.hidden === false ? document.getElementById('message').textContent : '',
      })`).catch(() => ({ ready: false, message: '' }));
      if (state.message) throw new Error(`Le jeu ne démarre pas : ${state.message}`);
      if (state.ready) break;
      if (Date.now() > deadline) throw new Error("Le jeu ne s'est pas chargé à temps.");
      await wait(250);
    }
    await evaluate(session, `window.__lia.step(${SETTLE_FRAMES}); true`);
    await wait(SETTLE_MS);

    const { data } = await session.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
    });
    await writeFile(OUTPUT, Buffer.from(data, 'base64'));
    console.log(`Vignette écrite : assets/social-preview.png (${Math.round(Buffer.byteLength(data, 'base64') / 1024)} Ko)`);
    await session.send('Browser.close').catch(() => {});
    session.close();
  } finally {
    child.kill();
    await wait(500);
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
