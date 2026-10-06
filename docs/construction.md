# Journal de construction

Comment The Legend of Elelhem (d'abord « Le Village de LIA ») a été construit avec Claude Code, étape par étape. Le plan (rendu visé, valeurs chiffrées, étapes, critères de vérification) a été écrit avec Claude Fable 5.1 ; la construction est menée avec Claude Opus 5.5, une étape par session, chacune vérifiée dans le navigateur intégré de Claude Code avant d'être publiée.

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

## Étape 1b : la lumière dorée (5 octobre 2026)

**But** : la lumière de fin de journée. Ombres longues, faces à l'ombre froides, faces au soleil chaudes, fenêtres et lanternes allumées.

Ce qui a été fait :

- **Quatre maisons à colombages** (`world/props.js`), décrites en quelques nombres dans `world/village.js` : emprise, hauteur, axe du faîtage, porte, fenêtres, cheminée. Soubassement de pierre, enduit blanc cassé, poutres rouge sang de bœuf, tuiles canal, portes vertes : un clin d'œil aux maisons du Pays basque. Deux ont leur pignon face à la caméra.
- **Six nouvelles textures générées** : enduit, bois, tuiles canal, briques, porte (16 × 32 pixels), fenêtre (16 × 16) avec sa texture d'émission.
- **Géométrie fusionnée par matière** (`world/builder.js`), partagée par le sol et les maisons : toutes les maisons du village tiennent en sept appels de dessin. Chaque toit est un volume fermé, pour projeter son ombre.
- **Occlusion ambiante cuite** dans les couleurs de sommets : coins de cellules au pied des murs et des maisons, berges, pied du socle, bas des murs. Elle assombrit la lumière du ciel, et le soleil à 35 % seulement.
- **Soleil** bas (23°) venu de l'ouest-sud-ouest, **ciel** froid en hémisphère. Le cadrage d'ombre (44 unités de côté) suit la caméra, recalé sur la grille de ses texels pour que les bords d'ombre n'ondulent pas. Ombres en 2048², 1024² sur petit écran.
- **Brume chaude**, réglée sur le recul de la caméra : le lointain se fond dans le fond.
- **Fenêtres émissives** (2,4) et **quatre lanternes** : lumière chaude qui vacille doucement, flammes dessinées par le GPU sur une grille de 7 × 11 gros pixels, toutes en un seul appel de dessin, couleur au-dessus de 1 pour le futur bloom.
- **Liseré lumineux** sur le bord des sprites tourné vers une lumière (reporté de 1a).
- **Mesures dans `window.__lia`** : `pixel(x, y)`, `probe(x, y, z)` (couleur d'un point du monde vu par la caméra), `stats()` (part de pixels saturés).

Choix faits en route :

- **Soleil à 6,5 et ciel à 1,7**, au lieu de 3,5 à 5 et 1,8 à 2,4 prévus. Avec les valeurs du plan, l'herbe au soleil sortait à (68, 84, 32) : nos rampes pixel art sont sombres une fois converties en lumière linéaire, et le soleil bas éclaire peu le sol. Exposition 1,25.
- **Les ombres des lanternes sont calculées une seule fois**, au chargement : elles ne bougent pas, et quatre lumières ponctuelles avec ombre, redessinées à chaque image, coûteraient 24 passes de plus sur téléphone. Le héros, qui bouge, n'y figure donc pas : il garde l'ombre du soleil et son décalque. Le plan prévoyait un matériau d'ombre tourné vers chaque lanterne.
- **Poteau et ferronnerie des lanternes hors de leurs propres ombres** : juste sous la flamme, ils éteignaient le sol dans un rayon de 0,8 unité, et la flaque de lumière disparaissait. Ils gardent leur ombre au soleil.
- Premier liseré trop fort (0,3) : il dessinait un trait blanc autour du héros. Réglé à 0,12.

Mesures (navigateur intégré, `__lia.probe` sur des points du monde) :

| Critère | Résultat |
|---|---|
| Ombres longues des maisons | ombre d'environ 9 unités pour une maison de 4 de haut : la maison 4 met toute la façade sud de la maison 3 dans son ombre |
| Murs à l'ombre plus froids | mur sud au soleil (210, 172, 136), bleu/rouge 0,65 ; pignon est à l'ombre (57, 59, 79), bleu/rouge 1,39 |
| Lanternes | sol au pied d'une lanterne, à l'ombre : (51, 35, 40), contre (19, 14, 21) à trois unités |
| Acné d'ombre sur le sprite | aucune : l'ombre reçue est lue en un seul point, avancé vers le soleil |
| Cadrage d'ombre | ombres présentes aux deux coins opposés de la carte |
| Pixels saturés | 0,14 à 0,42 % selon la vue |
| Appels de dessin | 25 à 28, passe d'ombre comprise ; 6 312 triangles |
| Mobile 375×812 | aucun défilement, aucune erreur, ombres en 1024² |
| Poids de la page | 866 Ko, 235 Ko compressés |

Reste pour la suite : les maisons masquent le héros quand il passe derrière elles (étape 2) ; les arbres (1d ou 2) ; le cadrage d'ombre ne couvre pas tout l'écran en portrait (1f) ; le fond uni attend le ciel (1d).

## Étape 1c : le post-traitement (5 octobre 2026)

**But** : l'effet maquette. Sans post-traitement, la scène reste un décor en voxels banal ; c'est l'image finale qui fait la miniature.

Ce qui a été fait (`gfx/post/`) :

- **La scène sans les sprites, en HDR linéaire** : cible en demi-flottants, MSAA ×4, profondeur en texture flottante. three.js ne fait plus aucun étalonnage.
- **Flou de profondeur hybride** (`dof.js`) : une bande d'écran nette autour du héros (±0,12 de la hauteur, adoucie sur 0,4, centrée sur lui entre 0,2 et 0,8), mêlée à 30 % d'un flou par la distance (net à 2,2 unités près, rampes de 7 devant et de 11 derrière). Calculé en demi-résolution bornée à 540 pixels de haut : un préfiltre réduit la scène et garde la distance du pixel le plus proche, puis chaque pixel lit 24 voisins sur une spirale d'or (16 sur téléphone) et ne garde que ceux dont le flou l'atteint. Un voisin plus lointain ne déborde pas sur un pixel plus net : pas de halo flou autour d'un toit net.
- **Bloom en cinq mips** (`bloom.js`) : seuil doux, quatre descentes, quatre remontées en tente.
- **Composition** (`composite.js`) : flou fondu selon le cercle de confusion de chaque pixel, bloom ajouté, puis exposition 1,25, ACES, teinte scindée, saturation 1,12, contraste 1,07, vignette 0,45, grain 0,02. Seul endroit où l'image passe en sRGB.
- **Sprites dessinés après la composition**, sur un calque à part : jamais flous. Ils testent eux-mêmes la profondeur de la scène (une maison devant le héros le cache) et appliquent la même fonction d'étalonnage, brume comprise. Toutes les lumières éclairent les deux calques, et le soleil voit le calque des sprites pour leur ombre.
- **Vues de débogage** : `?view=raw`, `?view=coc`, `?view=bloom`, et `?nofx` qui court-circuite tout et reste la version de référence.

Choix faits en route :

- **Épaule douce dans l'étalonnage.** Première mesure : 1,25 % de pixels saturés, presque tous sur le canal rouge (tuiles au soleil, une fenêtre, les flammes, le visage du héros). Les pavés, eux, ne saturaient pas. Au-delà de 0,85, la composante la plus forte se tasse au lieu d'être écrêtée, et la teinte ne bouge pas : 0 % ensuite, et les tuiles gardent leur relief.
- **Seuil du bloom à 1,2** au lieu de 0,9 : avec notre soleil plus fort (6,5), la vue `?view=bloom` montrait aussi l'enduit et les tuiles au soleil. À 1,2, il ne reste que les fenêtres, les lanternes et les flammes.
- **Ombres calculées une seule fois par image** : la passe des sprites ne les recalcule pas.
- **Garde-fou de taille** : un canvas de 0 pixel (page pas encore affichée) donnait des cibles vides et des avertissements WebGL. La taille suit maintenant le canvas par un `ResizeObserver`.

Grille de comparaison avec la référence (`hd2d-diorama`, préréglage Dusk) :

| Critère | Résultat |
|---|---|
| Focale étroite et plongée | oui, fuyantes presque parallèles, toits vus de dessus |
| Bande nette sur le héros, haut et bas flous | oui : `?view=coc` montre la bande noire, le lointain en bleu, le premier plan en orange, comme la carte de flou de la référence ; flou maximal identique (1,9 % de la hauteur) |
| Halos chauds sur fenêtres et lanternes, pavés non blanchis | oui : `?view=bloom` ne garde que les sources de lumière ; 0 % de pixels saturés en vue finale |
| Ombres chaudes et froides | inchangé depuis 1b |
| Texels nets sans scintillement | oui dans la bande ; le héros reste toujours net |
| Lumière dorée | oui, plus claire que la référence (crépuscule) : c'est voulu |
| Rayons de soleil, lucioles, ciel | à venir (1d) |
| Performance | 39 appels de dessin (28 sans post-traitement) ; images/s non mesurables ici, panneau masqué ; le minutage GPU donne moins de 1 ms par image à 1600 × 900 sur ce poste, avec des chiffres trop instables pour comparer les deux modes |

Mesures complémentaires : mobile 375×812, aucun défilement ni erreur, canvas 562 × 1218 ; poids de la page 890 Ko, 245 Ko compressés.

Reste pour la suite : la mesure réelle des images/s sur ordinateur et sur téléphone ; le repli « bande d'écran seule » si le téléphone peine (1f) ; le fond uni, qui passe un peu dans le bloom, attend le ciel (1d).

## Étape 1e : Lia et la boîte de dialogue (5 octobre 2026)

**But** : un premier habitant qui parle, et des formats de données gelés pour que les textes de l'étape 3 s'écrivent en parallèle des décors de l'étape 2.

Ce qui a été fait :

- **Lia** (`data/characters.js`), la guide : cheveux argentés, robe crème, un joyau au front et une orbe qui flotte à son côté. Même silhouette que le héros, seul l'accessoire change. Joyau, pendentif et orbe sont de la lumière : la lettre `l` des grilles d'accessoire est copiée dans une seconde planche, lue comme carte d'émission. Ils brillent à l'ombre comme au soleil, et pulsent doucement (±16 %).
- **Un habitant n'est que de la donnée** : `createNpc` (`game/npc.js`) lit un objet `{ id, nom, palette, accessoire, position, direction, dialogue }`. Il respire au repos, se tourne vers le héros à moins de 4,5 unités (l'axe de son regard est favorisé de 25 % pour qu'il ne tremble pas sur une diagonale), fait obstacle comme un poteau. Trois lignes de plus dans `characters.js` suffiront pour le suivant.
- **Interaction** (`game/interaction.js`) : rayon de 2,2 unités, une bulle en DOM au-dessus de la tête (cible de 48 px, rappel de la touche E seulement là où il y a un clavier). On parle avec E, Entrée ou Espace, ou en touchant la bulle : c'est ce qui rend le jeu jouable au pouce avant que le bouton d'action n'existe (étape 4). Échap ferme.
- **Boîte de dialogue** (`game/dialogue.js`), en DOM : machine à écrire à 55 caractères par seconde, pagination, marque de suite (triangle qui bat, losange à la dernière page). Le texte entier est déjà dans la page, la partie pas encore tapée est transparente : la boîte ne change jamais de taille pendant la frappe. Une action termine la page, puis passe à la suivante. Le héros est figé pendant la conversation, et le temps du texte est réel : `__lia.freeze()` ne le fige pas. Espaces insécables avant `: ; ! ?` et dans les guillemets, ajoutées à l'affichage pour que les textes restent de l'écriture ordinaire.
- **Police** : Newsreader (OFL, la police des titres de la marque), deux graisses (500 et 600), sous-ensemble latin de 23 Ko chacune, avec la licence dans `assets/fonts/`. Georgia en repli, le chargement est demandé au démarrage pour que la première page n'apparaisse pas en Georgia puis ne change de largeur.
- **État de partie** (`game/state.js`) : `{ prenom, parchemins, visites, choix }`, sauvegardé dans `localStorage` sous `village-lia-v1`, entouré de try/catch, lu champ par champ (une sauvegarde abîmée ne bloque jamais). Première conversation : `intro`, ensuite : `retour`. `?reset` repart d'une partie neuve : à utiliser pour revoir l'accueil.
- **Accueil de Lia** : le jeu de mots LIA, « l'IA », et Ellelhem, qui se lit presque L, L, M comme les grands modèles de langage.

### Formats gelés

Ils sont décrits en tête de `data/dialogues.js` et de `data/characters.js`. `dialogues.js` tient la forme du plan (`nom`, `intro(etat)`, `lecon`, `question` à trois choix, `recompense`, `retour(etat)`), et Lia les remplit tous, pour que le format soit une réalité testable et non une promesse. Seuls `intro` et `retour` sont joués à cette étape. Précisions apportées au plan :

- `characters.js` garde le champ au singulier `accessoire` (un seul signe distinctif par habitant, c'est la contrainte de l'étape 2), pas `accessoires`.
- Lia donne un des huit parchemins (elle et sept artisans), l'architecte remet le diplôme. D'où `PARCHEMINS_TOTAL = 8`, exporté par `dialogues.js`.
- `__lia.checkDialogues()` contrôle les textes : clés présentes, trois choix dont un seul bon, pages de 170 caractères au plus (lisible sur téléphone), aucun tiret long, chaque `dialogue` d'un habitant existe. Il passe à vide. À relancer à l'étape 3.

Les pages `lecon`, `question` et `recompense` de Lia sont un premier jet exact mais court : à relire avec Jordan à l'étape 3, comme tous les textes.

Outils de test ajoutés à `window.__lia` : `talk(id)`, `advance()`, `dialogue()`, `nearby()`, `setName(nom)`, `gameState()`, `checkDialogues()`, `showNpcs(on)`, et `showSheet(on, id)` accepte maintenant l'identifiant d'un personnage.

### Mesures

Navigateur intégré, bureau et préréglage mobile 375×812, zéro erreur ni avertissement en console.

| Critère | Résultat |
|---|---|
| Lisibilité du texte | page la plus longue (161 caractères) sur 4 lignes à 375 px, sans zoom, boîte sous le tiers bas de l'écran, héros et Lia visibles au-dessus |
| Parcours | conversation jouée page par page (action qui termine la page, puis qui passe à la suivante, puis qui ferme), `retour` avec le prénom à la visite suivante, sauvegarde relue |
| Toucher | un clic sur la bulle ouvre la conversation, un clic sur la boîte avance |
| Appels de dessin | 52 en tout ; Lia en coûte 2 (50 sans elle, mesuré par `showNpcs`) ; aucun appel de plus pendant une conversation |
| Pixels saturés | 0 %, 0 % blanchis |
| Réseau | HTML, CSS, JavaScript (37 modules), three.js et les deux polices : aucune image |
| Poids de la page | environ 1 Mo avant compression (three.js 765 Ko, polices 47 Ko), sous les 1,5 Mo visés |

Ce qui n'est pas mesuré : les images par seconde. Pendant ces vérifications le panneau du navigateur intégré ne faisait pas tourner la boucle d'animation (le panneau `?debug` restait figé sur une ancienne valeur), le chiffre n'a donc aucun sens et n'est pas recopié. À mesurer sur le téléphone de Jordan à la fin de l'étape 1.

Reste pour la suite : le bouton d'action rond et l'option main gauche (étape 4) ; Lia ne mesure que 27 pixels de large sur un écran de 375 px, à juger à l'étape 2 avec les huit autres ; la question à trois choix et le parchemin (étape 3).

## Étape 1f : performance et premier tactile (5 octobre 2026)

**But** : que le test sur téléphone soit un vrai test. Le chiffre qui décide reste celui du GPU du téléphone de Jordan.

Ce qui a été fait :

- **Plafond du ratio de pixels à 1,5** (`core/renderer.js`) et **ombres en 1024²** sur écran étroit : déjà en place depuis 1a et 1b, vérifiés. Les géométries statiques (sol, constructions) avaient déjà `matrixAutoUpdate = false`.
- **Échelle de rendu automatique** (`core/quality.js`) : si l'image moyenne sur 3 s passe sous 40 images/s, le ratio de pixels est multiplié par 0,75, puis 0,6 si cela ne suffit pas. Elle ne remonte jamais (pas de va-et-vient). Une seconde de répit après chaque changement (compilation des shaders), les images de plus de 0,25 s (onglet en veille) ne comptent pas. `?scale=0.75` impose une échelle fixe et coupe l'automatisme, pour les mesures ; `?debug` affiche l'échelle en cours. Le gouverneur n'est pas relié à la passe de flou : le repli « bande d'écran seule » du plan reste à faire si le téléphone peine malgré l'échelle.
- **Hauteur de page** (`core/viewport.js`) : `visualViewport` publie sa hauteur dans `--hauteur`, utilisée par `body`. Pas de défilement en portrait comme en paysage 812×375.
- **Joystick flottant minimal** (`createFloatingStick` dans `core/input.js`) : pouce posé dans la moitié gauche, le stick apparaît dessous, rayon 64 px, zone morte 13 %, un seul doigt, le centre suit le doigt s'il dépasse le rayon. Toucher et stylet seulement (le clavier suffit au bureau). Le stick l'emporte sur le clavier quand il est actif. Pas encore de course rapide, de bouton d'action ni d'option main gauche (étape 4) ; la bulle au-dessus de l'habitant sert d'action tactile.

Mesures (navigateur intégré, préréglage mobile 375×812 et paysage 812×375, événements tactiles rejoués) :

| Critère | Résultat |
|---|---|
| Échelle de rendu | `?scale=0.75` sur écran à ratio 2 : canvas 421 × 913 = 375 × 1,5 × 0,75 |
| Logique du gouverneur | essayée hors navigateur : 60 et 45 images/s ne changent rien, 25 images/s descend à 0,75 puis 0,6, les images de 0,5 s sont ignorées |
| Stick | apparaît sous le pouce, pousse le héros vers le haut puis vers la droite, le centre suit un glissé de 300 px, disparaît au relâchement, rien côté droit |
| Défilement et erreurs | aucun défilement en portrait ni en paysage, zéro erreur en console |
| Poids de la page | 1,01 Mo avant compression, sous les 1,5 Mo visés |

Pas mesurés : les images par seconde, pour la même raison qu'en 1e (le panneau du navigateur intégré ne fait pas tourner la boucle). Le préréglage 375×812 ne remplace pas un téléphone. Un redimensionnement du préréglage sans rechargement n'envoie pas les événements de redimensionnement : recharger après chaque changement de préréglage.

**À faire par Jordan** : ouvrir https://amael-alt.github.io/elelhem/?debug sur le téléphone, jouer une minute au pouce, et renvoyer les images/s, l'échelle affichée et les appels de dessin. Objectif 30 images/s au moins ; en dessous, on réduit (échelle, ombres, mips) avant l'étape 2.

## Étape 2 : le village complet et ses habitants (5 octobre 2026)

**But** : passer d'un décor provisoire à un village qu'on parcourt et où l'on reconnaît chaque lieu et chaque habitant.

Ce qui a été fait :

- **Carte de 40 × 30 cases** (`world/map.js`, grille ASCII) : place pavée de 12 × 8 au centre, routes de terre vers chaque quartier, **muraille à l'ouest** avec sa porte de trois cases, **rivière et pont** à l'est (murets de chaque côté), **falaises** au nord et à l'est, haies autour de deux jardins. Cinq types de case ajoutés : pont, falaise, muraille, haie (et le muret existant).
- **Implantation séparée de la technique** (`world/layout.js`) : maisons, tours, chantier, puits, tonneaux, arbres, lanternes, lucioles, rayons de soleil, tout y est en donnée. `world/village.js` ne fait que bâtir.
- **Les lieux** : la forge (basse, cheminée de brique très forte, foyer ouvert avec sa flamme, enclume, tonneaux), la bibliothèque (haute, deux rangées de fenêtres), l'apothicairerie (étroite, ouverte sur son jardin de simples), le colombier (tour à trous sombres, six pigeons qui tournent), la porte de la muraille et sa guérite, l'auberge (la plus grande maison, enseigne, tonneaux, potager), le chantier (bâtiment à moitié monté, échafaudage sur deux faces, échelle, tas de pierres et de planches), la tour de l'architecte (toit en pyramide, deux étages de fenêtres), le puits de la place. Les formes nouvelles sont dans `world/landmarks.js`.
- **Neuf habitants** : Lia et huit artisans (`data/characters.js`), sur la silhouette commune, chacun avec **un seul accessoire distinctif** et sa palette de quatre rampes : marteau et tablier, lunettes et livre, fiole, pigeon sur l'épaule, hallebarde et casque, cruche, règle et rouleau, compas. Les grilles d'accessoire de chaque vue (face, dos, profil) ont été tracées par un petit script à partir de formes simples, puis recopiées en clair dans le fichier.
- **Trois figurants** (les apprentis) : mêmes données avec un champ `trajet`, ils font des allers-retours avec une pause à chaque bout, sans dialogue ni étiquette. Les pigeons sont un seul `InstancedMesh`.
- **Nom au-dessus de la tête** dès 4,5 unités, bulle de parole à 2,2 unités (le nom passe au-dessus de la bulle). Les habitants se tournent vers le héros à l'approche.
- **Parcours scripté** : `__lia.walk(points)` fait marcher le héros image par image, collisions comprises, et signale le point où il se coince.

Choix faits en route :

- **Quatre lanternes éclairantes, huit d'ambiance** : les quatre aux coins de la place gardent leur vraie lumière et leurs ombres figées ; les huit autres n'ont que leur flamme, le bloom fait le halo. Chaque lumière en plus coûte à chaque pixel de chaque image.
- **`dialogue: null` pour les huit artisans.** Leurs textes sont l'étape 3 et passent par la relecture de Jordan : je n'ai rien écrit à leur place. Ils sont atteignables, portent leur nom, se tournent vers le héros, mais ne répondent pas encore.
- **Muraille à l'ouest et non au sud** : vue de côté, elle ne cache pas ce qui est derrière elle.

Grille de contrôle (navigateur intégré) :

| Critère | Résultat |
|---|---|
| Tour du village | 33 points sur 33 atteints par `__lia.walk`, sans se coincer : porte de la muraille et au-delà, pont aller et retour, parvis de l'auberge, chantier, colombier, tour, jardins |
| Habitant atteignable | chacun est à moins de 1,3 unité du point d'arrêt du parcours, rayon de parole 2,2 |
| Appels de dessin | 70 à 73 selon la vue, passe d'ombre comprise (plafond du plan : 150) ; 16 300 triangles |
| Pixels saturés | 0 % |
| Ateliers reconnaissables | forge (cheminée, foyer, enclume), bibliothèque (hauteur, fenêtres), colombier (tour, pigeons), chantier (échafaudage, tas), tour, auberge (taille, enseigne) : oui sur capture bureau ; l'apothicairerie se reconnaît surtout à son jardin clos |
| Habitants sur mobile 375 px | Ferrand (marteau, tablier), Pépin (pigeon), Clodomir (barbe blanche, robe violette), Basile (fiole verte) se lisent ; les autres tiennent à leur couleur dominante |
| Console | aucune erreur |
| Textes | `__lia.checkDialogues()` passe à vide |

Pas mesurés : les images par seconde (même raison qu'en 1e, la boucle ne tourne pas dans le panneau du navigateur intégré). Les ombres longues mettent la moitié sud de la place dans le noir : c'est la lumière dorée voulue, à juger par Jordan sur captures.

Reste pour la suite : les textes et la quête (étape 3) ; les deux maisons du premier plan (auberge, bibliothèque) cachent le héros quand il passe derrière, comme annoncé en 1b ; le ciel visible au nord est un peu vide.

## Étapes 2b à 2e : la direction artistique, d'après Emberfall (5 octobre 2026)

**But** : Jordan trouvait le village juste, mais moins travaillé que la démo « Emberfall » du moteur Lumina (dépôt `stubborn-hug/lumina` sur GitLab), retrouvée entre-temps. Ce dépôt n'a pas de licence et se dit « for reference only » : comme pour les deux autres démos, on a comparé ses **captures publiées** (écran titre, heure dorée, dialogue, galerie d'objets), sans lire ni reprendre son code. Quatre sous-étapes, chacune vérifiée et commitée à part. Les personnages restent ceux de l'étape 2, à refaire plus tard.

Ce que les captures montraient, et ce qu'on en a fait :

- **2b, lumière et arbres.** Leurs ombres sont bleutées, les nôtres bouchaient la place. Ciel plus présent (hémisphère 1,7 vers 2,6), soleil à 28° au lieu de 23°, ombres remontées vers le bleu-vert dans l'étalonnage, flou de profondeur un peu plus fort (1,9 % vers 2,4 % de la hauteur, bande nette plus étroite), bloom plus présent. Les arbres cubiques deviennent des **couronnes de grappes de feuilles** (`gfx/foliage.js`) : quads tournés vers la caméra, découpés dans une image pixel art générée, teintés vert ou roux d'automne, qui ondulent au vent et projettent des ombres tachetées. Un seul appel de dessin pour tout le feuillage.
- **2c, végétation et sol.** Le plus gros écart : leur sol déborde d'herbe et de fleurs. Environ 3 000 **touffes d'herbe et de fleurs** (`gfx/grass.js`), images de 12 × 12 à la densité du décor, plus serrées en lisière et fleuries dans les prés, dessinées en un appel ; des **buissons** en grappes ; une **lèvre d'herbe** qui déborde sur le haut des falaises et du socle.
- **2d, maisons et objets.** Toits d'**ardoise** et de **chaume**, murs de **pierre de taille**, **jardinières fleuries** sous les fenêtres, un **étal à auvent rayé** sur la place, des **barrières**, des **meules de foin**, des **rochers** et un **feu de camp** avec sa fumée. Quatre textures nouvelles générées (ardoise, chaume, pierre, toile).
- **2e, écran titre et interface.** L'**écran titre** par-dessus le village vivant : la flamme Maintenant Vous Savez en grand, « Le Village de LIA » en or, un ornement, la contrée, un prénom facultatif, « Appuyer pour commencer » (ou reprendre, avec un lien vers une nouvelle partie), la signature et le site. La **boîte de dialogue** passe au bleu nuit à filets d'or, losanges aux angles et cartouche de nom. Un **bandeau de lieu** annonce le quartier où l'on entre (onze quartiers). Tous ces textes vivent dans `data/dialogues.js` (`textesInterface`). La flamme est la seule image chargée par le jeu (81 Ko, réduite à 600 pixels de haut).

Mesures (navigateur intégré, poste de développement, panneau `?debug` qui tourne enfin) :

| Critère | Avant (étape 2) | Après (2e) |
|---|---|---|
| Images/s, bureau 1100 × 640 | non mesurables | 178 à 180 |
| Appels de dessin | 70 à 73 | 78 à 85 |
| Triangles | 16 300 | 24 500 |
| Pixels saturés | 0 % | 0 % |
| Parcours scripté | 33 sur 33 | 33 sur 33 |
| Console | aucune erreur | aucune erreur |

Pas encore fait : les personnages plus détaillés (décidé avec Jordan : plus tard) ; la mesure sur téléphone, plus nécessaire que jamais avec l'herbe dense : si le téléphone peine, la densité des touffes est le premier réglage à baisser.

## Musique et passe de QA « Octopath » (5 octobre 2026)

**Musique.** Jordan a composé une musique de fond avec Suno, « The Village Bell ». Le fichier reçu faisait 5,4 Mo avec sa pochette et des métadonnées de compte : il est réencodé à 96 kb/s (2,6 Mo), sans métadonnées, et les silences de début et de fin sont retirés pour que la boucle n'ait pas de trou. La musique ne se télécharge qu'au lancement du jeu (le geste qui ferme l'écran titre, seul moment où un navigateur autorise le son), monte en fondu jusqu'à un volume bas, se fait plus discrète pendant les dialogues, s'arrête quand l'onglet est caché. Bouton en haut à droite et touche M pour la couper ; le choix est retenu. Le volume passe par un gain Web Audio : sur iPhone, le volume d'un élément audio est ignoré. Le crochet de pré-commit a dû apprendre à sauter les fichiers binaires, dont les octets passaient pour des tirets longs.

**Passe de QA.** Tour du village en captures, avec pour grille ce qui fait la patte d'Octopath Traveler. Ce qui n'allait pas, et ce qui a été fait :

| Écart relevé | Correction |
|---|---|
| Le socle flottait dans le vide : ciel rose au bord de la muraille, coupe du socle au sud | **Monde extérieur** (`world/outskirts.js`) : plateau au niveau des falaises au nord et à l'est, plaine à l'ouest et au sud, routes qui filent vers l'horizon, forêt de lisière, puis la brume |
| La rivière sortait d'un mur de falaise | **Cascade** (`gfx/fx/waterfall.js`) : la rivière vient du plateau et tombe dans le village, filets d'écume, bouillons au pied, brume ; la rivière **coule** désormais (texture qui défile vers le sud) |
| Chemins et place en carrés parfaits | **Lisières** (`gfx/fringes.js`) : des taches d'herbe à bord dentelé, à cheval sur chaque bord herbe et chemin, lues dans la texture de l'herbe aux coordonnées du monde (invisibles côté herbe, dentelées côté chemin), et quelques taches d'usure au milieu des chemins |
| Haies en blocs | Haies abaissées et couvertes de grappes de feuillage |
| Place un peu vide | **Fanions** de couleur tout autour de la place, qui flottent au vent (`gfx/bunting.js`) |
| Lanternes d'ambiance sans lumière au sol | **Flaques de lumière** en anneaux tramés sous chaque lanterne et autour des feux (`gfx/lightpools.js`) |
| Peu d'objets de vie | Terrasse de l'auberge (tables, bancs, chopes), pots de fleurs aux portes, poteaux indicateurs, tas de bois de la forge |
| Décor immobile | **Feuilles** qui tombent des arbres roux, **papillons** dans les prés (`gfx/fx/leaves.js`) |
| Bandeau de lieu resté affiché entre deux quartiers | Il s'efface quand on quitte un quartier |

Le parcours scripté a trouvé une régression : une table de la terrasse barrait le passage entre l'auberge et la route du sud. Elle a été déplacée ; 33 points sur 33 de nouveau.

**Mode allégé sur téléphone** (écran étroit) : forêt de lisière moins profonde, un tiers de touffes d'herbe en moins.

Mesures (navigateur intégré) : 99 à 104 appels de dessin en bureau, 89 en mobile ; 49 500 triangles en bureau, 36 900 en mobile ; 0 % de pixels saturés ; aucune erreur. Le coût d'une image, GPU compris (`__lia.bench`), passe de 0,42 à 0,71 ms sur le poste de développement. Les images/s ne sont pas mesurables cette fois (panneau du navigateur intégré masqué) ; sur téléphone, c'est la mesure de Jordan qui tranchera.

## Personnages redessinés et sons d'ambiance (5 octobre 2026)

**Personnages.** Après la refonte du décor, les sprites étaient un cran en dessous. Le générateur (`gfx/sprites.js`) a été réécrit, toujours sur des cadres de 32 × 32 et sans une image chargée :

- **Coiffures en volume** : un volume plus large que le crâne, une frange dentelée, de fines mèches plus sombres et un reflet clair. Six styles : court, long (les cheveux tombent sur les épaules, dans le dos), chignon, queue de cheval, hérissé, chauve (une couronne à hauteur des oreilles).
- **Visages** : yeux de deux pixels avec un reflet blanc, bouche, joues roses, nez qui dépasse du profil, ombre de la frange sur le front.
- **Tenues** : tunique (col en V bordé, ceinture et boucle, plis, poignets) ou robe longue évasée (ourlet, ceinture de robe, plis). Reflet sur la tige des bottes.
- Coiffure et tenue entrent dans le format des personnages comme **champs facultatifs** (`coiffure`, `tenue`) : les fiches existantes restent valables.
- Les accessoires ont été recalés sur la nouvelle tête (casque et foulard plus larges, lunettes autour des yeux, barbes plus longues), la capuche du héros s'ouvre sur le visage, et Berthe, qui était toute orange, passe en bordeaux avec un foulard crème et une cruche brune.
- Outil de QA : `__lia.portraits(on, ids, échelle)` affiche les personnages en grand dans leurs quatre directions.

**Sons d'ambiance** (`core/ambience.js`), tous fabriqués par Web Audio, sans aucun fichier :

| Son | Fabrication | Comportement |
|---|---|---|
| Rivière | bruit filtré en bande | volume selon la distance au tracé de la rivière, panoramique gauche-droite |
| Cascade | bruit grave et plein | plus fort au pied de la chute, audible de loin |
| Feux | souffle grave et craquements brefs, en boucle | près du foyer de la forge et du feu de camp |
| Vent | bruit très grave | partout, il respire lentement |
| Oiseaux | deux à cinq notes qui glissent vers l'aigu | au hasard toutes les deux à sept secondes, à gauche ou à droite |
| Pigeons | « rou-rou » grave et chevrotant | près du colombier |
| Forge | trois partiels métalliques et un choc | près de l'enclume, deux coups rapprochés puis une pause |
| Pas | bref souffle filtré selon le sol | pavés secs, terre sourde, herbe qui froisse, à chaque foulée |

La caméra ne tourne jamais : la droite de l'écran est toujours l'est, le panoramique vient directement de l'écart en x. Musique et ambiance passent sous un même volume général : le bouton (rebaptisé « Couper le son ») et la touche M coupent tout, et le contexte audio se met en pause quand l'onglet est caché ou le son coupé.

Mesures : parcours scripté 33 sur 33, 97 appels de dessin, 0 % de pixels saturés, aucune erreur. Les volumes des sources ont été vérifiés par position (près de la cascade : rivière 0,16 et cascade 0,16 ; à la forge : feu 0,10 ; sur la place : tout à 0). Le rendu sonore, lui, reste à écouter : je ne peux pas entendre.

## Étape 3 : dialogues et quête (5 octobre 2026)

**But** : que chaque habitant enseigne sa notion, pose sa question et remette son parchemin, jusqu'au diplôme.

**Les textes d'abord.** Les huit artisans ont été écrits avant d'être branchés, d'après le brief pédagogique du plan : une présentation de deux pages, une leçon de quatre ou cinq, une question à trois choix avec une réponse pour chaque choix (drôle et exacte quand elle est fausse), la remise du parchemin et une variante courte pour les visites suivantes. Les biais et le coût en tokens sont chez Dame Marjolaine, avec la fenêtre de contexte. Un script en tire un export lisible pour la relecture de Jordan, avec chaque variante (avec ou sans prénom, avant ou après le parchemin, selon le nombre de parchemins pour Lia et Clodomir). Une passe d'écriture a retiré les énumérations par trois en série et les phrases qui commençaient toutes par « Et », et rendu deux faits exacts : le plan du village a été écrit avec l'aide d'une autre IA, et « aucune image » ne veut pas dire « aucun fichier » (la musique en est un).

**La mécanique** (`game/quest.js`), le seul endroit qui enchaîne les morceaux de `data/dialogues.js` :

| Situation | Ce qui se joue |
|---|---|
| Première visite | présentation, leçon, question |
| Mauvaise réponse | sa réponse, puis la question de nouveau, le choix essayé grisé et barré |
| Bonne réponse | sa réponse, le parchemin (sauvegardé aussitôt, compteur animé), la remise |
| Retour sans le parchemin (conversation fermée avec Échap) | variante « on reprend », puis leçon et question |
| Retour avec le parchemin | variante courte |
| Clodomir, tant qu'il manque des parchemins | sa présentation seule, avec le nombre manquant |
| Clodomir, les huit réunis | sa leçon (comment ce village a été construit), sa question, puis le diplôme ; à chaque visite suivante, le diplôme se rouvre |

L'ordre est libre. Lia compte les parchemins restants et nomme le prochain artisan dans l'ordre des notions (prompt, contexte, hallucinations, mémoire, connecteurs, agents, sécurité), avec le quartier où le trouver.

**La question dans la boîte de dialogue** (`game/dialogue.js`) : le texte se tape, puis trois boutons empilés de 46 pixels au moins. On répond d'un toucher, d'un clic, au chiffre, ou en montant et descendant (flèches, Z et S) puis avec la touche d'action. Aucun choix n'est présélectionné : enchaîner les pages à la touche E ne répond jamais par mégarde, il faut une pression de plus pour éclairer le premier choix. La bonne réponse change de place d'une question à l'autre (trois fois chaque position) et `__lia.checkDialogues()` vérifie qu'elle ne se devine pas à sa longueur (à 15 % de la moyenne des deux autres).

**Le compteur** (`game/scrolls.js`) : huit parchemins roulés dessinés en CSS, dans une pilule en haut à gauche, vides puis dorés avec un ruban rouge. À l'obtention, l'emplacement grossit et brille, et une annonce donne la notion gagnée. Sur écran étroit, le bandeau de lieu passe dessous.

**Le diplôme** (`game/diploma.js`), dessiné sur un canvas de 1 600 × 1 130 : un parchemin tiré au hasard (avec une graine, il est le même à chaque fois), un double filet d'or, le titre, le prénom (ou une ligne pointillée à remplir), les huit notions sur deux colonnes, la date, un sceau de cire aux trois lettres en creux et ses rubans, les signatures de Clodomir et de Lia, la signature de l'auteur, le site et l'adresse du jeu. Un champ permet de taper son prénom au dernier moment : le diplôme se redessine et le prénom est sauvegardé. Boutons « Télécharger » et « Copier le lien du jeu ».

**Formats.** Deux précisions, sans rien casser : une entrée de `dialogues.js` peut porter `diplome: true` (l'habitant remet le diplôme au lieu d'un parchemin), et `choix` garde, pour chaque question réussie, l'indice de la bonne réponse, ce qui dit aussi si le diplôme a été remis. Les notions et l'ordre des emplacements du compteur sont dans `textesInterface.parchemins`.

Ce qui a résisté :

- **Le poids du diplôme.** Le plan prévoyait un PNG : 2,8 Mo, parce que le grain du parchemin ne se compresse pas. Il est enregistré en JPEG (qualité 0,92), autour de 300 Ko, ce qui compte pour un partage depuis un téléphone.
- **La copie du lien** est refusée dans le navigateur intégré (permission d'écriture du presse-papiers). Si un navigateur la refuse, le bouton affiche l'adresse du jeu pour qu'on la recopie.
- **Les tests au clavier simulé** : la porte de chargement avale toutes les touches tant que six images n'ont pas été dessinées, et la boucle ne tourne pas quand le panneau est masqué. Un test commence donc par `__lia.step(10)`.

Outils de test ajoutés à `window.__lia` : `answer(i)` répond à la question affichée, `act()` fait l'action comme la touche E (parle à l'habitant à portée), `converse(id, mode)` joue toute une conversation (mode `erreurs` : les mauvaises réponses d'abord), `give(ids)` donne des parchemins, `diploma(on)` ouvre le diplôme.

### Mesures

Navigateur intégré, bureau, préréglage mobile 375×812 et paysage 812×375, zéro erreur en console.

| Critère | Résultat |
|---|---|
| Parcours depuis une partie neuve | Clodomir d'abord (il renvoie chercher les parchemins), puis les huit dans le désordre, chaque fois les deux mauvaises réponses avant la bonne : 8 parchemins, 9 choix enregistrés, le diplôme s'ouvre |
| Parcours depuis une sauvegarde partielle | deux parchemins, une conversation fermée avec Échap pendant une leçon, page rechargée : l'écran titre propose de reprendre, le compteur affiche 2 sur 8, Lia envoie chez Dame Marjolaine, qui reprend sa leçon |
| Interaction réelle | téléporté près de chacun des neuf habitants : la bulle s'affiche, l'action ouvre sa conversation |
| Clavier | flèches et Z/S sautent le choix grisé, E choisit, Échap ferme |
| Textes | `checkDialogues()` vide : pages de 158 caractères au plus, aucun tiret long, trois choix dont un bon, bonnes réponses de longueur équilibrée |
| Mobile 375×812 | question et trois choix lisibles sans zoom, compteur, bouton du son et bandeau de lieu sans chevauchement, diplôme et ses boutons tiennent dans l'écran, aucun défilement |
| Appels de dessin | 94 à 102 selon le cadrage, exactement autant pendant une conversation ou avec le diplôme ouvert (102, 102, 102 au même endroit) |
| Pixels saturés | 0 % |
| Réseau | HTML, CSS, JavaScript, les deux polices et la flamme : aucune autre image |

Reste pour l'étape 4 : en paysage sur téléphone (812×375), la question et ses trois choix couvrent les trois quarts de l'écran, à compacter avec le reste de l'interface des écrans courts.

## Étape 3b : partage, grimoire, leçon facultative (6 octobre 2026)

**But** : soigner le joueur visé, quelqu'un qui arrive seul depuis un post LinkedIn, sur son téléphone, et qui doit avoir envie d'aller au bout puis de partager. Six améliorations choisies avec Jordan après l'étape 3 ; mesure d'audience, version anglaise et nouvel habitant écartés.

- **Leçon facultative.** Après sa présentation, chaque habitant demande « Je t'explique d'abord, ou tu tentes directement ma question ? ». Le joueur pressé fait une conversation en quatre pages au lieu d'une dizaine ; la leçon reste dans le grimoire. Les huit phrases de reprise (on revient sans avoir gagné le parchemin) disaient « on reprend la leçon depuis le début » : elles proposent maintenant de reprendre, et l'offre suit. La boîte de dialogue sait poser une question à deux choix, et dit aux tests s'il s'agit de l'offre ou de la vraie question.
- **Grimoire** (`game/grimoire.js`). Le compteur de parchemins devient un bouton : il ouvre un livre, une page par notion, avec l'habitant, sa maxime et sa leçon complète, une page vierge pour les parchemins à trouver (« Berthe garde ce parchemin quelque part dans le village »). Onglets en petits parchemins, boutons Précédente et Suivante, flèches ou A et D au clavier, G pour l'ouvrir et le fermer, Échap. La page défile seule si la leçon est longue, jamais l'écran. L'annonce d'un parchemin gagné dit où le relire. Chaque entrée de `dialogues.js` porte sa `maxime` (champ facultatif), et `checkDialogues()` vérifie qu'elle est bien celle que l'habitant prononce.
- **Mention sur le diplôme**, selon les mauvaises réponses de toute la partie : « avec les félicitations du village » sans aucune, « mention très bien » à une ou deux, « mention bien » jusqu'à cinq, rien au-delà. L'état de partie gagne un champ `erreurs` ; une sauvegarde plus ancienne, qui ne l'a pas, se relit sans erreur (il vaut alors zéro).
- **Partager en un geste.** Sur un appareil qui sait partager une image (Web Share, surtout les téléphones), le bouton « Partager » devient le bouton principal du diplôme : la feuille de partage s'ouvre avec le JPEG et un texte sobre qui finit par l'adresse du jeu. L'image est préparée après chaque dessin, parce que Safari n'ouvre la feuille que dans le geste lui-même, sans attente. Ailleurs, le bouton n'apparaît pas et Télécharger reste le principal.
- **Accroche** sous le titre : « Huit notions d'IA, un village, dix minutes ».
- **Répliques des figurants** (`game/chatter.js`). Les trois apprentis et les pigeons du colombier parlent quand on passe près d'eux : une bulle de parchemin au-dessus de la tête, le temps de la lire, une réplique par passage, à tour de rôle. Rien pendant une conversation ou quand un écran est ouvert.

Ce qui a résisté :

- **Le partage n'est pas testable ici** : le navigateur intégré n'a pas Web Share. Le chemin du bouton a été vérifié avec une fonction de partage simulée (fichier JPEG de 275 Ko, titre et texte transmis) ; le vrai test se fait sur téléphone.
- **Le focus du compteur** : devenu bouton, il doit rendre le focus au jeu après un toucher, sinon Espace et Entrée resteraient pris par lui au lieu de faire parler les habitants.

### Mesures

| Critère | Résultat |
|---|---|
| Offre de leçon | « directement la question » : conversation de Maître Ferrand en 4 pages ; avec la leçon : 11 pages chez Basile |
| Erreurs et mention | une erreur chez Lia, deux chez Basile : enregistrées et sauvegardées ; trois erreurs en tout donnent « mention bien » sur le diplôme |
| Grimoire | ouvert au toucher du compteur sur la dernière notion gagnée ; flèche droite vers une page vierge ; G ferme et rouvre ; Échap ferme ; G ne fait rien pendant une conversation |
| Figurants | l'apprenti de la forge, les pigeons et un apprenti du chantier parlent quand on approche ; la réplique suivante vient au passage suivant ; rien quand on est loin |
| Sauvegarde ancienne | sauvegarde de l'étape 3 sans `erreurs` : relue, partie continuée, erreurs comptées ensuite |
| Mobile 375×812 | grimoire plein écran, texte lisible sans zoom, la page défile seule, aucun défilement de la page |
| Textes | `checkDialogues()` vide, répliques comprises |
| Appels de dessin | 95, inchangés |
| Console | aucune erreur |

## Étape 3c : The Legend of Elelhem (6 octobre 2026)

**But** : Jordan fait du village un petit RPG avec une histoire. Le jeu s'appelle désormais **The Legend of Elelhem : La Magie de Lia**. Elelhem (un seul l) est le nom du village, et LIA n'est plus un personnage : c'est la magie du monde, celle qui répond à tout, et les prompts y sont des **incantations**. Pas de combat ni de sort à lancer : on explore, on écoute, on répond.

**L'histoire.** La partie commence dans la **maison du héros**, de l'autre côté du pont. Sa sœur **Claudette** (un clin d'œil à Claude) le réveille et lui confie la quête : rassembler les huit parchemins des maîtres d'Elelhem pour devenir apprenti mage. Elle parle la première, sans qu'on ait rien à toucher, puis l'attend sur la place pour lui dire où aller. **L'Oracle Gépété**, vieux magicien qui sait tout et se trompe parfois avec aplomb, reprend la leçon sur les grands modèles de langage : il en est lui-même l'illustration. Il explique aussi le nom du village (« èl, èl, hem », LLM). Clodomir remet le diplôme d'apprenti mage, signé avec Gépété. Le format des dialogues gagne deux champs facultatifs, `guide` (Claudette, qui n'enseigne rien) et `boutique` (Berthe) ; celui des personnages, `lieu` (la pièce où l'on se tient) et `depart` (où l'on attend au tout début).

**Les intérieurs** (`world/interior.js`, `world/rooms.js`, `world/furniture.js`, `game/doors.js`). La maison du héros, l'auberge et la forge ont chacune une pièce : une scène à part, bâtie comme le village (une grille de cases, plancher, murs au nord et sur les côtés, un muret bas au sud pour voir dedans comme dans une maquette ouverte), avec un mobilier fait de boîtes fusionnées par matière : lit, cheminée, coffre, table et bougies chez le héros ; comptoir, étagère de bouteilles, cheminée, tables et bougies à l'auberge, où Berthe passe derrière son comptoir ; four de briques rougeoyant, râtelier d'outils, enclume à la forge. La lumière vient du feu, des bougies et du jour qui entre dans l'axe du soleil du village. On entre en poussant la porte vers le nord, on ressort en franchissant le seuil vers le sud, dans un fondu au noir. Dedans, la caméra se rapproche, la minimap se cache, le bandeau donne le nom de la pièce, la rivière et les oiseaux se taisent, le vent s'étouffe, le plancher sonne creux sous les pas.

**La minimap** (`game/minimap.js`) : en haut à droite, le village dessiné depuis la grille de la carte, le héros en flèche, un point doré pour chaque maître qui a encore une leçon à donner, un point bleu pour Claudette ; un habitant dans une pièce est montré à la porte de sa maison. Un toucher, ou la touche C, ouvre la carte en grand avec le nom des quartiers.

**Les Tokens** (`data/tokens.js`, `game/wallet.js`, `game/shop.js`), la monnaie d'Elelhem, comme les morceaux de mots que la magie LIA facture : 10 par parchemin, 20 pour le diplôme, 2 par lieu découvert pour la première fois, 5 par coffre ouvert dans les pièces. Ils se dépensent chez Berthe, qui propose ses tenues une fois son parchemin gagné : cinq capes (voyage, écarlate, des bois, de nuit, habit d'apprenti mage) qui recolorent le héros.

**Musique** : baissée de 20 %, à la demande de Jordan.

Ce qui a résisté :

- **Les pièces étaient noires avec le post-traitement**, et visibles sans lui. Le fond uni d'une scène pousse three.js à effacer l'écran à chaque rendu ; la dernière passe, celle des sprites, effaçait donc l'image composée juste avant de dessiner les personnages. La passe des sprites retire le fond le temps de son rendu.
- **La porte ne s'ouvrait pas en biais.** Le passage dépendait du regard du sprite, qui garde sa direction sur une diagonale ; au joystick, on pousse rarement droit. C'est maintenant la direction demandée par le joueur qui compte.
- **Le héros s'est retrouvé la tête en bas** après son premier achat : la nouvelle planche était recopiée avant son retournement pour la carte graphique.
- **Une maison dans la prairie** : un arbre de la lisière a dû reculer de deux cases pour lui faire de la place.

### Mesures

| Critère | Résultat |
|---|---|
| Partie neuve | réveil dans la maison, Claudette parle d'elle-même, sortie en biais par le seuil, Claudette déjà sur la place, les huit parchemins (Berthe dans l'auberge), diplôme d'apprenti mage |
| Portes | entrée en poussant vers le nord devant l'auberge, sortie vers le sud ; bandeau, minimap et sons suivent |
| Tokens | coffre de la maison ouvert en approchant (+5) ; découvertes et parchemins payés une fois ; achat de la cape écarlate (29 à 14 Tokens), le héros change de couleurs, la tenue survit au rechargement |
| Textes | `checkDialogues()` vide (Claudette contrôlée comme guide) |
| Mobile 375×812 | parchemins, bourse dessous, minimap, son, bandeau en dessous : aucun chevauchement |
| Coût d'une image (`__lia.bench`) | 0,83 ms dehors (101 appels de dessin, 37 800 triangles), 0,62 ms à l'auberge (40 appels, 2 300 triangles) |
| Pixels saturés | 0 % dehors comme dedans |
| Console | aucune erreur |

Nouvelle clé de sauvegarde (`elelhem-v1`) : une partie de l'ancien village ne se reprend pas. Reste à relire par Jordan : tous les textes nouveaux de l'étape 3b et de cette étape.

## Étape 4 : le tactile (6 octobre 2026)

**But** : un jeu qui se joue vraiment au pouce, puisque la plupart des joueurs arrivent d'un post LinkedIn, sur leur téléphone, souvent en le tenant à deux mains.

**Le joystick complet** (`createTouchControls` dans `core/input.js`). Le stick naît sous le pouce dans le bas de l'écran (le tiers haut reste au HUD et au bandeau), du côté gauche par défaut. Rayon 64 px, zone morte 13 %. Jusqu'à 85 % de la course, on marche, d'autant plus vite qu'on pousse loin ; au-delà, on court, à 1,6 fois la vitesse de marche, et l'anneau se dore. Au clavier, Maj fait courir. Le centre suit le doigt s'il dépasse le rayon, un seul doigt tient le stick, capturé pour ne pas le perdre hors du canvas.

**Le pincement** : deux doigts sur le canvas zooment, dans les bornes de la molette. Le second doigt posé prend le relais du joystick (le héros s'arrête) ; quand un doigt se lève, celui qui reste redevient le joystick s'il est de son côté, recentré sous lui pour que le héros ne parte pas tout seul. Un troisième doigt ne compte pas.

**Le bouton d'action** (`createActionButton` dans `game/ui.js`) : 74 px, en bas à droite, seulement sur écran tactile. Une étincelle discrète au repos ; un habitant à portée, il devient la bulle, sur fond de parchemin. Il agit dès que le doigt se pose, comme un bouton de manette, et se cache pendant une conversation : la boîte de dialogue, en bas, se touche elle-même pour avancer.

**La main gauche** (`game/settings.js`) : sur l'écran titre, un bouton « Joystick à gauche » passe le joystick à droite et le bouton d'action à gauche. C'est un réglage de l'appareil, gardé à part de la partie : une nouvelle partie ne l'efface pas.

**Les garde-fous** (`core/guards.js`) : `user-scalable=no`, gestes de Safari bloqués (il ignore la balise pour le pincement), double toucher, menu du doigt long (sauf dans le champ du prénom et sur le lien du site), deux doigts sur un panneau. Safari ne grossit plus le texte en paysage.

**Le paysage** (écrans de 480 px de haut au plus) : HUD sur une ligne, minimap à côté du son, bandeau de lieu dessous ; boîte de dialogue compacte, deux lignes réservées au lieu de trois, et les choix d'une question côte à côte au lieu d'empilés. L'écran titre passe sur deux colonnes, la flamme grande à gauche ; le diplôme prend toute la hauteur, ses boutons à droite.

Ce qui a résisté :

- **Un second doigt ne fait pas de « click ».** Un navigateur de téléphone ne fabrique pas de click pour un doigt qui touche l'écran pendant qu'un autre y est posé : en paysage, le pouce gauche tient le joystick quand le droit touche la minimap ou la boîte de dialogue. Les boutons du jeu (boîte de dialogue, choix, bulle, compteur, minimap, son) écoutent maintenant le doigt posé puis relevé (`onTap` dans `core/input.js`), qui arrive pour chaque doigt.
- **Une porte ne s'ouvrait qu'en poussant fort.** Le test demandait une direction déjà longue vers le nord ; au joystick poussé à 40 % en biais, jamais. Seule l'orientation du geste compte désormais.
- **L'annonce d'un parchemin et le bandeau de lieu ne se cachaient jamais.** Leur animation de sortie les rendait transparents, mais ils restaient dans la page ; avec le mouvement réduit, sans animation, ils restaient visibles pour toujours. Ils se cachent après leur sortie. Sur téléphone, l'annonce tombe là où passe le bandeau : tant qu'elle est là, le bandeau s'efface.
- **En paysage, la boutique de Berthe débordait** : le bouton Fermer tombait à 548 px sur un écran de 375. Seule la liste rapetisse et défile désormais.
- **L'écran titre débordait** en paysage (de 73 px) et sur un petit téléphone en portrait avec une sauvegarde (de 42 px à 375 × 667).

### Mesures

Navigateur intégré, gestes rejoués par des événements de pointeur tactiles.

| Critère | Résultat |
|---|---|
| Joystick | décalage de 5 px : immobile ; 20 px : 0,37 ; 40 px : 0,73 ; 54 px : 0,99 (marche) ; 56 px et plus : 1,6 (course), anneau doré |
| Pincement | écart des doigts de 291 à 361 px : zoom de 1 à 1,24 ; relais au joystick quand un doigt se lève ; trois doigts ignorés |
| Main gauche | joystick seulement à droite, bouton d'action à gauche ; le réglage survit au rechargement |
| Bouton d'action | bulle à portée de Claudette, conversation ouverte avec le pouce gauche resté sur le joystick, caché pendant la conversation |
| Portes au joystick | poussée à 40 % et à 35° du nord : les trois portes s'ouvrent, les trois seuils se franchissent |
| Mobile 375 × 812 | aucun chevauchement : HUD, bandeau, annonce, dialogue, bouton d'action |
| Paysage 812 × 375 | aucun chevauchement ; question et choix sur 33 à 39 % de la hauteur (environ 75 % avant) ; titre de 37 à 337 px ; diplôme de 497 px de large (262 avant) |
| Cibles tactiles | toutes à 44 px de haut au moins ; onglets du grimoire 42 × 44 px à 375 px de large (28 × 34 avant) |
| Bureau 1280 × 720 | inchangé, pas de bouton d'action ; Maj : 1,6 fois plus vite |
| Partie complète | les huit parchemins avec erreurs puis bonne réponse, diplôme ; `checkDialogues()` vide |
| Coût d'une image (`__lia.bench`) | 0,63 ms dehors, 95 appels de dessin, 37 700 triangles : rien de changé, tout est en DOM |
| Console et réseau | aucune erreur ; HTML, CSS, JavaScript, police et flamme seulement |

Reste à mesurer sur un vrai téléphone, ce que le navigateur intégré ne sait pas faire : images par seconde avec `?debug`, deux pouces en même temps, pincement, gestes de Safari, partage du diplôme.

## Étape 5 : générique, image de partage, nouvelle adresse (6 octobre 2026)

**But** : les finitions d'avant la mise en ligne. Ce que voit quelqu'un qui reçoit le lien (l'aperçu sur LinkedIn), et ce que voit celui qui va au bout du jeu.

**La nouvelle adresse** : le dépôt devient `elelhem`, le jeu https://amael-alt.github.io/elelhem/. Choix de Jordan, avant que le lien ne circule : GitHub Pages ne redirige pas l'ancienne adresse.

**Le générique de fin** (`game/credits.js`). Quand on referme le diplôme que Clodomir vient de remettre, les noms défilent sur le village assombri : la conception (Jordan Goussery), le code (Claude Code), les habitants (leurs noms lus dans leur fiche), la musique, les décors générés, three.js, la police, puis « Merci d'avoir joué » avec le prénom, qui s'arrête au milieu de l'écran. Un toucher, un clic, Échap ou la touche d'action le referment. Il ne se joue qu'à la remise : revenir voir Clodomir rouvre le diplôme, pas le générique. Avec le mouvement réduit, rien ne défile tout seul, le texte se lit d'un bloc.

**L'image de partage** (`assets/social-preview.png`, 1200 × 630), celle qu'affichent LinkedIn et les autres sous le lien : l'écran titre en mode `?vignette`, sur deux colonnes, la flamme grande à gauche, le titre, la contrée, l'accroche et la signature à droite, sur la place du puits. Elle est capturée par `outils/vignette.mjs` : un Edge ou un Chrome sans fenêtre, piloté par son protocole de débogage avec le WebSocket de Node, sans aucune dépendance. Même la vignette est fabriquée par le code. Balises `og:` et `twitter:card`, adresse canonique ; la page, elle, ne charge jamais cette image.

**Le favicon** : l'étincelle dorée de la magie LIA, celle du bouton d'action, sur fond nuit, en SVG écrit dans la page.

**L'écran titre sur écran large** (ordinateur, tablette, téléphone en paysage) passe aussi sur deux colonnes, comme la vignette : la flamme y mesure de 240 à 470 px de haut, au lieu de 200 au mieux.

**Le README** raconte comment le village a été construit : les étapes, ce que le code fabrique, ce qui a résisté, le poids de la page.

Ce qui a résisté :

- **L'écran titre débordait sur un portable** (1366 × 657) dès qu'une sauvegarde ajoute « Nouvelle partie ». Et le resserrage de l'étape 4, prévu pour les téléphones courts, touchait aussi les portables de 720 px de haut : la flamme y était tombée de 201 à 173 px. Les deux colonnes règlent les deux ; le resserrage ne vaut plus que pour les écrans étroits.
- **La touche qui ferme le générique rouvrait la conversation** avec Clodomir, resté juste à côté. Elle est arrêtée avant d'atteindre le jeu.
- **Les noms passaient nets sous le rappel du bas** : un fondu les fait apparaître et s'effacer, en haut comme en bas.

### Mesures

| Critère | Résultat |
|---|---|
| Générique | joué à la fermeture du diplôme remis, 33 s en portrait, remerciement centré (390 px sur 812) ; fermé au toucher, à Échap, à Espace ; pas rejoué en revenant voir Clodomir |
| Écran titre avec une sauvegarde | 1920 × 950 : de 229 à 721 px, flamme de 470 ; 1366 × 657 : de 94 à 563, flamme de 421 ; 1024 × 768 : de 144 à 624 ; 812 × 375 : de 63 à 312 ; 667 × 375 : de 31 à 344 ; 375 × 812 : de 31 à 781 ; 375 × 667 : de 29 à 638 |
| Image de partage | 1200 × 630, PNG de 966 Ko, sans métadonnées, jamais demandée par la page |
| Poids de la page | 77 fichiers, 1,4 Mo, 528 Ko transférés en ligne (mesurés sur l'adresse publique) ; la musique (2,6 Mo) au lancement seulement |
| Partie complète | les huit parchemins avec erreurs, diplôme, générique ; `checkDialogues()` vide ; adresse de partage à jour |
| Console et réseau | aucune erreur ; HTML, CSS, JavaScript, police et flamme seulement |

## Étape 6 : version 1.0 (6 octobre 2026)

**But** : publier une version qu'on peut partager, et la marquer.

- **Vérification sur l'adresse publique**, https://amael-alt.github.io/elelhem/, au préréglage mobile 375 × 812 et sur un portable 1366 × 657 : réveil dans la maison avec Claudette, sortie par la porte au joystick, les huit parchemins avec erreurs puis bonne réponse, diplôme, générique ; `checkDialogues()` vide ; aucune erreur en console ; balises de partage et image de partage servies.
- **README final** : le lien de jeu en tête, les commandes au clavier et au doigt, les coulisses.
- **Étiquette `v1.0`** posée sur cette version.

Reste à mesurer sur de vrais téléphones, ce que le navigateur intégré ne sait pas faire : images par seconde, deux pouces en même temps, pincement, partage du diplôme. Les corrections qui en sortiront iront dans une version 1.0.1.
