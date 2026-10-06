# The Legend of Elelhem : La Magie de Lia

Un petit RPG en HD-2D, jouable dans le navigateur. À Elelhem, tout le monde parle de la magie LIA, celle qui répond à tout : pour devenir apprenti mage, il faut rassembler les parchemins des maîtres du village. Chaque maître transpose une notion d'intelligence artificielle en univers médiéval fantastique : le forgeron forge des incantations (des prompts), la bibliothécaire veille sur le contexte, l'apothicaire se méfie des potions trop belles pour être vraies, et l'Oracle Gépété répond à tout, parfois à tort.

**Jouer : https://amael-alt.github.io/elelhem/**, sur téléphone ou sur ordinateur, en une dizaine de minutes.

**Aucune image n'est chargée par le jeu**, hors la flamme du logo sur l'écran titre : textures, personnages, ciel, intérieurs et effets de lumière sont générés par le code au chargement de la page.

Version 1.0, du 6 octobre 2026.

## Le jeu

La partie commence dans la maison du héros, où Claudette, sa sœur, lui confie la quête. Le village se parcourt à l'heure dorée : place au puits, forge, bibliothèque, apothicairerie, colombier, porte de la muraille, auberge, chantier, tour de l'architecte, rivière et pont. On entre dans la maison, l'auberge et la forge. Huit maîtres enseignent chacun une notion, posent une question à trois choix et remettent un parchemin ; chaque leçon est facultative et se relit dans le grimoire. Les huit parchemins réunis, Clodomir, l'architecte, remet un diplôme d'apprenti mage, avec une mention selon les erreurs, à partager ou à télécharger, puis vient le générique. Une minimap montre qui attend encore, et les Tokens gagnés en chemin s'échangent contre des tenues chez Berthe.

- **Au clavier** : ZQSD, WASD ou flèches pour marcher, Maj pour courir, molette pour le zoom, E, Entrée ou Espace pour parler, flèches ou chiffres 1, 2, 3 pour répondre, G pour le grimoire, C pour la carte, M pour couper la musique.
- **Au doigt** : un joystick apparaît sous le pouce dans le bas de l'écran (poussé à fond, on court), un bouton d'action parle à l'habitant à portée, deux doigts pincent pour zoomer. L'écran titre permet de passer le joystick à droite pour jouer de la main gauche.

## Les coulisses

- **Mesurer** : ajouter `?debug` à l'adresse pour afficher les images par seconde et le coût du rendu.
- **Revoir l'accueil** : la partie est sauvegardée dans le navigateur ; `?reset` repart de zéro, `?autostart` saute l'écran titre.
- **Voir l'envers du décor** : `?nofx` montre le village sans post-traitement, `?view=coc` la carte du flou (net en noir, lointain en bleu, premier plan en orange), `?view=bloom` le halo seul, `?view=raw` la scène nette avant flou et halo, `?vignette` l'écran titre recomposé pour l'image de partage.
- **Lire le récit de la construction** : [`docs/construction.md`](docs/construction.md), une entrée par étape, avec ses mesures.

## Lancer en local

Les modules JavaScript ne se chargent pas depuis un fichier ouvert directement : il faut un petit serveur statique. Avec Node.js installé :

```bash
npx -y http-server . -p 8080 -c-1
```

Puis ouvrir http://localhost:8080 (ou http://localhost:8080/?debug).

## Comment c'est construit

- **Aucun outil de build.** Des modules ES natifs, une carte d'import dans `index.html`, et GitHub Pages sert les fichiers tels quels. Le code se lit directement en ligne.
- **Une seule dépendance** : three.js, copiée dans `vendor/three/`.
- **Tout est écrit pour ce jeu** : post-traitement, génération des textures et des personnages, effets. Aucun addon, aucune bibliothèque de plus.

Arborescence :

```
index.html        page unique : carte d'import, balises de partage, conteneurs de l'interface
styles.css        interface par-dessus le canvas
vendor/three/     three.js, avec sa licence
src/main.js       démarrage, boucle, redimensionnement
src/core/         rendu, caméra, entrées (clavier, joystick, pincement), garde-fous tactiles
src/gfx/          pixels, textures, matériaux, sprites, post-traitement, effets
src/world/        carte, implantation (layout), terrain, maisons, tours, chantier, collisions
src/game/         joueur, habitants, dialogues, quête, interface, débogage
src/data/         palette, habitants, textes des dialogues
docs/             journal de construction
outils/           outils du poste, hors du jeu : vignette.mjs refait l'image de partage
```

## Comment ce village a été construit

Tout le code de ce dépôt a été écrit par Claude Code, les 5 et 6 octobre 2026, à partir d'un plan préparé avant la première ligne : le rendu visé, chiffré, les étapes, et la façon de vérifier chacune. Jordan Goussery a tenu le plan, tranché à chaque étape (direction artistique, histoire, commandes) et relu chaque texte du jeu. Chaque étape a été vérifiée dans un navigateur, mesurée, puis publiée. Le récit détaillé, avec les mesures, est dans [`docs/construction.md`](docs/construction.md).

