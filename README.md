# The Legend of Elelhem : La Magie de Lia

Un petit RPG en HD-2D, jouable dans le navigateur. À Elelhem, tout le monde parle de la magie LIA, celle qui répond à tout : pour devenir apprenti mage, il faut rassembler les parchemins des maîtres du village. Chaque maître transpose une notion d'intelligence artificielle en univers médiéval fantastique : le forgeron forge des incantations (des prompts), la bibliothécaire veille sur le contexte, l'apothicaire se méfie des potions trop belles pour être vraies, et l'Oracle Gépété répond à tout, parfois à tort.

**Jouer : https://amael-alt.github.io/elelhem/**, sur téléphone ou sur ordinateur, en une dizaine de minutes.

**Le décor et les personnages sont générés par le code** au chargement de la page : textures, silhouettes en pixel art, ciel, intérieurs et effets de lumière. Les seules images chargées sont l'illustration de l'écran titre, les ornements de l'interface (cadres, plaques, icônes) et, une fois le jeu lancé, les portraits de dialogue des habitants, tous illustrés avec Higgsfield d'après une description, puis détourés, découpés ou cadrés par les scripts du dépôt. Les silhouettes elles-mêmes ont été dessinées sur fiche puis transcrites pixel par pixel en grilles de code (voir [`docs/construction.md`](docs/construction.md), versions 1.4 et 2.1).

Version 2.2, du 7 octobre 2026. L'état du chantier et ce qui vient ensuite : [`docs/suite.md`](docs/suite.md).

## Le jeu

La partie commence dans la maison du héros, où Claudette, sa sœur, lui confie la quête. Le village se parcourt à l'heure dorée : place au puits, forge, bibliothèque, apothicairerie, colombier, porte de la muraille, auberge, chantier, tour de l'architecte, rivière et pont. On entre dans la maison, l'auberge et la forge. Huit maîtres enseignent chacun une notion, posent une question à trois choix et remettent un parchemin ; chaque leçon est facultative et se relit dans le grimoire. Les huit parchemins réunis, Clodomir, l'architecte, remet un diplôme d'apprenti mage, avec une mention selon les erreurs, à partager ou à télécharger, puis vient le générique. Une minimap montre qui attend encore, et les Tokens gagnés en chemin s'échangent contre des tenues chez Berthe ou une épée chez Ferrand. Hors les murs, la lande grouille d'Hallucinations : on les dissipe à l'épée, en temps réel, trois coups qui s'enchaînent, cinq clartés en jeu ; elles lâchent des pièces et parfois une fiole de clarté, à ramasser en marchant dessus. La fiche d'apprenti (touche F) fait le point, avec six exploits à décrocher. Depuis la version 2.3, le village est plus vaste et plus vivant : un marché (le marchand y vend des fioles de réserve), un verger où cueillir une pomme, un lavoir et sa lavandière, un terrain d'entraînement avec son défi du mannequin ; on jette un Token dans le puits pour une maxime, on s'assied au feu ou sur un banc pour reprendre ses clartés, on fouille tonneaux, caisses et meules, on ramasse douze étincelles cachées, et un coffre attend derrière la cascade. La carte (touche C) est une illustration peinte sur parchemin. Les façades (version 2.4) ont leur rez-de-chaussée de pierre, leurs croix de colombage, leurs volets peints, leurs lucarnes, leurs enseignes et leurs lanternes à la porte.

- **Au clavier** : ZQSD, WASD ou flèches pour marcher, Maj pour courir, molette pour le zoom, E, Entrée ou Espace pour parler, flèches ou chiffres 1, 2, 3 pour répondre, G pour le grimoire, C pour la carte, F pour la feuille de personnage, J ou X (ou un clic) pour frapper de l'épée sur la lande, M pour couper la musique, T pour replier ou déplier la légende des touches, affichée en bas à gauche sur ordinateur.
- **Au doigt** : un joystick apparaît sous le pouce dans le bas de l'écran (poussé à fond, on court), un bouton d'action parle à l'habitant à portée, un bouton épée frappe sur la lande, deux doigts pincent pour zoomer. L'écran titre permet de passer le joystick à droite pour jouer de la main gauche.

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
- **Tout est écrit pour ce jeu** : post-traitement, génération des textures, animation des personnages, effets. Aucun addon, aucune bibliothèque de plus.

