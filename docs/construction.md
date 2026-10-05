# Journal de construction

Comment le Village de LIA a été construit avec Claude Code, étape par étape. Le plan (rendu visé, valeurs chiffrées, étapes, critères de vérification) a été écrit avec Claude Fable 5.1 ; la construction est menée avec Claude Opus 5.5, une étape par session, chacune vérifiée dans le navigateur intégré de Claude Code avant d'être publiée.

## Étape 0 : le socle (5 octobre 2026)

**But** : valider toute la chaîne, du code à l'URL publique, avant d'écrire la moindre ligne de jeu.

Ce qui a été fait :

- Dépôt git avec une identité anonyme locale, et deux crochets qui refusent un commit signé autrement, ou qui ferait entrer un tiret long, un chemin de disque ou un nom privé dans ce dépôt public.
- three.js 0.186.1 copié dans `vendor/three/`, chargé par une carte d'import : aucun outil de build.
- Une page minimale : un cube éclairé par un soleil bas et chaud et un ciel froid, vu avec la focale étroite (26°) prévue pour le village.
- Le panneau `?debug` : images par seconde, appels de dessin, triangles, ratio de pixels, définition du canvas.
- La détection de WebGL2, et celle des cartes d'import pour les navigateurs trop anciens : un message clair au lieu d'une page noire.
- La porte de chargement : toutes les entrées sont avalées tant que six images n'ont pas été rendues, pour qu'une touche enfoncée pendant la compilation des shaders ne fasse pas partir le héros tout seul.
- Les garde-fous de page : rien ne défile, rien ne rebondit, aucun geste n'est intercepté par le navigateur.

Ce qui a résisté :

- Le plan prévoyait les fichiers minifiés officiels de three.js. Le paquet de la r186, la dernière version, n'en contient plus. On les produit une fois avec esbuild (commande dans le README) : 766 Ko au lieu de 2,1 Mo.

Mesures :

| Critère | Résultat |
|---|---|
| Console | aucune erreur, aucun avertissement |
| Requêtes | une page, une feuille de style, trois modules, les deux fichiers de three.js ; aucune image |
| Rendu | 1 appel de dessin, 12 triangles |
| Poids de la page | 775 Ko, dont 204 Ko réellement transférés depuis GitHub Pages (gzip) |
| URL publique | répond, carte d'import et chemins relatifs corrects, modules servis en `application/javascript`, aucune erreur |
| Mobile 375×812 | aucun défilement, ratio de pixels plafonné à 1,5 |
| Images/s | non mesurées : le panneau du navigateur intégré était masqué pendant la vérification, les images ne tournaient pas. À relever sur l'URL publique. |

## Étape 1a : sol, textures, caméra, héros (5 octobre 2026)

**But** : un sol en pixel art net, une caméra de maquette, un héros qui marche et se cogne aux murs. Aucun post-traitement.

Ce qui a été fait :

- **Textures générées** (`gfx/pixels.js`, `gfx/textures.js`) : herbe, terre, pavés, eau. Tuiles de 64 × 64 pixels pour 4 × 4 unités, rampes de 6 ou 7 tons, tramage de Bayer, bruits et Voronoï périodiques (aucune couture), normales tirées du relief par l'opérateur de Sobel.
- **Échantillonnage net** (`gfx/materials.js`) : filtre bilinéaire, coordonnées recalées au centre du texel sauf sur un pixel d'écran autour de chaque bord. Les texels restent carrés et nets sans scintiller quand la caméra glisse.
- **Carte en grille de caractères** (`world/map.js`) de 32 × 24 cases, **sol fusionné par matière** (`world/terrain.js`) : un appel de dessin par matière, berges et flancs du socle compris. **Collisions** cercle contre cases (`world/collision.js`), avec glissement le long des murs.
- **Caméra** (`core/camera.js`) : focale de 25°, plongée de 36°, distance 28, cible 2,5 unités devant le héros, lissage `1 - exp(-4 dt)`, zoom de 0,8 à 1,4 à la molette, recul en portrait.
- **Générateur de personnages** (`gfx/sprites.js`) : une silhouette commune calculée pour 4 directions, 2 images de repos et 4 de marche, habillée d'un accessoire dessiné en grilles de caractères (`data/characters.js`). Le héros porte une capuche de voyage. Volume par pseudo-normale ramenée à 4 tons, contour sombre bleuté.
- **Billboard** (`gfx/billboard.js`) : le sprite est éclairé par la scène (Lambert enveloppé, normale inclinée vers le haut), projette une ombre en silhouette grâce à des matériaux d'ombre qui le tournent vers chaque lumière, et pose un décalque d'ombre douce sous ses pieds.
- **Clavier** par position physique des touches : ZQSD sur AZERTY, WASD sur QWERTY, flèches partout, sans rien détecter.
- **`window.__lia`** : `teleport`, `freeze`, `step` (avancer image par image), `bench`, `showSheet` (planche du héros agrandie), `info`.

Choix faits en route :

- Le sprite reste **debout**, aligné sur la caméra, et sa hauteur est allongée de 1 / cos(36°) pour que les pixels restent carrés. Un quad incliné dans le plan de la caméra s'enfonçait dans le mur derrière le héros dès qu'il le touchait.
- L'ombre reçue par le sprite est lue **en un seul point**, à mi-corps et avancé vers le soleil : sans cela, le sprite recevait sa propre ombre. Premier réglage à 0,85 de haut : le héros restait éclairé dans l'ombre d'un muret de 0,8. Abaissé à 0,45.
- Textures adoucies après la première capture : l'herbe faisait moquette, les pavés faisaient éboulis.

Mesures (navigateur intégré, panneau masqué) :

| Critère | Résultat |
|---|---|
| Console | aucune erreur |
| Appels de dessin | 11, passe d'ombre comprise (objectif : moins de 60) |
| Triangles | 4 038 |
| Collisions (parcours scripté) | arrêt à 0,3 du muret et de l'eau, glissement en diagonale, porte du jardin et gué franchissables, bords tenus |
| Vitesse | 3,4 unités par seconde |
| Ombres | silhouette du héros portée vers l'est ; héros assombri dans l'ombre d'un muret |
| Mobile 375×812 | aucun défilement, héros lisible ; beaucoup de fond en haut de l'écran, à reprendre en 1f avec le ciel |
| Poids de la page | 831 Ko, 223 Ko compressés |
| Images/s | non mesurables panneau masqué. `__lia.bench` donne 0,06 ms par image, un chiffre trop bas pour être fiable : il ne remplace pas une mesure en boucle réelle, sur l'URL publique et sur téléphone |

Reste pour la suite : le liseré lumineux sur les bords des sprites (1b), la lumière dorée et ses réglages fins (1b), le ciel (1d).
