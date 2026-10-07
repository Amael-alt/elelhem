# CLAUDE.md

Règles de ce dépôt pour Claude Code, valables dans chaque session ouverte ici.

## Ce qu'est ce dépôt

« The Legend of Elelhem : La Magie de Lia » (titre d'origine : « Le Village de LIA ») : un petit RPG HD-2D jouable dans le navigateur, dans le village d'Elelhem, où la magie LIA (l'IA) s'apprend auprès des maîtres du village. Chaque maître transpose une notion d'IA en univers médiéval fantastique. C'est une ressource de formation et une démonstration de ce que Claude Code sait construire, partagée surtout sur téléphone.

- Dépôt **public** : https://github.com/Amael-alt/elelhem (nommé `village-de-lia` jusqu'au 6 octobre 2026 ; GitHub Pages ne redirige pas l'ancienne adresse)
- Jeu en ligne (GitHub Pages, branche `main`, racine) : https://amael-alt.github.io/elelhem/
- Le plan de construction vit hors du dépôt, dans l'espace de travail privé de l'auteur, parce qu'il cite des chemins locaux. Le prompt de chaque session de construction donne son emplacement. Ne jamais le copier ici, ni en citer le chemin.
- Journal public : `docs/construction.md`, une entrée par étape (ce qui a été fait, ce qui a résisté, les mesures). L'état du chantier, la méthode pour fabriquer un sprite et ce qui vient ensuite : `docs/suite.md`, à mettre à jour à chaque version publiée.

## Écriture

- Tout en français : textes du jeu, commentaires, documentation, messages de commit.
- **Aucun tiret long ni demi-cadratin** (caractères U+2014 et U+2013), nulle part, messages de commit compris. Virgules, deux-points ou points.
- Le joueur n'a pas de genre connu : textes neutres, aucun adjectif accordé au joueur. On le tutoie.
- Identifiants de code en anglais, comme l'API de three.js. Commentaires en français. Les clés du fichier de dialogues sont en français et leur format, une fois gelé (étape 1e), ne bouge plus.

## Ce que la page a le droit de charger

- **Le décor et les personnages sont générés par le code** : textures, planches de sprites (grilles de `src/data/sprites/`), ciel, effets et diplôme. La page ne charge que quatre sortes d'images : les **ornements de l'interface** (`assets/ui/` : coins, filets, icônes, cadres étirables, plaques, gemmes, dessins générés puis détourés par `node outils/detourer.mjs`, découpés par `node outils/decouper.mjs` ou allégés en PNG à palette par `node outils/portrait.mjs`) ; l'**illustration de l'écran titre** (`assets/ui/titre.webp` depuis la version 2.6 : le voyageur qui tend la main vers la flamme de la magie LIA, la flamme du logo Maintenant Vous Savez redessinée en lumière, et le titre peint ; le menu, le prénom et la signature sont du HTML posé sur l'image) ; les **portraits de dialogue** (`assets/portraits/`, un PNG à palette par habitant qui parle, demandés seulement après le lancement du jeu), illustrés avec Higgsfield d'après la description du personnage puis cadrés par `node outils/portrait.mjs` ; la **carte illustrée** (`assets/ui/carte.png`, version 2.3 : le plan exact de la grille rendu par `node outils/plan.mjs`, repeint en parchemin par le générateur d'images avec ce plan pour référence, puis réduit en PNG à palette par `node outils/reduire.mjs` ; demandée à la première apparition de la minimap, le jeu lancé) ; et la vignette de partage `assets/social-preview.png`, lue par les réseaux sociaux via `og:image` mais jamais par la page. Les fiches pixel art qui ont servi aux sprites (vues nues, et pour le héros l'épée à la main et les six poses de coup) ne sont pas dans le dépôt : elles sont transcrites en grilles par `node outils/transcrire-sprite.mjs` (avec `--reference`, `--repere` et `--fiche-reference` pour une pose d'un personnage déjà transcrit), puis retouchées à la main. Portraits, illustration et fiches viennent d'un générateur d'images, d'après les descriptions de l'auteur. Règle de style des prompts : décrire les traits (dessin anime, aquarelle douce, encrage fin), jamais citer un studio ni un jeu. La vignette se refait avec `node outils/vignette.mjs` (l'écran titre en mode `?vignette`, capturé en 1200 × 630), jamais à la main.
- Une seule police OFL en `woff2` dans `assets/fonts/`, avec sa licence. Le favicon est un SVG en data URI, pas un fichier.
- Les balises `og:url`, `og:image` et `canonical` de `index.html`, et l'adresse du jeu dans `src/data/dialogues.js`, portent l'adresse complète : à changer ensemble si le dépôt change de nom.
- **Une musique de fond**, `assets/audio/village-bell.mp3` (composée par Jordan avec Suno, réencodée à 96 kb/s, sans métadonnées ni pochette, silences de bout retirés pour une boucle sans trou). Elle n'est demandée qu'au lancement du jeu, par le geste qui ferme l'écran titre (`preload="none"`), jamais au chargement de la page. 
- À chaque vérification, la liste des requêtes réseau ne doit montrer, avant le lancement, que du HTML, du CSS, du JavaScript, la police, l'illustration du titre et les ornements de l'écran titre (plaque, filet) ; la musique, les autres ornements et les portraits s'y ajoutent seulement après le lancement.

## Dépendance unique : three.js

- three.js est la **seule** dépendance, vendue dans `vendor/three/` avec sa `LICENSE`, appelée par la carte d'import de `index.html` sous le nom `three`. Toujours `from 'three'`, jamais un chemin vers `vendor/`.
- Pas de `package.json`, pas de `node_modules`, pas de bundler, pas d'étape de build : GitHub Pages sert les fichiers tels quels et un stagiaire lit le code en ligne.
- Aucun addon de `examples/jsm` (ni `EffectComposer`, ni `OrbitControls`) : ce qu'il faut, on l'écrit ici.
- Le paquet officiel de la r186 n'a plus de version minifiée. Les deux `.min.js` de `vendor/three/` sont minifiés ici avec esbuild, sans autre retouche que le chemin d'import de `three.core`. Version et commande de mise à jour : section « three.js » du README.
- `npx` ne sert qu'aux outils du poste (serveur local, minification), jamais à une dépendance du jeu.
- `outils/` : scripts Node du poste, sans dépendance, que la page ne charge jamais (`vignette.mjs`). Aucun chemin de disque écrit en dur : ils cherchent ce qu'il leur faut par les variables d'environnement.

## Inspirations : on regarde, on ne copie pas

Trois démos publiques servent de référence : `Legerdo/hd2d-diorama` pour le rendu, `unclebill-spec/hd2d-suite` pour les contrôles tactiles, et `stubborn-hug/lumina` (la démo « Emberfall », sur GitLab) pour la direction artistique et l'interface, depuis l'étape 2b. **Elles n'ont pas de licence** (Lumina se dit « for reference only »), leur code n'est donc pas réutilisable. On s'en inspire pour les techniques et les ordres de grandeur, déjà relevés dans le plan. Pendant la construction, on compare des captures, pas du code : ne pas ouvrir leurs sources, et ne reprendre aucune ligne, aucune structure de shader, aucun nom de fonction. Tout le code de ce dépôt est écrit ici.

## Licence : tous droits réservés

- Depuis le 7 octobre 2026 (après la version 2.10.3), tout le dépôt est sous `LICENSE` « tous droits réservés » : jouer, partager le lien et montrer des captures sont permis ; copier, adapter ou réutiliser, même gratuitement ou en formation, ne l'est pas. Seuls three.js (MIT, `vendor/three/LICENSE`) et EB Garamond (OFL, `assets/fonts/OFL.txt`) gardent leur licence. Ne jamais réintroduire de mention « licence MIT » pour le contenu du jeu.

## Vie privée : le dépôt est public

- Rien de personnel : aucun chemin local, aucun nom d'utilisateur du poste, aucune adresse e-mail personnelle, aucun nom de client, d'organisme ou de stagiaire. Seuls restent la signature « Jordan Goussery, formateur et consultant IA à Bayonne », le lien https://maintenant-vous-savez.com, et la flamme MVS de l'écran titre avec ses crédits.
- Les motifs à bloquer sont listés dans `.motifs-interdits`, un fichier **local** ignoré par git : les écrire ici les publierait. Le compléter dès qu'un nouveau motif apparaît.
- Les crochets `.githooks/pre-commit` et `.githooks/commit-msg` refusent un commit qui ferait entrer un tiret long, un chemin de disque ou un de ces motifs, ou qui serait signé par une autre adresse que l'adresse anonyme. Ils s'activent une fois par clonage avec `git config core.hooksPath .githooks`.
- Les captures de vérification restent hors du dépôt (scratchpad ou dossiers ignorés).

## Git

- Identité **locale** au dépôt : `Amael-alt`, adresse `310769219+Amael-alt@users.noreply.github.com`. L'identité globale du poste ne signe jamais un commit d'ici. Vérifier `git config user.email` avant de committer ; `git log --format=%ae | sort -u` ne montre que l'adresse anonyme.
- Commits courts, en français, découpés par sujet, qui disent le pourquoi. Jamais `--no-verify`, jamais `--force`.
- On pousse à la fin de chaque sous-étape : la carte d'import, les chemins relatifs sous `/elelhem/` et les types MIME se vérifient en production, et les tests sur téléphone se font sur l'URL publique.

## Modules

- Modules ES natifs. Un fichier, une responsabilité, rangé selon l'arborescence du README : `core/` (rendu, caméra, entrées), `gfx/` (pixels, textures, matériaux, sprites, post-traitement, effets), `world/` (carte, terrain, bâtiments, collisions), `game/` (joueur, habitants, dialogues, quête, interface, débogage), `data/` (palette, personnages, dialogues).
- Noms de fichiers : jamais un nom que les bloqueurs de publicités visent sur github.io. La liste « Badware risks » d'uBlock, active par défaut dans Brave, bloque notamment `fullscreen.js`, `before.js`, `esc.js`, `flscn.js` et `media/beep.mp3` (version 2.10.2 : un `fullscreen.js` empêchait le jeu de démarrer). Éviter aussi `ads`, `banner-ad`, `tracking`, `analytics`, `pixel.gif` dans un chemin.
- Exports nommés uniquement, pas d'`export default`. Imports relatifs avec l'extension `.js`.
- Aucun effet de bord à l'import : un module exporte des fonctions (`createXxx(...)`) ou des données. Seul `src/main.js` démarre quelque chose.
- Aucune variable globale, sauf `window.__lia`, créé par `game/debug.js` pour les tests.
- Les textes du jeu vivent uniquement dans `src/data/dialogues.js`, les habitants dans `src/data/characters.js`, les couleurs dans `src/data/palette.js`. Le moteur n'écrit aucune phrase et ne choisit aucune couleur en dur.
- Les shaders sont des chaînes GLSL dans le module qui les utilise, commentées en français.
- Le code est lu par des stagiaires : un en-tête de deux ou trois lignes par fichier qui dit ce qu'il fait, des commentaires qui expliquent le pourquoi, et les valeurs réglables en constantes nommées en tête de module.

## Vérification, à chaque sous-étape et avant de pousser

1. Navigateur intégré : `preview_start` sur la configuration `village` (`.claude/launch.json`, `npx -y http-server . -a 127.0.0.1 --no-dotfiles -c-1`, qui lit le port dans la variable `PORT` : boucle locale seulement, fichiers cachés non servis, `.motifs-interdits` compris). Recharger, lire la console et les requêtes réseau : zéro erreur, aucune image hors de la flamme avant le lancement, puis les portraits.
2. Captures au même endroit (grâce à `window.__lia`, dès qu'il existe) : bureau, préréglage mobile 375×812, paysage 812×375. Remettre le préréglage bureau à la fin.
3. Mesures avec `?debug` : images/s, appels de dessin, triangles, ratio de pixels. Dès l'étape 1c, vues `?nofx` et `?view=raw|coc|bloom`. Si le panneau du navigateur intégré est masqué, les images ne tournent pas et les images/s ne veulent rien dire : le noter plutôt que de les recopier.
4. Grille de comparaison et chiffres notés dans `docs/construction.md`.
5. Hygiène : `git grep -nP "[\x{2013}\x{2014}]" -- . ":!vendor"` vide, crochets passés, `git log --format=%ae | sort -u` anonyme.
6. Après le push, l'URL publique répond et le jeu s'y lance sans erreur (Pages met une à deux minutes à se mettre à jour).