Arborescence :

```
index.html        page unique : carte d'import, balises de partage, conteneurs de l'interface
styles.css        interface par-dessus le canvas
vendor/three/     three.js, avec sa licence
src/main.js       démarrage, boucle, redimensionnement
src/core/         rendu, caméra, entrées (clavier, joystick, pincement), garde-fous tactiles
src/gfx/          pixels, textures, matériaux, sprites, post-traitement, effets
src/world/        carte, implantation (layout), terrain, maisons, tours, chantier, collisions, la lande (moor.js)
src/game/         joueur, habitants, dialogues, quête, interface, débogage, combat, Hallucinations, forge, feuille de personnage
src/data/         palette, habitants, Hallucinations et épées (enemies.js), textes des dialogues, planches de sprites transcrites (sprites/)
assets/portraits/ portraits de dialogue, un PNG à palette par habitant qui parle
assets/ui/        ornements de l'interface : coins, filet, cadres étirables, plaques, cadre rond, icônes, gemmes, parchemin, illustration du titre
docs/             journal de construction
outils/           outils du poste, hors du jeu : vignette.mjs (image de partage), transcrire-sprite.mjs (fiche pixel art vers grilles, poses d'un personnage déjà transcrit), coupes.mjs (colonnes de coupe d'une fiche), portrait.mjs (buste d'un dessin, PNG à palette), decouper.mjs (planche d'icônes vers fichiers), detourer.mjs (fond uni ou dégradé rendu transparent), plan.mjs (le plan du village en PNG, référence de la carte illustrée), reduire.mjs (une image réduite en PNG à palette), png.mjs
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
| 1.2 | le héros reste visible en silhouette derrière un mur ou un arbre |
| 1.3 | l'écran titre lisible sur le village ; les intérieurs façon HD-2D : plancher de lattes, dalles, lambris, tapis tissés, tableaux, rais de lumière aux fenêtres, poussière, soubassement de pierre, et plus de voile bleu |
| 1.4 | les personnages redessinés d'après des fiches pixel art illustrées puis transcrites en grilles de code, quatre tenues comprises ; des portraits illustrés dans les dialogues ; les maisons à étage, tours, arbres et muraille aux proportions des références |
| 1.5 | l'interface plus grande d'un cinquième et ornée de dessins générés puis découpés : coins de filigrane, filets, icônes, parchemin du grimoire |
| 2.0 | la lande hors les murs et ses Hallucinations, le combat en temps réel à l'épée (trois coups qui s'enchaînent, cinq clartés), la forge de Ferrand (trois épées en Tokens), la fiche d'apprenti (touche F) |
| 2.1 | le héros animé au combat : sept fiches dessinées (l'épée à la main, puis l'élan et la frappe de chaque coup) transcrites en grilles ; l'interface illustrée (cadres étirables, plaques d'ivoire, gemmes de clarté) et plus grande ; la légende des touches sur ordinateur ; l'écran titre en page de parchemin avec l'illustration du voyageur et un menu |
| 2.2 | les quatre tenues de la boutique au combat (vingt-huit fiches de plus) ; une marche plus ample et une course ; les barres de vie au-dessus des Hallucinations et sous le héros ; le butin : pièces et fioles de clarté lâchées au sol, ramassées en marchant dessus |
| 2.3 | le village agrandi (56 × 42 cases, tout espacé de 40 %) et quatre lieux de plus (marché, verger, lavoir, terrain d'entraînement), le marchand de fioles et la lavandière, les points d'action (puits à vœux, repos, fouille, pomme, fioles, défi du mannequin), les étincelles cachées, les exploits, le coffre de la cascade et la tenue de la cascade, la carte illustrée |
| 2.4 | les façades : rez-de-chaussée de pierre, croix de colombage, volets peints, appuis, encadrement et marches des portes, lanternes murales, chevrons, lucarnes, chapeaux de cheminée, enseignes figurées |
| 2.5 | personnages trapus redessinés en cinq vues et huit directions, dialogue sans boîte avec le portrait en grand, police EB Garamond, le village deviné dans la nuit autour des intérieurs, éclat de lumière sur chaque coup |

**Ce que le code fabrique** : les textures (des pixels posés dans des palettes de quelques tons, avec un tramage), les personnages (des planches transcrites en grilles de code d'après des fiches dessinées, que le code anime : respiration, marche et course à six images, huit directions, et pour le héros et ses tenues les mêmes l'épée à la main, puis six poses de coup figées), les barres de vie et le butin de la lande (des pixels posés par le code), le village (une grille de caractères), le ciel, la lumière et les effets (des shaders), les sons d'ambiance (Web Audio : rivière, cascade, oiseaux, feu, marteau, pas), le diplôme et la minimap (un canvas 2D, posé depuis la version 2.3 sur la carte illustrée : le plan exact du village repeint en parchemin par un générateur d'images), le favicon (un SVG écrit dans la page) et l'image de partage (`outils/vignette.mjs`).

**Ce qui ne l'est pas** : la musique, la police EB Garamond, three.js, et depuis la version 1.4 les portraits de dialogue et les fiches pixel art des personnages, puis (1.5 et 2.1) les ornements de l'interface et l'illustration de l'écran titre, tous illustrés avec Higgsfield d'après une description (les fiches sont ensuite transcrites en code, les portraits cadrés, les ornements détourés et découpés par les scripts du dépôt). La flamme de cette illustration est celle du logo Maintenant Vous Savez, redessinée en lumière.

**Ce qui a résisté** :

- **La lumière.** Avec les valeurs du plan, l'herbe au soleil sortait terne : il a fallu un soleil presque deux fois plus fort, puis une épaule douce dans l'étalonnage pour ne pas blanchir les tuiles.
- **La direction artistique**, refaite une fois en cours de route d'après une démo plus riche, et les personnages redessinés.
- **Le diplôme** pesait 2,8 Mo en PNG : le grain du parchemin ne se compresse pas. Il est enregistré en JPEG.
- **Les pièces noires** : la passe qui dessine les personnages effaçait l'image composée juste avant.
- **Le héros la tête en bas** après son premier achat de tenue.
- **Un second doigt ne fait pas de « click »** sur téléphone : avec le pouce sur le joystick, les boutons ne répondaient plus. Ils écoutent maintenant chaque doigt.

**Poids** : sur le disque, ce que la page peut charger pèse 5,0 Mo en 166 fichiers, dont 1,2 Mo de grilles de sprites en JavaScript (les planches du héros et de ses quatre tenues, avec leurs poses de combat), 1,1 Mo de portraits et 1,1 Mo d'ornements (mesure du 7 octobre 2026). Les portraits et la plupart des ornements ne sont demandés qu'après le lancement de la partie, et les textes se compressent bien chez GitHub Pages. La musique (2,6 Mo) aussi n'est demandée qu'au lancement.

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

Police EB Garamond : © The EB Garamond Project Authors, licence SIL Open Font 1.1, voir [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt).

## Licence

Code et textes sous licence MIT, voir [`LICENSE`](LICENSE). Le logo Maintenant Vous Savez, redessiné en flamme de lumière dans l'illustration de l'écran titre, en est exclu : tous droits réservés. Les illustrations générées (portraits, ornements, illustration du titre) et la musique en sont exclues aussi.