| Étape | Ce qu'elle a apporté |
|---|---|
| 0 | le socle : dépôt, three.js, page minimale, publication sur GitHub Pages |
| 1a à 1f | l'effet maquette : textures et héros générés, lumière dorée, flou de profondeur, halos, lucioles et rayons de soleil, réglages de performance |
| 2 | le village complet et ses habitants |
| 2b à 2e | la direction artistique refaite d'après une démo de référence (arbres, herbe, toits, écran titre), puis la musique, les personnages redessinés et les sons d'ambiance |
| 3 et 3b | la quête : huit leçons, questions à trois choix, parchemins, grimoire, diplôme à partager |
| 3c | l'histoire : Elelhem, Claudette, l'Oracle Gépété, les intérieurs, la minimap, les Tokens |
| 4 | le tactile : joystick, course, pincement, bouton d'action, main gauche, paysage |
| 5 | les finitions : générique de fin, favicon, image de partage |
| 6 | la version 1.0 : vérification sur l'adresse publique, étiquette `v1.0` |
| 1.1 | les personnages redessinés en 32 × 48 pixels, trois têtes, visage et marche à six images ; les tenues de la boutique changent la silhouette |

**Ce que le code fabrique** : les textures (des pixels posés dans des palettes de quelques tons, avec un tramage), les personnages (un générateur qui calcule la silhouette, la marche et les quatre directions, puis habille chacun), le village (une grille de caractères), le ciel, la lumière et les effets (des shaders), les sons d'ambiance (Web Audio : rivière, cascade, oiseaux, feu, marteau, pas), le diplôme et la minimap (un canvas 2D), le favicon (un SVG écrit dans la page) et l'image de partage (`outils/vignette.mjs`).

**Ce qui ne l'est pas** : la flamme du logo Maintenant Vous Savez, la musique, la police Newsreader et three.js.

**Ce qui a résisté** :

- **La lumière.** Avec les valeurs du plan, l'herbe au soleil sortait terne : il a fallu un soleil presque deux fois plus fort, puis une épaule douce dans l'étalonnage pour ne pas blanchir les tuiles.
- **La direction artistique**, refaite une fois en cours de route d'après une démo plus riche, et les personnages redessinés.
- **Le diplôme** pesait 2,8 Mo en PNG : le grain du parchemin ne se compresse pas. Il est enregistré en JPEG.
- **Les pièces noires** : la passe qui dessine les personnages effaçait l'image composée juste avant.
- **Le héros la tête en bas** après son premier achat de tenue.
- **Un second doigt ne fait pas de « click »** sur téléphone : avec le pouce sur le joystick, les boutons ne répondaient plus. Ils écoutent maintenant chaque doigt.

**Poids** : la page charge 77 fichiers, 1,4 Mo, dont 530 Ko réellement transférés une fois compressés par GitHub Pages (mesure du 6 octobre 2026). La musique (2,6 Mo) n'est demandée qu'au lancement de la partie.

## Refaire l'image de partage

`assets/social-preview.png` (1200 × 630) est l'écran titre en mode `?vignette`, capturé dans un Chrome ou un Edge sans fenêtre, sans aucune dépendance. Le serveur local lancé :

```bash
node outils/vignette.mjs
```

## three.js

Version **0.186.1** (r186), licence MIT, fichiers `three.module.min.js` et `three.core.min.js` dans `vendor/three/`.

Le paquet officiel de cette version n'inclut plus de fichiers minifiés. Ils ont été produits une fois avec esbuild 0.28.2, sans autre modification que le chemin d'import vers `three.core` :

```bash
npm pack three@0.186.1
tar -xzf three-0.186.1.tgz
npx -y esbuild package/build/three.core.js --minify --format=esm --outfile=vendor/three/three.core.min.js
npx -y esbuild package/build/three.module.js --minify --format=esm --outfile=vendor/three/three.module.min.js
sed -i 's#from"\./three\.core\.js"#from"./three.core.min.js"#g' vendor/three/three.module.min.js
cp package/LICENSE vendor/three/LICENSE
```

Résultat : 766 Ko au lieu de 2,1 Mo, environ 200 Ko une fois compressés par le serveur.

## Crédits

Conçu et construit par Jordan Goussery, formateur et consultant IA à Bayonne, avec Claude Code.
https://maintenant-vous-savez.com

three.js : © three.js authors, licence MIT.

Musique : « The Village Bell », composée par Jordan Goussery avec Suno. Exclue de la licence MIT.

Police Newsreader : © The Newsreader Project Authors, licence SIL Open Font 1.1, voir [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt).

## Licence

Code et textes sous licence MIT, voir [`LICENSE`](LICENSE). Le logo Maintenant Vous Savez, la flamme de l'écran titre, en est exclu : tous droits réservés.
