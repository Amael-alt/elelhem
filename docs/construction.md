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

## Version 1.1 : les personnages en 32 × 48 (6 octobre 2026)

**État des lieux de la version 1.0**, après une partie complète dans le navigateur intégré (bureau 1889 × 1199, mobile 375 × 812, paysage 812 × 375), pour décider par quoi commencer la phase d'amélioration :

- Le rendu du décor est le point fort (lumière, flou, herbe, intérieurs). Trois faiblesses : les arbres en grappes de boules, le héros qui disparaît derrière les bâtiments et les arbres, les surfaces « bloc » (tour, murs intérieurs, cheminées).
- Les personnages étaient le maillon faible : cadres de 32 × 32, silhouette de deux têtes, yeux en blocs, bras de deux pixels, marche raide. La cape écarlate de la boutique rendait le héros gris sombre.
- Jouabilité : un quartier ne compte comme découvert que si l'on entre dans son rectangle, alors qu'on parle à Basile, Ferrand ou Clodomir depuis le chemin (7 quartiers sur 12 découverts en voyant tout le monde) ; des impasses derrière et à côté de l'auberge ; une économie molle (107 Tokens gagnés pour 95 de tenues).
- Textes : rien d'inexact. Les nombres en chiffres dans les répliques (« il te reste 4 parchemins ») et la fin de Clodomir, dense, à relire.
- Interface : les étiquettes de la carte se chevauchent sur 375 px, et son dessin en aplats détonne.
- Performance : 95 à 103 appels de dessin, 0 % de pixels saturés, aucune erreur ; le vrai téléphone reste non mesuré.

Jordan a choisi de commencer par les personnages, en s'inspirant des sprites d'Octopath Traveler : trois têtes, visage dessiné, marche vivante.

**Le nouveau générateur** (`gfx/sprites.js`) : cadres de 32 × 48 pixels à 24 pixels par unité, le personnage fait 40 pixels de haut (27 avant) pour 1,67 unité. Silhouette de trois têtes (tête 14 pixels, buste 14, jambes 12). Visage : sourcils, yeux de 2 × 2 avec un reflet, ombre du nez, bouche, joues, nez qui dépasse du profil, menton et cou ombrés. Cheveux : un volume, une frange dentelée, des mèches, une bande de reflet comme une laque ; les six coiffures sont reportées. Tunique : col en V, ceinture et boucle, plis, manches de la couleur du buste séparées par un trait, poignets, mains ; pantalon plus sombre et bottes à reflet et talon, les deux jambes jointes et séparées par un trait. Robe évasée, ourlet et ceinture en accent, plis. **Marche à six images** (contact, réception, passage, puis l'autre jambe) : le corps descend d'un pixel à la réception et remonte d'un pixel au passage, les jambes s'allongent ou se plient d'autant, la jambe libre se lève et sa botte avance, les bras balancent ; dix images par seconde, sept avant pour quatre images. **Repos** : deux temps de respiration et un clignement d'un tiers de seconde toutes les quatre secondes (la liste `IDLE_FRAMES` répète les colonnes, le moteur n'a pas changé). Les figurants marchent à 70 % de la cadence. La planche fait 288 × 192 pixels (192 × 128 avant).

**Les accessoires** (`data/characters.js`) : toutes les grilles redessinées, même format, une seule ancre par personnage pour les trois vues ; les grilles sont donc larges, pour que l'objet tenu dans la main droite passe à gauche quand on voit le personnage de dos. Les repères de la silhouette sont notés en tête du fichier.

**Les tenues** (`data/tokens.js`) : une tenue change maintenant la silhouette (`look` : accessoire, tenue, coiffure) en plus de la palette, par `habiller(hero, tenue)`. Cape écarlate longue, rouge vif ; cape des bois à bord dentelé et courroie ; cape de nuit à capuche baissée, les cheveux à l'air, semée de lucioles émissives ; habit d'apprenti mage, robe violette à liserés d'or et chapeau pointu à ruban d'or et étoile.

**Le héros**, à la relecture de la galerie par Jordan : plus de capuche, mais une tenue de voyage dans l'esprit d'Elliot (The Adventures of Elliot: The Millennium Tales, le jeu d'action HD-2D de l'équipe d'Octopath Traveler) : chapeau rouge à large bord et plume dorée, cheveux blond pâle, écharpe rouge dont le pan tombe sur l'épaule, veste claire barrée d'une sangle de cuir, bottes brunes. Pas d'épée, on ne se bat pas à Elelhem. La plume emprunte la rampe des cheveux, blond doré : aucune rampe de plus. Le libellé de la boutique suit (« Tenue de voyage »). Jordan a aussi fait recentrer le chapeau de l'Oracle Gépété, dont la pointe penchait de face.

Outils de QA : `__lia.galerie(lignes, échelle)` montre des poses choisies à l'échelle (`heros:nuit` pour une tenue, dernier paramètre pour nu-tête), `__lia.tenue(id)` habille le héros comme un achat.

Ce qui a résisté :

- **Des bâtons.** La première version, à bras et jambes séparés et manches plus sombres, faisait des personnages filiformes. Les manches ont pris la couleur du buste avec un trait sur le bord intérieur, les jambes se touchent, l'ourlet descend sur les hanches.
- **Un trou entre l'ourlet et les jambes** quand le corps remontait d'un pixel au passage : les hanches suivent le rebond, la jambe posée s'allonge d'autant.
- **La galerie invisible** : un panneau ouvert et capturé dans la même seconde n'était pas encore peint. Attendre.

### Mesures

| Critère | Résultat |
|---|---|
| Galerie | onze habitants, trois apprentis et quatre tenues lisibles à l'échelle 4 dans leurs quatre directions ; en jeu, l'étiquette et la bulle restent au-dessus des chapeaux |
| Grilles | contrôle des largeurs, des lettres et du cadre : valides (un pixel de pointe de chapeau rogné sur les images de passage, sans effet sur des habitants immobiles) |
| Coût d'une image (`__lia.bench`) | 1,6 à 2,1 ms, la même valeur avec ou sans les quatorze personnages : ils pèsent 18 appels et 36 triangles sur 97 et 50 000 |
| Pixels saturés | 0 % |
| Mobile 375 × 812 | héros d'environ 50 px de haut, visage lisible |
| Console | aucune erreur |

Vérifiée sur l'adresse publique en bureau et en mobile, étiquette `v1.1`.

## Version 1.2 : le héros visible derrière les obstacles (6 octobre 2026)

**But** : le défaut de jouabilité le plus gênant de l'état des lieux. Derrière l'auberge, le héros disparaissait sous le toit ; devant sa maison, l'arbre le cachait. Les RPG du genre montrent le héros en silhouette à travers l'obstacle.

**Le fantôme** (`createSprite(..., { ghost: true })` dans `gfx/billboard.js`, réservé au héros) : un second quad, enfant du sprite, qui suit sa position, son cadre et sa tenue. Même planche, teintée de bleu pâle (`ghostColor` de `data/palette.js`) et translucide à 50 %, sans éclairage, échantillonnage net et étalonnage comme le sprite. Avec le post-traitement, il ne se dessine que là où la scène est **à plus d'une unité devant lui** : les deux profondeurs sont ramenées en distance avec `uNear` et `uFar`, que le pipeline expose désormais aux sprites, pour que l'herbe haute à ses pieds ou un poteau tout contre lui ne déclenchent rien. Il respecte la profondeur des autres sprites : un habitant devant le héros le cache, fantôme compris. En rendu direct (`?nofx`), il se dessine derrière le tampon de profondeur (`GreaterDepth`), sans écart minimal.

Ce qui a résisté : la première version définissait sa fonction de linéarisation dans le corps du shader, GLSL n'accepte pas une fonction dans une fonction ; le programme refusait de se lier et la console se remplissait de « useProgram: program not valid ». La fonction est passée en tête du shader.

### Mesures

| Critère | Résultat |
|---|---|
| Derrière l'auberge (7,3 ; 18,7) | silhouette translucide à travers le toit, avec le post-traitement et en rendu direct |
| Derrière l'arbre de la maison (36,3 ; 8,4) | silhouette à travers le feuillage, bottes visibles dessous |
| Dans la prairie (35 ; 16), herbe haute | aucun fantôme parasite |
| Coût | un appel de dessin de plus (89 à 90), 2 triangles |
| Console | aucune erreur |

### Le flou et les pièces habitées

Avant de publier, Jordan a demandé deux choses de plus : un flou « réduit de 20 % pour que ce soit plus clair, sans perdre l'effet », et des maisons où l'on se sente bien, « comme dans les vrais RPG ». Ses choix : les intérieurs d'abord, les façades ensuite ; dedans, le flou presque coupé ; des pièces habitées.

**Le flou** (`gfx/post/dof.js`) : bande nette élargie de 20 % (demi-largeur de 0,10 à 0,12 de la hauteur d'écran) et rayon maximal réduit de 20 % (0,024 à 0,019). Les toits en haut de l'image et l'herbe en bas redeviennent lisibles, la maquette reste. **Dans une pièce**, le pipeline reçoit `setInterior(true)` quand on passe une porte : la bande nette couvre presque tout l'écran (demi-largeur 0,45) et le flou qui reste, celui de la profondeur, est atténué (× 0,6). On voit la pièce nette du plancher à la corniche. Dehors, rien ne change.

**Les boiseries** (`buildTrim` dans `world/furniture.js`, d'office pour chaque pièce d'après sa grille) : plinthe au pied des trois murs pleins, corniche à leur sommet, et sur l'enduit une lisse à mi-hauteur et des poteaux tous les 1,5 m, qui évitent ce qui est posé contre le mur nord (fenêtre, cheminée, étagère) ; sur le muret de façade, une main courante de part et d'autre du seuil, avec ses poteaux. Le dessus des murs d'enduit (`world/map.js`) est passé du plâtre au bois : vu d'en haut, le mur se lit comme une sablière, plus comme une dalle beige. Le fond derrière la pièce est un peu moins noir.

**Les meubles** (`world/furniture.js`), tous en boîtes fusionnées par matière comme avant, dix-sept de plus : applique murale (patte de fer, coupelle, bougie, flamme, sur le mur de son choix), rideaux à tringle, bibliothèque à rangées de livres de six couleurs avec une place vide de temps en temps, pupitre à parchemins roulés, livre ouvert et encrier, armoire à portes en panneaux, tabouret, lustre (chaîne, anneau, quatre bougies dont les flammes se voient, une seule lumière au centre), tonnelet couché à robinet, chaudron à crémaillère dans la cheminée, bottes d'herbes séchées, panier à linge, tapisserie encadrée, établi à étau, meule sur bâti, baquet de trempe, fers à cheval au mur, tas de charbon. Un meuble peut rendre plusieurs flammes (`flames`), des flammes qui n'éclairent pas (`noLight`) et des lumières à part (`lights`) : les pièces restent à quatre ou cinq lumières ponctuelles, pour le téléphone.

**Des murs minces et des pièces plus grandes.** À la première relecture, Jordan a trouvé les pièces « trop petites et étriquées », les murs « trop épais, grossiers ». Les cases de mur de la grille mesurent une unité : elles servent toujours aux collisions, mais le sol ne les dessine plus (`hidden` dans `world/map.js`, sauté par `world/terrain.js`) et `buildWalls` pose à leur bord intérieur une **cloison de 22 cm** (plâtre ou pierre), coiffée par la sablière de bois des boiseries ; le reste de la case est du vide, comme une maquette ouverte. Les trois pièces ont été **agrandies** : la maison passe de 5 × 4 à 8 × 6 cases de plancher, l'auberge de 8 × 5 à 11 × 7, la forge de 6 × 4 à 9 × 6, et la caméra recule un peu dedans (cadrage 0,62 au lieu de 0,55). Berthe et le point de départ de Claudette ont suivi (`data/characters.js`).

**Les pièces** (`world/rooms.js`) : chez le héros, le lit, une armoire à deux portes, une fenêtre à rideaux, la cheminée et sa marmite, des herbes qui sèchent, la bibliothèque des grimoires, le pupitre où l'on apprend avec son tabouret et sa bougie, une table et ses bancs, le coffre, un panier, trois appliques. À l'auberge, un long comptoir et le tonnelet derrière, trois tabourets, trois tables, la marmite au feu, des rideaux, deux tonneaux, un panier, le lustre au-dessus du tapis, trois appliques qui n'éclairent pas (le feu, trois bougies et le lustre suffisent). À la forge, le four et son soufflet, le râtelier, l'établi à étau, les fers au mur au-dessus du baquet de trempe, l'enclume, la meule, le tas de charbon, une caisse et un tonneau, deux appliques.

### Mesures

| Pièce | Avant | Après |
|---|---|---|
| Ta maison | 5 × 4 cases, 37 appels, 1 190 triangles, 2 lumières | 8 × 6, 41 appels, 2 980 triangles, 5 lumières |
| L'auberge | 8 × 5, 40 appels, 2 340 triangles, 4 lumières | 11 × 7, 39 appels, 4 070 triangles, 5 lumières |
| La forge | 6 × 4, 33 appels, 1 370 triangles, 3 lumières | 9 × 6, 36 appels, 2 120 triangles, 4 lumières |

Dehors, rien n'a bougé (89 à 101 appels). Partie neuve : réveil sur le tapis face à Claudette, sortie par le seuil, retour par la porte (la pièce s'ouvre sur son entrée), les trois pièces visitées ; console sans erreur dans un onglet neuf.

## Version 1.3 : écran titre lisible, intérieurs façon HD-2D (6 octobre 2026)

**But** : deux remarques de Jordan après avoir rejoué. Sur l'écran titre, les textes se lisaient mal sur les pavés et les fanions du village. Dans les maisons, « une espèce de filtre bleu, pas joli, un vieil effet cache-misère » : il voulait des intérieurs qui s'inspirent des vrais RPG en HD-2D (Octopath Traveler II, Final Fantasy), avec de la profondeur et du détail, « la beauté est dans le détail ». Référence regardée côte à côte avant de commencer : la taverne de Gil dans Octopath Traveler II (plancher de lattes sombres, lumière chaude et localisée, noir autour de la pièce, du détail partout).

**L'écran titre** (`styles.css`) : un voile en `::before`, flou (6 px) et un peu désaturé derrière les textes, masqué en ellipse pour que le village reste net sur les bords ; l'assombrissement du fond est monté (0,15 à 0,5 au centre) ; chaque texte porte un halo serré de 3 px sous son ombre large ; l'invitation est un peu plus grande et ne s'efface plus qu'à 60 % quand elle clignote. L'image de partage a été refaite (`node outils/vignette.mjs`).

**Le filtre bleu** venait de l'étalonnage (`gfx/post/composite.js`), pas de l'éclairage : la teinte scindée pousse les ombres vers le bleu et une remontée des noirs les tire vers le bleu-vert, deux réglages faits pour l'heure dorée du dehors, où le ciel éclaire ce que le soleil ne touche pas. Dans une pièce, sans ciel, ils posaient un voile froid sur le feu, le bois et le noir autour de la pièce. L'étalonnage reçoit maintenant `uInterior` (réglé par `pipeline.setInterior`, partagé avec les sprites) : dedans, les ombres tirent sur le brun, la remontée des noirs est coupée, la vignette passe de 0,45 à 0,62 et le bloom est ramené à 55 %. Le fond autour de la pièce est un noir chaud au lieu d'un violet sombre.

**Les intérieurs façon Octopath**, après quatre choix de Jordan : tout le lot d'un coup ; un soubassement de pierre sous la façade coupée ; une ambiance sombre et contrastée ; refaire l'image de partage.

- **Les sols** (`gfx/textures.js`) : un plancher de lattes (8 pixels de large, longues d'une à trois unités, décalées d'une rangée à l'autre, joint sombre, chanfrein, fibres, un nœud sur quatre lattes, un clou à chaque bout) dans une rampe de bois brun, à la place du bois rouge des colombages, qui faisait un bruit rouge sans lattes ; des dalles de pierre à la forge (Voronoï d'une unité, joints larges, éclats), avec un seuil de pierre (lettres `d` et `Q` dans `world/map.js`).
- **Les murs** : un enduit à la chaux ocre pour les intérieurs (`plasterIn`), un lambris de planches verticales de la plinthe à une cimaise à 0,95 m sur les trois murs d'enduit (`buildTrim`), des tableaux (un paysage naïf de 20 × 14 pixels dans un cadre de bois, `buildPainting`).
- **Le tapis** : une texture tissée à sa taille (16 pixels par unité, `createRugTexture`, un matériau par taille) : bordure crème entre deux filets, losanges d'or, franges. Il n'est plus une toile d'auvent rayée.
- **La lumière** (`world/interior.js`) : le jour vient maintenant des fenêtres du mur nord et tombe vers le sud-est (`DAY_DIRECTION`), moins fort (1,6 au lieu de 2,4) ; l'ambiance baisse (1,15 au lieu de 1,7) ; le feu monte (12, portée 8,5) et les bougies aussi (4,5, portée 5) : les coins restent dans l'ombre, le feu porte. **Des rais de lumière** (`gfx/fx/shafts.js`, nouveau) : par fenêtre, trois nappes translucides tendues de la fenêtre au sol dans la direction du jour, qui s'élargissent en descendant, et une tache claire sur le plancher ; mélange additif tramé sur quatre paliers comme les rayons du village, respiration lente, un appel de dessin par pièce. La forge a gagné une fenêtre. **De la poussière** flotte dans l'air (`createDust` prend maintenant une boîte fixe, un nombre, une taille et un éclat). La lueur au sol devant un feu est ramenée de 1,1 à 0,5.
- **Le soubassement** : sous le muret de façade, une assise de pavés de 0,4 (`BASE_DEPTH`), d'un angle à l'autre ; le socle du sol d'un intérieur ne descend plus jusqu'à la roche (`createTerrain` prend `baseHeight`), le flanc du seuil est en pavés.
- **La vaisselle** : une assiette et une miche sur les tables (`buildTableware`).

Ce qui a résisté :

- **Une bande rouge sous le muret**, prise pour un flanc de plancher : trois expériences (flancs en eau, muret en fer, main courante retirée) pour découvrir que c'était l'ombre de la main courante, projetée sur le muret par le jour qui venait du sud-ouest. Le jour venant maintenant du nord, le muret est dans l'ombre et le soubassement le porte.
- **La poussière** : à 70 grains d'un gros pixel, on aurait dit de la neige. Trente-six grains plus petits, moitié moins brillants.
- **Les tableaux sur les murs est et ouest** : la caméra regarde vers le nord, ces murs sont vus de profil, un tableau n'y est qu'un trait. Ils sont sur le mur nord.
- **La revue de sécurité** (skill `/security-review`, passée sur tout le code faute de diff) n'a rien trouvé dans le jeu publié : pas de HTML injecté, sauvegarde lue champ par champ, paramètres d'adresse lus comme des drapeaux. Une remarque sur le serveur local, qui écoutait sur toutes les interfaces et servait les fichiers cachés : il n'écoute plus que la boucle locale, sans fichiers cachés (`.claude/launch.json`).

### Mesures

| Pièce | Version 1.2 | Version 1.3 |
|---|---|---|
| Ta maison | 41 appels, 2 980 triangles | 54 appels, 3 234 triangles |
| L'auberge | 39 appels, 4 070 triangles | 50 appels, 4 476 triangles |
| La forge | 36 appels, 2 120 triangles | 38 appels, 2 160 triangles |

Pixels saturés 0 à 0,01 %. Console sans erreur, avec et sans post-traitement (`?nofx`). Écran titre vérifié en bureau et au préréglage mobile ; les trois pièces vérifiées en bureau et en mobile, la maison et l'auberge jusqu'au tapis et à la vaisselle. Dehors, rien n'a changé.

## Version 1.4 : personnages transcrits, portraits illustrés, proportions (6 octobre 2026)

Jordan a demandé une refonte en profondeur du design : des sprites « dans le style de The Adventures of Elliot », des illustrations façon manga quand une bulle de dialogue s'ouvre, des proportions corrigées (« on dirait des humains géants »), une interface plus grande, puis des mécaniques de RPG (forge, feuille de personnage, combat en temps réel hors les murs). Quatre choix ont ouvert le chantier : **les illustrations entrent dans le dépôt en fichiers et la règle « aucune image » est réécrite** ; **les sprites sont transcrits à la main en grilles de code** d'après des fiches dessinées ; **les proportions se mesurent sur de vraies captures** d'Octopath Traveler II et d'Elliot ; **le combat ira sur une lande hors les murs**, le village restant paisible. Cette version couvre les trois premiers points.

**Les mesures sur les références** (captures publiques des deux jeux) : un personnage mesure à peu près une porte, un étage fait un personnage et demi, une maison en compte quatre à six, un arbre trois à cinq. Les silhouettes font environ trois têtes et demie, pour une soixantaine de pixels de haut. Chez nous, un personnage faisait 1,67 unité pour des murs de 2,5 : une maison entière ne dépassait pas deux personnages et demi. Le problème n'était pas la taille des sprites à l'écran, mais celle des maisons.

**Les fiches.** Un générateur d'images (Higgsfield, modèle GPT Image) a d'abord dessiné le héros en pied, dans un style décrit par ses traits (dessin anime, aquarelle douce, encrage fin, palette chaude), sans citer de studio ni de jeu. Ce dessin a servi de référence de style aux dix habitants et à l'apprenti du chantier, puis chaque dessin a servi de référence à sa **fiche pixel art** : trois silhouettes sur une ligne (face, profil vers la gauche, dos), à la même hauteur, sur fond transparent. Les quatre tenues du héros ont leur fiche, dérivée de la sienne. Seize fiches, une trentaine d'images en tout, environ 1,5 crédit chacune ; les fiches et les dessins ne sont pas dans le dépôt.

**La transcription** (`outils/transcrire-sprite.mjs`, sans dépendance, module PNG dans `outils/png.mjs`) : la fiche est découpée en trois silhouettes par les colonnes vides, chacune réduite à la hauteur voulue (54 à 66 pixels selon le personnage et son accessoire) par moyenne de surface, la couleur de chaque case étant lue dans son noyau central pour ne pas mélanger les voisins ; les couleurs des trois vues sont regroupées en une palette de dix-huit tons (k-moyennes en Oklab, triées du sombre au clair), et chaque pixel devient un index. Le résultat est un module par personnage dans `src/data/sprites/`, lisible et retouchable : trois grilles de 48 × 72 caractères et une palette. Un aperçu PNG agrandi (réduction en couleurs vraies, puis en palette) sert au contrôle. Les pixels de lumière (le bâton de l'Oracle, la fiole de Basile, les lucioles de la cape de nuit) sont déclarés par leur index.

**Le nouveau générateur** (`gfx/sprites.js`) ne dessine plus de silhouette : il anime les grilles. Il trouve la ligne des hanches dans la vue de face (la plus haute ligne où un vide sépare les deux jambes ; sous une robe, seules les bottes bougent) et la reporte aux autres vues. De face et de dos, les jambes se lèvent tour à tour, le corps rebondit d'un pixel, les bords du buste balancent ; de profil, les jambes dessinées servent deux fois, cisaillées en sens contraires (une jambe arrière assombrie, une jambe avant). Les objets tenus loin du corps (bâton, hallebarde) ne bougent pas. Cadres de 48 × 72 à 36 pixels par unité : le héros fait 56 pixels, chapeau compris, soit 1,55 unité, un peu moins qu'une porte. Les fiches de `data/characters.js` ne gardent qu'un nom de planche et une palette (945 lignes deviennent 261) ; une tenue de la boutique est une planche de plus.

**Les portraits** (`outils/portrait.mjs`) : le buste de chaque dessin en pied, du haut de la tête aux hanches, réduit à 560 pixels de haut et enregistré en PNG à palette de 255 couleurs, avec une légère diffusion d'erreur : 78 à 120 Ko chacun, 1,1 Mo pour les onze, chargés en tâche de fond après l'écran titre. Dans la boîte de dialogue, le portrait se tient à gauche de la boîte sur grand écran (la boîte glisse vers la droite pour que l'ensemble reste centré), posé sur le bord haut de la boîte en écran étroit et sur téléphone (le cartouche du nom passe à droite), effacé en paysage bas. Un halo sombre le détache du village.

**Les proportions** : l'auberge (4,8), la bibliothèque (5,6, trois rangées de fenêtres) et l'apothicairerie (4,2) gagnent un étage, avec une lisse de plancher à mi-hauteur (`TALL_WALL`) et des fenêtres hautes ; la forge (3,3), la maison du héros (3,4) et la guérite grandissent d'un tiers ; la tour de l'architecte passe à 7,4, le colombier à 4,6, la muraille à 3,4, les arbres grandissent de moitié. En portrait, la caméra se rapproche un peu (`PORTRAIT_MAX` 1,65 au lieu de 1,9) pour garder le héros lisible sur téléphone.

Ce qui a résisté :

- **Quatre rampes ne suffisent pas.** La première transcription forçait chaque pixel dans les rampes de l'ancienne palette (peau, vêtement, accent, cheveux, cuir) : le pantalon brun et la veste crème du héros n'avaient pas de rampe à eux, le résultat était sale. D'où la palette propre à chaque sprite.
- **Le générateur d'images ignore la grille.** Ses « gros pixels » ne sont ni alignés ni réguliers : la réduction par moyenne de surface avec un noyau central donne un meilleur résultat que de chercher le pas.
- **Les limites de débit** du générateur : sept images sur onze refusées d'un coup (erreur 429), renvoyées par lots de trois ou quatre.
- **Les objets tenus** : la hallebarde de Rocard court sur toute la hauteur de la silhouette ; sans la zone des jambes bornée autour du centre, elle aurait été cisaillée en deux à chaque pas.

### Mesures

| Critère | Résultat |
|---|---|
| Planches | seize, de dix-sept ou dix-huit couleurs, grilles valides (48 × 72, pieds en 69) |
| Galerie | douze personnages en quatre directions et les cycles de marche du héros, de Gépété et de Berthe, lisibles à l'échelle 2 |
| Place du puits | 95 appels de dessin, 37 900 triangles, 49 programmes, 0,34 ms par image dans le navigateur intégré ; 0 % de pixels saturés |
| Portraits | 11 fichiers, 1,1 Mo, demandés seulement après le lancement ; aucune autre image avant |
| Dialogue | portrait vérifié à 1366 × 768 (à gauche), 800 × 450 (posé sur la boîte) et 375 × 812 (téléphone), paysage 812 × 375 sans portrait |
| Console | aucune erreur, dehors et dans la maison |

## Version 1.5 : interface plus grande et ornée (6 octobre 2026)

Jordan trouvait l'interface « un petit peu trop petite » et voulait des illustrations pour elle aussi. Les références (l'interface d'Elliot : filets d'ivoire fins, cadres ronds ornés, parchemin des menus, boutons en cercle) ont guidé cinq dessins générés d'un coup : un coin de filigrane d'or, un filet à losange, un cadre rond, une texture de parchemin et une ligne de quatre icônes (parchemin scellé, pièce à la flamme, épée, livre à la plume). Un nouvel outil, `outils/decouper.mjs`, découpe une planche à fond transparent en sujets séparés par les colonnes vides, les rogne et les réduit ; la texture passe par `portrait.mjs` sans cadrage pour devenir un PNG à palette de 512 pixels. Le tout pèse 508 Ko dans `assets/ui/`.

**Les coins** : un seul dessin, fait pour l'angle haut gauche, posé quatre fois et retourné par `scale` (horizontal, vertical, les deux) aux angles de la boîte de dialogue, du grimoire, de la carte et de la boutique (un élément `.coins` à quatre `span`, tailles par variables CSS : 68 px, 60 px dans la boîte, 48 px sur téléphone). Les losanges d'angle d'avant disparaissent. **Le filet** remplace les traits d'un pixel sous le nom du lieu et sous le titre du jeu, et souligne les titres de panneaux. **Les icônes** : le parchemin scellé ouvre la rangée des huit cases, la pièce remplace le disque dessiné en CSS. **Le parchemin** devient le fond des pages du grimoire. Le cadre rond et les icônes de l'épée et du livre attendent la feuille de personnage et le combat.

**Les tailles** : pastilles du HUD de 44 à 52 px (48 sur téléphone), minimap de 168 à 204 px (150 sur téléphone, 118 en paysage bas), bouton d'action de 74 à 86 px, bouton du son à 50 px, boîte de dialogue à 780 px et son texte jusqu'à 1,5 rem, choix de réponse à 52 px de haut. En paysage bas, les coins s'effacent et la boîte reprend ses petites marges.

Ce qui a résisté :

- **Deux fichiers du même nom** : l'icône du parchemin et la texture du parchemin s'appelaient tous deux `parchemin.png` ; la texture a écrasé l'icône, qui s'affichait comme un carré beige. Les icônes portent maintenant le préfixe `icone-`.
- **La boîte décalée sur téléphone** : la règle qui glisse la boîte vers la droite pour laisser la place au portrait, ajoutée en fin de feuille, l'emportait sur sa propre exception en écran étroit. Elle est maintenant sous `min-width: 1101px`.
- **La minimap en paysage bas** touchait le cartouche du nom : 118 px là où la hauteur manque.

### Mesures

| Critère | Résultat |
|---|---|
| Ornements | 8 fichiers, 508 Ko, demandés au lancement du jeu avec la feuille de style |
| Bureau 800 × 450 et 1366 × 768 | coins aux quatre angles de la boîte et des trois panneaux, filets, icônes nettes |
| Mobile 375 × 812 | HUD sur deux lignes, minimap à 150 px, boîte centrée avec le portrait posé dessus, texte à 1,14 rem |
| Paysage 812 × 375 | boîte sans coins ni portrait, minimap à 118 px, cartouche du nom dégagé |
| Console | aucune erreur |

## Version 2.0 : la lande, le combat, la forge et la feuille de personnage (6 octobre 2026)

Le dernier volet de la refonte : « qu'on ne reste pas sur le petit projet vibe codé », des mécaniques de RPG. Jordan a tranché par trois choix : un **enchaînement à trois coups** (touche J ou X, clic de souris, bouton épée sur écran tactile ; le troisième coup plus fort, avec une fente), cinq « clartés » en guise de points de vie et deux ennemis, le Mirage qui erre et le Fantôme qui poursuit ; une **épée en trois niveaux payée en Tokens** chez Ferrand (bois 15, fer 35, acier 70), les Hallucinations dissipées rapportant des Tokens ; une **fiche d'apprenti complète**. Le village reste paisible : on se bat sur la lande, hors les murs.

**La lande** (`world/moor.js`) est un monde comme le village ou une pièce : sa carte en lettres est peinte par zones (falaises boisées tout autour, la muraille d'Elelhem sur le bord est, percée de la porte, un chemin de terre qui part de la porte et se divise, un étang, les murets d'une ruine), avec les matériaux du village, une lumière plus basse et plus froide (`moorColors`), une brume dense et des grains qui traînent au ras du sol. Arbres morts (un tronc nu), arbres roux, rochers, barrières rompues, lucioles. On y entre par la porte ouest de la muraille et on en revient par là : `doors.js` connaît maintenant des **portails** entre deux mondes de plein air (`gates`), déclenchés par le geste qui pousse dans la zone de la porte, et refusables (`onRefused`) : sans épée, Rocard barre le passage ; la première fois avec, il laisse un conseil, puis le fondu part. La minimap s'efface sur la lande, le bandeau dit son nom, les sons du village se taisent.

**Les Hallucinations** (`data/enemies.js`, `game/enemies.js`) : le Mirage (3 points de vie, erre autour de chez lui, 3 Tokens) et le Fantôme (6, poursuit à 6,5 unités et rentre s'il s'éloigne trop, 8 Tokens), dessinés comme les habitants (un dessin, une fiche pixel art, une transcription), avec un drapeau `flottant` dans leurs planches : pas de jambes à animer, tout le corps ondule. Elles se frottent aux murs comme le héros, s'écartent les unes des autres, reculent et blanchissent sous un coup (la couleur du matériau pousse au-dessus de 1), et se dissipent en s'élevant. Neuf sur la lande, toutes de retour quand on y revient.

**Le combat** (`game/combat.js`) : trois coups de 0,3 s, 0,3 s et 0,44 s ; un appui pendant le coup en cours prépare le suivant ; la lame porte pendant une fenêtre de chaque coup, à 1,5 unité (1,9 pour le troisième) dans un cône de 75° devant le héros ; dégâts de l'épée (1, 2 ou 3) doublés au troisième. Le héros s'arrête pendant un coup et fait une fente au troisième. Touché, il perd une clarté, recule, clignote une seconde pendant laquelle rien ne le touche, et son coup en cours s'interrompt. À zéro, fondu au noir et réveil à la porte du village, clartés pleines, un mot dans l'annonce du HUD. **L'épée** (`gfx/weapon.js`) est un sprite de 16 × 24 pixels dessiné par le code (acier, garde d'or, poignée de cuir), du même matériau que les personnages, tourné autour de sa poignée en réécrivant les quatre sommets de son quad à chaque image ; au repos elle pend à la main, devant ou derrière le corps selon la vue. **La lame de lumière** est un croissant additif (un `Sprite` de three.js, intensité 2,6) qui s'étire et s'éteint en un sixième de seconde : le bloom s'en empare. La planche du héros a une dixième colonne, la pose du coup (le buste penche en avant de profil, s'abaisse de face).

**La forge** (`game/forge.js`) : après les pages de Ferrand, son offre (comme la boutique de Berthe), ou devant son enclume, où le point d'action affiche « Forger » (`interaction.js` connaît maintenant des points d'action sans habitant). Trois épées dans l'ordre, l'épée forgée est sauvegardée (`epee` dans l'état). **La feuille** (`game/sheet.js`, touche F ou le bouton livre du HUD) : le portrait du héros dans le cadre rond doré, le prénom, la tenue, les huit notions et leur état (à apprendre, apprise, apprise du premier coup), Tokens, clartés, épée, lieux découverts.

**Textes nouveaux, à relire par Jordan** : le nom de la lande, les deux répliques de Rocard à la porte, l'offre de Ferrand, les noms et descriptions des trois épées, les libellés de la feuille et du combat (`textesInterface.forge`, `combat`, `feuille`, `lieux.lande`, `dialogues.rocard.porte`).

Ce qui a résisté :

- **Un onglet de fond ne joue pas** : les tests dans un second onglet du navigateur intégré, pour laisser le premier à Jordan, échouaient tous (coups qui ne portent pas, Fantôme immobile) parce que la boucle d'images d'un onglet caché tourne au ralenti. Les tests se font dans l'onglet au premier plan, puis l'onglet de Jordan reprend sa place.
- **Le dialogue de Claudette** s'ouvre une seconde après le réveil : un test qui ferme la boîte trop tôt la retrouve ouverte, et le combat gelé.
- **Le recul des Hallucinations** les sortait de portée du coup suivant : réduit de 2,2 à 1,3, et la portée de la lame portée de 1,35 à 1,5.
- **Les quatre rampes** de l'ancienne palette n'auraient rien dit d'un Mirage mauve : la palette par sprite de la version 1.4 a servi telle quelle.
- **Le HUD du téléphone** a gagné un bouton et une pastille : il tient maintenant sur deux lignes, le bandeau de lieu est descendu.

### Mesures

| Critère | Résultat |
|---|---|
| Lande au repos | 47 appels de dessin, 9 400 triangles, 31 programmes ; 54 appels et 9 400 triangles avec les neuf Hallucinations en vue |
| Village après la lande | 91 appels, 49 500 triangles, 70 programmes (les matériaux de la lande et de l'épée compilés une fois) |
| Combat | Mirage touché en trois coups, Tokens gagnés ; Fantôme qui poursuit, une clarté par seconde au contact ; réveil à la porte (1,7 ; 14,5) avec les cinq clartés |
| Forge et feuille | menu ouvert par l'offre de Ferrand et devant l'enclume, achat de l'épée de bois (bourse de 44 à 29 Tokens... puis l'épée de fer), fiche à jour ; Rocard refuse la lande sans épée |
| Mobile 375 × 812 | bouton épée au-dessus du bouton d'action, HUD sur deux lignes, bandeau dessous |
| Console | aucune erreur, village, maison, forge, lande |

## Version 2.1 : le héros animé au combat, l'interface illustrée, l'écran titre (6 octobre 2026)

Jordan, après avoir joué la version 2.0 : « l'épée est juste posée, elle apparaît, elle fait des mouvements, je veux vraiment voir mon personnage bouger ». Et trois demandes de plus : une interface encore un peu plus grande et moins « vibe codée », avec des éléments redessinés en illustration (menus et dialogues compris) ; les touches visibles sur ordinateur ; un écran titre « comme un jeu NES ou un Final Fantasy », sur fond clair, avec le logo restylisé et le héros qui essaie de l'attraper, le titre, Nouvelle partie et les crédits dessous.

**Les fiches de combat.** Sept fiches dessinées par le même générateur, avec la planche du héros de la version 1.4 comme référence : le héros l'épée à la main (trois vues), puis pour chaque coup l'élan et la frappe (trois vues chacune) : coup de taille de droite à gauche, revers, coup de haut en bas avec la fente. Les silhouettes ne sont pas à la même échelle d'une fiche à l'autre, et une épée tendue sort du cadre de 48 pixels : l'outil de transcription a reçu trois options. `--reference` reprend la palette d'un sprite déjà transcrit, aux mêmes index, et n'ajoute que les tons nouveaux (l'acier et l'or de la lame) ; `--repere 479b` donne les index d'une matière repère, le rouge du chapeau, dont l'envergure dans la fiche fixe l'échelle de chaque vue ; `--fiche-reference` mesure ce repère de la même façon dans la fiche d'origine du héros, pour que la tête garde sa taille ; `--ancre repere` pose le centre du chapeau à la colonne qu'il occupe dans la grille de référence, pour que la tête garde sa place d'une pose à l'autre. Quand le chapeau trompe (bras levés devant, chapeau vu de biais dans une fente), `--echelles` impose l'échelle d'une vue. Le cadre passe à 80 × 88 pixels, pieds en 85 : une épée tendue ou levée y tient, et les grilles de 48 × 72 des habitants sont centrées et alignées par le bas, sans y toucher.

**La planche du héros** a maintenant vingt-quatre colonnes : repos et marche (0 à 8), les mêmes l'épée à la main (9 à 17, fabriqués par le même animateur sur les vues armées : l'épée au repos, loin du corps, ne bouge pas avec les jambes, comme le bâton de l'Oracle), puis l'élan et la frappe de chaque coup (18 à 23, des poses figées). Chaque jeu de vues apporte sa palette. Un personnage sans fiche de combat garde l'ancienne pose penchée et l'épée dessinée à part. Sur la lande avec une épée, le héros la porte à la main au repos et en marchant ; pendant un coup, la planche montre l'élan jusqu'à ce que la lame porte, puis la frappe (coups de 0,32 s, 0,32 s et 0,5 s). Les quatre tenues de la boutique n'ont pas encore leurs fiches de combat : elles retombent sur l'épée à part.

**L'interface illustrée.** Quatre dessins de plus : un cadre carré de nuit et un cadre carré de parchemin (coins de filigrane, filets droits qu'on peut étirer), une plaque d'ivoire aux bouts ouvragés, et deux gemmes de clarté, allumée et éteinte. Les deux cadres sont arrivés sur un fond doré que le générateur a refusé de rendre transparent ; redemandés sur fond blanc, ils sont détourés par un nouvel outil, `outils/detourer.mjs` (remplissage depuis les bords, qui s'arrête aux contours sombres du dessin), puis allégés en PNG à palette de 640 pixels. Ils sont posés en bordure étirable (`border-image`) : la boîte de dialogue garde son cadre de nuit avec le nom sur une plaque d'ivoire ; les menus (forge, fiche, boutique, carte, grimoire) passent sur parchemin, texte en encre et titres en sépia, boutons sur plaques ; le HUD (parchemins, Tokens, clartés) tient sur des plaques d'ivoire, les boutons ronds (livre, son, action et épée du tactile) dans l'anneau d'or de la fiche ; les clartés sont les gemmes. Les tailles grandissent d'un dixième (pastilles 58 px, dialogue 840 px et texte jusqu'à 1,6 rem, boutons 48 px).

**La légende des touches** (`game/keys.js`), en bas à gauche sur ordinateur seulement (hover et pointeur fin) : les lettres de déplacement sont lues sur le clavier réel quand le navigateur le permet (ZQSD sur un AZERTY, WASD ailleurs), sinon les flèches ; la ligne « Frapper » n'apparaît que sur la lande, l'épée à la main ; la légende s'efface pendant une conversation ou un panneau.

**L'écran titre** est une page de parchemin : l'illustration du voyageur qui bondit vers la flamme (le dessin en pied du héros et la flamme du logo comme références, la flamme redessinée en lumière du safran au violet), en colonne de gauche sur écran large, en haut sur téléphone ; le titre en encre, le filet, la contrée, l'accroche, puis le menu « Continuer » (s'il y a une sauvegarde) et « Nouvelle partie » sur plaques, le prénom, le côté du joystick et la signature. Au clavier, les flèches changent de bouton, Entrée valide. La flamme du logo en image à part ne sert plus.

Ce qui a résisté :

- **L'échelle des fiches.** Mesurer la hauteur de la silhouette ne marche pas pour un coup (une fente raccourcit, une épée levée allonge) ; mesurer le chapeau par sa plus longue ligne de rouge non plus, la plume et le ruban la coupent. L'envergure du rouge sur une ligne (du premier au dernier pixel, s'ils en font la moitié) donne 199, 177 et 209 pixels pour les trois vues du héros d'origine, et des hauteurs cohérentes (56, 56, 56 au repos armé ; 47, 46, 46 dans la première fente).
- **Le chapeau vu de biais.** Dans les fentes, le profil montre le chapeau plus large qu'il n'est : échelle forcée à celle de la face pour ces fiches.
- **Les fonds dorés.** Le générateur a ignoré deux fois le fond transparent demandé pour les cadres, et le détourage automatique de Higgsfield n'y a rien changé. Fond blanc, puis détourage maison.
- **Le cadre mange la largeur.** Avec 54 px de bordure, les listes de la forge et de la boutique se repliaient : panneaux élargis (680 à 860 px), bouts de plaque plus courts sur les petits boutons, une seule ligne par bouton.

### Mesures

| Critère | Résultat |
|---|---|
| Planche du héros | 24 colonnes × 4 lignes de 80 × 88, soit 1 920 × 352 pixels ; pieds en 85 ; galerie vérifiée dans les quatre directions |
| Combat à l'écran | élan puis frappe visibles pour les trois coups, image par image (`__lia.freeze`, `__lia.step`), épée à part cachée |
| Village (maison du héros) | 103 appels de dessin, 37 984 triangles, 38 programmes |
| Lande | 48 appels, 8 764 triangles, 50 programmes |
| Ornements | 15 fichiers dans `assets/ui/`, 1,13 Mo (cadres 195 et 171 Ko, plaque 114 Ko, gemmes 33 Ko, illustration du titre 107 Ko) |
| Avant le lancement | HTML, CSS, JavaScript, polices, illustration du titre, plaque et filet ; les autres ornements et les portraits après |
| Bureau 800 × 450 | titre sur deux colonnes, dialogue, forge, fiche, boutique, carte, grimoire, légende des touches |
| Mobile 375 × 812 | titre en une colonne, HUD sur plaques en deux lignes, dialogue avec le portrait posé dessus, gemmes |
| Console | aucune erreur |
| Générateur d'images | dix-sept images et deux détourages, environ 25 crédits (225,5 vers 201) |

## Version 2.2 : les tenues au combat, la marche et la course, les barres de vie, le butin (7 octobre 2026)

Cinq demandes de Jordan après la 2.1 : les fiches de combat des quatre tenues de la boutique ; une marche plus naturelle (« les pieds sont trop collés »), et une course ; la barre de vie au-dessus des Hallucinations ; la sienne sous le héros ou quelque part de clair, au moins dans la zone des ennemis ; et du butin : les Hallucinations lâchent des Tokens, parfois une potion qui soigne quand on marche dessus.

**Les tenues.** Vingt-huit fiches de plus (sept par tenue : l'épée à la main, puis l'élan et la frappe de chaque coup), générées avec deux références chacune : la planche de la tenue pour le costume, la fiche du héros dans la même pose pour la pose. Le générateur a suivi les deux à la lettre. Pour les transcrire sans refaire la calibration du chapeau pour chaque costume, l'outil a reçu `--hauteurs face=47,profil=46,dos=46` : la hauteur voulue de chaque vue, celle que le héros a dans la même pose (multipliée par 62/56 pour le mage et son chapeau pointu), d'où l'échelle ; le repère (`--repere`, qui accepte maintenant des index ou des couleurs en hexa, et `--repere-part` pour ne chercher que dans le haut de la silhouette) ne sert plus qu'à l'ancre : le chapeau rouge pour la cape écarlate, les cheveux pour les capes de nuit et des bois, le chapeau violet pour le mage. Les colonnes de coupe entre les trois silhouettes sont trouvées par un petit script du poste (le milieu des colonnes vraiment vides du creux ; si une lame traverse tout le creux, elle est rattachée au corps dont le bord partage le plus de lignes avec elle). Chaque planche de tenue porte ses `arme` et `coups` comme celle du héros.

**La marche et la course.** La foulée dessinée par le code s'amplifie : de face et de dos, la jambe levée monte de deux à trois pixels et s'écarte d'un pixel vers l'extérieur (un cisaillement depuis la hanche, le genou reste en place), les bras balancent de deux pixels ; de profil, les jambes s'écartent de cinq pixels aux pieds au lieu de trois, la jambe libre monte de deux. Six images de course de plus par direction (colonnes 9 à 14, et 24 à 29 l'épée à la main) : jambe levée de trois à quatre pixels et écartée de deux, bras de trois, rebond de deux, et de profil une foulée de huit pixels aux pieds avec le buste penché de deux. Le héros passe à la course au-delà d'un facteur de vitesse de 1,3 (Maj, ou le joystick poussé à fond). Les habitants gardent la marche. La planche a maintenant trente-six colonnes : 2 880 × 352 pixels.

**Les barres de vie** (`gfx/healthbar.js`) : une image de 32 × 5 pixels dessinée par le code et refaite quand la jauge change. Au-dessus de chaque Hallucination, un `Sprite` de three.js face à la caméra, rouge sur fond sombre, cadre et liseré clair, cachée quand elle se dissipe, pleine au retour sur la lande. Sous les pieds du héros, la même image dorée, posée à plat sur le sol, un peu vers le bas de l'écran pour ne pas cacher les bottes, visible sur la lande seulement, l'épée à la main ; les gemmes du HUD restent.

**Le butin** (`game/pickups.js`) : une Hallucination dissipée ne verse plus ses Tokens dans la bourse, elle les lâche en pièces (une par Token, au plus quatre, de plus grande valeur s'il le faut) qui glissent d'elle vers le sol autour, en sautillant, puis flottent ; une chance sur trois pour le Mirage, une sur deux pour le Fantôme (`potion` dans `data/enemies.js`), elle lâche aussi une fiole de clarté. Le héros ramasse en passant à moins d'une demi-unité : les pièces vont dans la bourse avec le « +n » qui s'envole, la fiole rend une clarté (l'annonce du HUD le dit, ou dit que les clartés étaient au complet). Les deux dessins (pièce à l'étincelle, fiole au liquide rouge) sont des pixels posés par le code, comme l'épée, la pièce brille un peu. Tout disparaît en quittant la lande ou en y revenant.

**Corrigé en passant** : pousser vers le sud sur la lande cherchait la porte de sortie d'une pièce et plantait la boucle à chaque image (`doors.js` lisait `current.door` sur un monde de plein air).

Ce qui a résisté :

- **La coupe des fiches** : la découpe automatique coupait au milieu d'une lame tendue dans le creux entre deux silhouettes (un bout de lame flottait à côté de la cape des bois). Couper dans les colonnes vraiment vides ; s'il n'y en a pas, rattacher la lame au corps qui la tient.
- **Le repère par costume** : le chapeau mesuré par envergure ne vaut rien pour une cape rouge sous un chapeau rouge (la cape gagne), ni pour une tête nue. D'où l'échelle par hauteur imposée, et le repère réduit à l'ancre, dans le haut de la silhouette.
- **Les tests dans le navigateur intégré** : une touche envoyée au panneau n'atteint pas toujours le jeu (le dialogue de Claudette restait ouvert, le héros regardait à gauche). Les tests scriptés passent par `__lia.advance()` en boucle et `__lia.walk()` pour orienter le héros.

### Mesures

| Critère | Résultat |
|---|---|
| Planches | cinq tenues complètes (héros et quatre tenues de la boutique), 36 colonnes × 4 lignes de 80 × 88, soit 2 880 × 352 pixels chacune |
| Galerie | repos armé, coups, marche et course vérifiés pour le héros, la cape écarlate, la cape de nuit et la cape des bois ; le mage sur ses aperçus |
| Combat | Mirage dissipé en un coup d'acier, trois pièces au sol puis dans la bourse (4 vers 6 Tokens) ; butin forcé de 8 Tokens et une fiole : 8 Tokens ramassés, une clarté rendue avec l'annonce |
| Barres | rouge au-dessus de chaque Hallucination, pleine au retour ; dorée sous le héros, 2 sur 5 lisible |
| Console | aucune erreur nouvelle (les 215 du compteur du panneau datent du bug de la porte, avant correction) |
| Générateur d'images | 29 images pour les quatre tenues (une refusée par la limite de débit, renvoyée), 42 crédits ; il en reste 159 |

## Version 2.3 : le village agrandi, ses nouveaux lieux, la carte illustrée (7 octobre 2026)

Quatre demandes de Jordan, en reprenant le plan : améliorer le design de la carte, rendre le décor interactif, proposer des idées de game design à bas coût qui donnent de la profondeur, et continuer l'agrandissement du village avec plus d'air entre les éléments, le générateur d'images en renfort là où il sert. Ses quatre choix : **la carte en illustration peinte** d'après le plan réel (repères posés par le code) ; **les quatre lieux** (marché, verger, lavoir, terrain d'entraînement) ; **le puits à vœux, le repos au feu et sur les bancs, la fouille des tonneaux, caisses et meules** (pas les panneaux) ; **les étincelles cachées, les exploits et le coffre derrière la cascade** (pas le parchemin du jour).

**Le village.** La grille passe de 40 × 30 à 56 × 42 cases (`world/map.js`, générée par zones par un script du poste puis collée en lettres), et toute l'implantation de `world/layout.js` est multipliée par 1,4 : mêmes maisons, mêmes arbres, quarante pour cent d'espace en plus entre eux. La rivière, le pont, les rues des alentours et la porte de la lande sont lus dans `layout.js` (`OUTSKIRTS`, `GATE`, `WATERFALL`) au lieu d'être écrits en dur dans `outskirts.js` et `main.js`. La forge remonte au pied de la falaise : à sa place, entre elle et la grande rue, l'enclos de terre battue du terrain d'entraînement (trois mannequins de paille, deux cibles, une barrière ouverte des deux côtés), parce que posé derrière la forge comme prévu, son toit le cachait à la caméra. Le marché pavé s'ouvre au sud de la place (trois étals à auvent : tissus, poteries, fioles), le lavoir se pose au bord de la rivière au sud (bassin peint dans la grille, margelle, planche à laver, toit d'ardoise sur poteaux), le verger occupe la prairie de l'est sous la pâture (neuf pommiers chargés de pommes, une échelle, trois paniers). Les sept bâtisseurs nouveaux de `world/landmarks.js` (lavoir, mannequin, cible, pommier, échelle, panier, étal de marché) ont été écrits par un agent sur un cahier des charges, avec deux aides de plus : une boîte inclinée et une barre entre deux points, d'où une vraie planche inclinée, des pieds de chevalet croisés, des flèches obliques. Quatre quartiers de plus pour le bandeau et la carte.

**Deux habitants de plus**, des figurants qui restent à leur poste (`figurant: true` dans `data/characters.js`, pour que `npc.js` les traite comme les apprentis) : le marchand de fioles, à côté de son étal, et la lavandière, au bord de son bassin, chacun avec deux répliques. Même méthode que les autres : un dessin en pied, une fiche pixel art à trois vues, la transcription. Le générateur a ignoré deux fois la demande de fond transparent (un dégradé brun) : `detourer.mjs` à large tolérance mangeait les vêtements bruns, à tolérance serrée laissait le fond. Les fiches ont été refaites sur un fond vert uni, détourées, puis les index verts restés dans les creux (entre un bras et le corps) effacés des grilles.

**Les points d'action** (`game/spots.js`, sur le mécanisme des hotspots de `game/interaction.js`, qui accepte maintenant un `available()`) : le puits (un Token jeté, une maxime sur la magie LIA en boîte de dialogue, une fois sur dix le double rendu), le feu de camp et les cinq bancs (le héros s'assied trois secondes et demie, la caméra recule puis revient, les clartés reviennent), six tonneaux, quatre caisses et trois meules à fouiller une fois chacun (un motif fixe dit lesquels cachent un à trois Tokens, les autres une réplique), la pomme du verger (une clarté, elle repousse à chaque sortie sur la lande), l'étal du marchand (une fiole de réserve pour huit Tokens, trois au plus ; à zéro clarté sur la lande, une fiole se boit d'elle-même et le héros reste debout, `combat.onEmpty`), et le défi du mannequin (vingt secondes pour placer le plus de coups ; `combat.canFight` vaut aussi dans l'enclos, les mannequins prennent les coups comme des ennemis ; un Token par cinq coups, une prime de dix Tokens à quinze coups, une seule fois).

**La profondeur.** Douze étincelles (`SPARKS` de `layout.js`) posées dans les recoins (le long du mur hors la muraille, derrière la cascade, dans le potager, au bout du verger), ramassées en marchant dessus comme le butin de la lande (`game/pickups.js` gagne un dessin d'étoile et un `place()`), trois Tokens chacune. Six exploits (`game/exploits.js`, vérifiés deux fois par seconde depuis les compteurs que le jeu tient déjà), en sceaux de cire sur la fiche d'apprenti, dorés une fois décrochés : Cartographe, Étincelant, Fouineur, Généreux, Chasseur de brumes, Bretteur. Le coffre de la cascade : le rideau d'eau tombe maintenant une case devant la falaise (`WATERFALL.z` 3), et derrière lui une corniche de pierre (lettre `g` de la grille) mène à un coffre de 25 Tokens et à la tenue de la cascade, la planche du héros recolorée (chapeau et écharpe bleu-vert d'eau vive, `sprites/heros_cascade.js`, une table d'index de palette appliquée aux poses de combat aussi), que Berthe ne montre qu'une fois trouvée.

**La carte illustrée.** `outils/plan.mjs` dessine le plan exact de la grille en PNG ; donné en référence au générateur avec la consigne de garder la géographie à l'identique bord à bord, il revient en carte de parchemin (encre sépia, lavis, rose des vents, cottages en vue plongeante, pommiers rouges, les mannequins de l'enclos). Deux variantes, la plus fidèle gardée (l'autre inventait une maisonnette dans le potager). `outils/reduire.mjs` la ramène à 1 120 pixels de large en PNG à palette de 255 couleurs (814 Ko), `game/minimap.js` la charge à la première apparition de la minimap et la décode avant de s'en servir (une image chargée mais pas décodée se dessine vide), le plan en aplats restant en attendant. Les repères et les noms de quartier se posent dessus en coordonnées de la grille : tout tombe juste (Marjolaine sur la rue de la bibliothèque, Basile à l'entrée du jardin). Les noms évitent de se chevaucher (un nom gêné descend d'une ligne ou deux, sinon s'efface) et rapetissent sur téléphone.

**Deux retouches de Jordan après sa première partie** : la légende des touches prenait un coin d'écran en permanence, la touche T la replie sur son seul titre (« Commandes (T) ») et la déplie, le choix gardé avec les réglages de l'appareil (`game/settings.js`) ; et en haut à droite, la minimap passe au-dessus du bouton du son, à toutes les tailles d'écran (bureau, téléphone, paysage).

Ce qui a résisté :

- **Le terrain derrière la forge**, invisible : la caméra regarde vers le nord, tout ce qui est au nord d'un bâtiment de cinq unités de haut disparaît derrière son toit. Déplacer la forge, pas la caméra.
- **Le fond des fiches** : voir plus haut, le vert uni est la parade.
- **Un figurant sans trajet** : `npc.js` reconnaissait un figurant à son trajet ; un drapeau `figurant` suffit pour un figurant immobile.
- **La carte vide à la première ouverture** : `drawImage` d'une image chargée mais pas encore décodée ne dessine rien. `image.decode()` avant de la poser.
- **Les noms de quartier sur téléphone** : seize noms sur 320 pixels de large se chevauchaient tous. Taille réduite, et une esquive ligne par ligne.
- **Les sceaux sur téléphone** : les exploits laissaient zéro hauteur à la liste des notions. Hauteur minimale, sceaux serrés, conditions cachées.

### Mesures

| Critère | Résultat |
|---|---|
| Carte | 56 × 42 cases, seize quartiers, douze étincelles, treize cachettes, cinq bancs et un feu, un coffre |
| Rendu sur la place | 109 appels de dessin, 63 700 triangles, 50 programmes de shader (bureau) |
| Carte illustrée | 1 120 × 836 pixels, 255 couleurs, 814 Ko, chargée après le lancement ; repères justes à la case près |
| Défi du mannequin | six coups placés en six frappes face au mannequin (test scripté) |
| Points d'action | vœu (maxime, un Token), pomme (une clarté), fouille (2 Tokens puis « rien à prendre »), repos (cinq clartés revenues), fiole achetée, coffre (25 Tokens et la tenue) : tous vérifiés |
| Console | aucune erreur |
| Générateur d'images | deux dessins, quatre fiches (deux refaites sur fond vert), deux cartes : 8 crédits, il en reste 151 |

## Version 2.4 : les façades (7 octobre 2026)

Le chantier prévu avant la refonte, lancé par Jordan sitôt la 2.3 publiée : des maisons qui ne soient plus des boîtes d'enduit à colombages. Référence regardée d'abord : une capture de village HD-2D (rez-de-chaussée de pierre, porte en arc de pierre, croix de colombage, lucarne, volets, lanterne, enseigne, marches, tonneaux à la porte).

**Tout est de la donnée par maison** (`HOUSES` de `world/layout.js`, bâti par `buildHouse` dans `world/props.js`) : `shutters` ('vert', 'bleu', 'rouge') peint des volets à barres à chaque fenêtre, `dormers` (décalages le long du faîtage) pose des lucarnes sur le pan sud, `sign` ('chope', 'enclume', 'livre', 'fiole') accroche une enseigne figurée à droite de la porte, `lantern` (vrai par défaut) une lanterne murale, `stoneBase` (vrai par défaut pour l'enduit) un rez-de-chaussée de pierre. Et d'office : des appuis de pierre sous chaque fenêtre (les jardinières se posent juste dessous), un encadrement de pierre à la porte avec sa clé de voûte et deux marches, des croix de colombage dans chaque panneau libre entre le bandeau de pierre et la lisse (là où aucune fenêtre ni porte ne gêne : la bibliothèque n'en a que sur ses pignons), les bouts de chevrons sous les égouts, un chapeau de pierre et des pots de terre cuite sur chaque cheminée (la fumée part des pots). La boîte inclinée et la barre entre deux points écrites par l'agent de la 2.3 passent dans `world/builder.js`, partagées : les croix de colombage et la jambe de force des enseignes en sont faites. Trois matières de plus pour les volets (`voletVert`, `voletBleu`, `voletRouge`, du bois teinté). Les lanternes murales sont des flammes d'ambiance de plus (`buildHouse` les renvoie, le village les ajoute aux lanternes de décor) : les portes s'allument le soir. L'enseigne de l'auberge en planche (`buildSign`) laisse la place à la chope ; la fiole de l'apothicaire est en matière de fenêtre, elle brille.

Ce qui a résisté :

- **Les lucarnes invisibles.** Posées au tiers bas de la pente, elles se lisaient comme un troisième rang de fenêtres collé à l'égout : la caméra, très inclinée, aplatit les toits. Remontées à mi-pente (`DORMER.along` 0,55), enfoncées de 10 cm seulement, elles sortent de 75 cm et se voient comme des lucarnes. Vérifié par `__lia.probe` sur leurs faces (couleur d'enduit là où le toit est rouge) avant de les voir à l'œil.

### Mesures

| Critère | Résultat |
|---|---|
| Rendu devant l'auberge | 118 appels de dessin, 73 650 triangles (63 700 avant les façades) |
| Maisons | six maisons : volets sur 24 fenêtres, quatre lucarnes, quatre enseignes, cinq lanternes murales |
| Console | aucune erreur |

## Version 2.5 : des personnages trapus, le dialogue sans boîte (7 octobre 2026)

Le lot est parti de neuf captures de RPG en HD-2D données par Jordan : des dialogues sans cadre, le portrait en grand, une police garalde ; des personnages courts sur pattes, plus petits à l'écran, qui marchent en diagonale ; des intérieurs entourés d'un dehors assombri ; un éclair à chaque coup. Quatre réponses à choix ont cadré le travail : silhouettes de deux têtes et demie et 40 pixels pour tout le monde, cinq vues dessinées et huit directions (les coups restant en quatre), EB Garamond partout et le dialogue sans boîte, un faux dehors bon marché autour des pièces.

**La police.** EB Garamond (licence OFL, fonte variable et italique, 70 Ko) remplace Newsreader partout : interface, diplôme, carte.

**Les personnages.** Les vingt planches sont redessinées. Le héros d'abord, d'après son portrait, en fiche de cinq vues (face, trois-quarts face, profil, trois-quarts dos, dos) sur fond vert, deux variantes, la plus fidèle gardée ; puis ses sept fiches de combat (l'épée à la main en cinq vues, l'élan et la frappe de trois coups en trois vues) d'après cette planche. Les quinze autres (dix habitants, le marchand, la lavandière, l'apprenti, le Mirage et le Fantôme) d'après leur portrait, la planche du héros donnée en seconde référence pour le style et l'échelle. Toutes sont transcrites à 40 pixels de haut (46 pour l'Oracle, le capitaine et la lavandière, dont le chapeau, le plumet ou le battoir dépassent) dans un cadre de 48 × 56. Les poses du héros sont calées sur sa tête : hauteur imposée par vue, puis un décalage par vue calculé d'après la colonne du chapeau, pour qu'il ne saute pas d'une pose à l'autre. Les tenues ne sont plus des fiches dessinées mais des recolorations de la planche du héros (comme la cascade en 2.3).

**Le moteur des planches** (`gfx/sprites.js`). Huit lignes par planche, une par direction (`DIRECTIONS`), la droite en miroir de la gauche ; un cadre propre à chaque personnage (80 × 88 pour le héros et son épée levée, 48 × 56 pour les autres), quinze colonnes seulement pour qui ne se bat pas. `directionOf` choisit la plus proche des huit directions en gardant la direction en cours tant que le mouvement n'en sort pas franchement (pas de tremblement sur une diagonale) ; le héros, les habitants et les Hallucinations s'en servent. Un coup d'épée lancé en diagonale tourne d'abord le héros vers le côté le plus proche (`cardinalOf`), puisque les coups ne sont dessinés que de face, de profil et de dos.

**Le dialogue** (bloc « Version 2.5 » de `styles.css`, rien dans le code). Plus de cadre : le nom puis le texte, en blanc ombré, sur un voile sombre fondu au tiers haut de l'écran, au-dessus des personnages qui parlent ; le portrait debout en grand dans le coin bas gauche ; deux bandes sombres et douces ferment le haut et le bas de l'écran pendant la conversation ; les choix sont des lignes de texte, un filet d'or devant celui qu'on vise. Sur téléphone, le texte passe sous la minimap et le portrait se tient en bas ; en paysage bas, le texte descend sous la barre du haut.

**Le dehors des intérieurs** (`world/beyond.js`). Autour de chaque pièce, le village deviné dans une nuit bleue : des dalles sombres qui s'éteignent avec la distance, des maisons à pignon aux fenêtres parfois allumées, des arbres, une clôture basse, deux lanternes contre les flancs. Des silhouettes non éclairées, deux appels de dessin ; rien de haut au sud, qui cacherait la pièce. La caméra des intérieurs recule un peu (`INTERIOR_FRAMING` 0,62 vers 0,74) pour qu'on les voie.

**Le combat.** Un éclat de lumière (une étoile à huit branches, cœur blanc et rayons dorés, quelques étincelles) jaillit sur chaque Hallucination et chaque mannequin touchés, plus grand au troisième coup (`createImpacts` dans `gfx/weapon.js`). La barre de vie au-dessus des Hallucinations existait déjà.

Ce qui a résisté :

- **Les poches de vert.** Le détourage remplit le fond depuis les bords : le vert enfermé entre un bâton et le corps restait (l'Oracle, le capitaine). Option `--creux 1` de `outils/detourer.mjs` : tout pixel de la couleur du fond s'efface, même enfermé.
- **Les lumières fondues.** Réduites à dix-huit couleurs, la lueur du bâton de l'Oracle, la fiole de Basile et les yeux du Fantôme se mêlaient aux tons voisins : ces trois-là sont transcrits en vingt-quatre couleurs, pour garder un index de lumière à part.
- **L'échelle des poses.** Le repère du chapeau donnait des héros de 30 à 57 pixels selon la pose (un chapeau vu de biais, des bras levés devant) : hauteurs imposées par vue, mesurées sur les fiches, puis calage de la tête.
- **Le dehors hors champ.** La rangée de maisons derrière le mur nord tombe hors de l'écran (la caméra plonge vers le nord) ; ce qu'on voit, ce sont les côtés et le sud. Les lanternes posées au sud, près de la caméra, faisaient de grands poteaux clairs au premier plan : déplacées sur les flancs.

### Mesures

| Critère | Résultat |
|---|---|
| Rendu sur la place | 116 appels de dessin, 73 500 triangles (inchangé) |
| Rendu dans l'auberge | 53 appels de dessin, 8 800 triangles (5 600 avant le dehors) |
| Planches | 20 personnages, 8 directions, 48 modules de sprites de moins (les poses dessinées des quatre tenues) |
| Higgsfield | 24 images, 36 crédits, 115 restants |
| Console | aucune erreur |

## Version 2.6 : l'auberge, la forge, la bibliothèque, l'apothicairerie, la maison du héros et la place, des décors riches (7 octobre 2026)

La 2.4 et la 2.5 publiées (étiquettes `v2.4` et `v2.5`), Jordan a lancé la richesse des décors en partant d'une seule maison, l'auberge, dedans et dehors, à faire valider avant d'étendre. Un constat d'abord : les petits objets du village étaient des boîtes (le tonneau était un cube), exactement les « gros blocs » à éviter.

**Dehors.** Un parvis de pavés en éventail (case `e` de `world/map.js`, texture `createFanCobbleTextures` : des demi-disques d'une unité, quatre anneaux de pavés, posés en écailles ; rampe `parvis`, plus claire et plus chaude que les pavés de la place) devant la façade et jusqu'au chemin du marché. Un muret de pierre à chaperon (`buildLowWall`) le ferme à l'ouest et au sud, avec des piliers coiffés et une ouverture face à la porte ; des auges de pierre fleuries sur le muret et une jardinière de bois à l'est (`buildPlanterBox`, ses fleurs plantées comme celles des rebords de fenêtre) ; un chevalet d'ardoise à la porte (`buildChalkboard`) ; une rangée de tonneaux contre la façade ; les tables de la terrasse sur le parvis, un tabouret à chaque bout. L'arbre qui cachait la porte recule à l'ouest. Partout dans le village, les tonneaux deviennent ronds et ventrus (dix douelles, trois cercles de fer, un couvercle) : `pushRevolution` et `pushDisc`, dans `world/builder.js`, font les surfaces de révolution.

**Dedans** (`ROOMS.auberge` de `world/rooms.js`). Un salon près du feu, à l'ouest : grand tapis, canapé contre le mur, deux fauteuils, table basse avec un livre et une tasse, un grand tableau au-dessus du canapé, une horloge comtoise, une plante. Une salle à l'est : une table ronde sur pied et ses quatre chaises à dossier, une longue table à bancs, une seconde plante. Un escalier vers l'étage le long du mur est, avec son palier et sa rampe à balustres ; les cases dessous sont réservées. Le comptoir de Berthe raccourcit pour laisser passer l'escalier. Nouveaux meubles dans `world/furniture.js` : `buildChair`, `buildArmchair`, `buildSofa`, `buildRoundTable`, `buildLowTable`, `buildClock`, `buildPlant`, `buildStairs`, avec une aide qui tourne un meuble d'un quart de tour (`orientedBox`). Une matière de plus, `velvet`.

Ce qui a résisté :

- **Deux grands carrés noirs** dans l'auberge : au sommet des plantes, la surface de révolution finit en pointe, deux sommets se confondent, la normale du quad devient invalide et le bloom propage l'erreur en carrés. `pushRevolution` émet désormais un triangle à la pointe.
- **Le velours rouge** se perdait sur le tapis rouge : vert bouteille.
- **Le parvis trop sombre** : l'éventail ne se lisait pas dans l'ombre de l'auberge, d'où la rampe plus claire.
- **Pas de perron surélevé** : la grille n'a pas de case praticable en hauteur, et la hauteur du héros saute d'une case à l'autre. Un vrai perron à marches demandera de lisser cette hauteur ; noté pour la suite.

**La forge**, de la même façon. Dehors, une cour de grandes dalles grises (case `k`, matière `yard` : la texture des dalles d'intérieur sur une rampe plus claire, `cour`), fermée à l'ouest par le muret à chaperon ; contre la façade, un râtelier de quatre épées et une lance, un bouclier rond au-dessus, un tonneau d'épées plantées, des barres de fer sur leurs traverses ; près du foyer, des sacs de charbon de bois, le baquet de trempe et la meule. Dedans, un râtelier contre le mur est, un mannequin d'armure (cuirasse, épaulières, casque à cimier), trois boucliers aux murs, le tonneau d'épées, des sacs, des barres de fer ; deux appliques à l'est, qui restait dans le noir. Nouveaux objets dans `world/furniture.js` : `buildWeaponRack`, `buildArmorStand`, `buildShield`, `buildSwordBarrel`, `buildIronBars`, `buildSacks`.

**La bibliothèque**, qui n'avait pas d'intérieur : une salle de lecture neuve (`ROOMS.bibliotheque`), la porte s'ouvre d'elle-même puisque la pièce porte le nom de la maison. Des livres du sol au plafond sur trois murs (deux bibliothèques au nord, quatre hautes étagères à l'est et à l'ouest, `buildTallShelf`), l'échelle contre les rayons, le bureau de Dame Marjolaine sous la fenêtre, un lutrin et son grand livre ouvert au milieu du tapis (`buildLectern`), deux tables de lecture avec bougies et livres, un coin de lecture (fauteuil, table basse, plante), un globe sur son pied (`buildGlobe`, les océans dans le bois bleu des volets : la toile rayée en faisait un ballon de plage), des piles de livres (`buildBookStack`). Dehors, un parvis en pavés en éventail sur trois rangs, fermé au sud par le muret coiffé d'auges fleuries (reculé d'une case : le premier parvis serrait Marjolaine contre lui), un cadran solaire (`buildSundial`), un banc et une pile de livres sous la fenêtre ; Dame Marjolaine attend sur le parvis, près de sa porte. L'exploit du cartographe compte un lieu de plus.

**L'apothicairerie**, elle aussi sans intérieur jusqu'ici : l'officine de Basile (`ROOMS.apothicairerie`). La cheminée et son chaudron, des herbes qui sèchent au-dessus de la fenêtre, une étagère de remèdes sur tout le mur nord (`buildJarShelf` : bocaux de grès et de terre à couvercle de fer, fioles de couleur au long col, quelques-unes dans la matière des fenêtres allumées, qui luisent), le comptoir avec son mortier (`buildMortar`), une bougie et des livres, un séchoir à herbes contre le mur ouest (`buildDryingRack`), un panier et des sacs, l'alambic sur une table ronde (`buildAlembic` : ballon de cuivre, col de cygne, serpentin, ballon de recette qui luit), deux plantes, un tapis. Dehors, un seuil dallé (case `k`), un séchoir à l'ouest de la porte (ses bottes d'herbes étoffées après un premier essai où on ne les voyait pas), une grande plante en pot à l'est, un chaudron sur trépied au bord de l'allée (`buildTripodCauldron`), deux ruches de paille au fond du jardin de simples (`buildBeehive`).

**La maison du héros.** Deux arbres d'automne plantés devant elle la cachaient à la caméra, et un rocher était posé exactement sur le tronc de l'un d'eux (un doublon ancien) : les arbres reculent (l'un au sud-ouest, l'autre derrière la maison), le rocher s'écarte. Autour, un jardin de chaumière (`HOME_GARDEN`) : une barrière ouverte face à la porte, des pas japonais jusqu'au feu de camp (`buildSteppingStones`), un potager, une corde à linge où sèchent des draps, une chemise bleue et un foulard rouge (`buildClothesline`), le tas de bois contre le mur est, un banc, un tonneau de pluie, deux pots de fleurs à la porte. Les potagers de tout le village (l'auberge, l'apothicairerie) étaient des cubes verts : ce sont maintenant des rangs, un sillon de terre par rang, des choux ronds et des fanes en alternance. Dedans, la pièce gagne un fauteuil tourné vers le feu, deux plantes, des livres sur le pupitre et au pied de la bibliothèque, des sacs près du panier ; la scène d'ouverture garde sa place.

**La place du puits.** Le cœur de la place, douze cases sur huit autour du puits, passe en pavés en éventail (case `e`), bordé d'une ligne de pierres à fleur de sol (`buildKerb`) ; une bande de pavés ordinaires reste autour, là où arrivent les rues. Le puits était un carré de boîtes : il devient rond (`buildWell`), une margelle de pierre de taille et son rebord, la paroi intérieure qui descend vers une eau sombre (`pushRevolution` sait maintenant tourner ses faces vers l'axe, `pushAnnulus` fait le dessus de la margelle), deux poteaux, un treuil à manivelle, la corde enroulée et le seau suspendu, un toit de tuiles à deux pans avec ses pignons ; il est posé au milieu d'un rond de dalles bordé de pierres (`dais` dans `WELL`), où l'on marche. Autour, quatre massifs fleuris (`buildFlowerBed` : une couronne de pierres dressées, de la terre, un cercle de fleurs, une boule de buis), des bancs à dossier tournés vers le sud, deux jardinières, un panneau d'affichage aux feuilles épinglées (`buildNoticeBoard`), l'étal de légumes poussé vers l'est avec des sacs et un panier. Les bancs de tout le village gagnent trois lattes, des pieds à montants et traverse, et un dossier en option (`back`). Tout est dans `SQUARE` de `world/layout.js`.

Ce qui a résisté : la caméra plonge assez pour que le pan sud du toit du puits cache le haut des poteaux ; on le lit surtout comme un toit de tuiles posé au-dessus de la margelle. Et un bug trouvé en passant, présent depuis la 2.5 : à la fin d'une conversation, le voile, le nom et le texte restaient à l'écran, parce que la règle du dialogue sans boîte (`#dialogue.avec-portrait`, `display: grid`) avait la même force que `#dialogue[hidden]` et passait après elle. Un rappel de `#dialogue[hidden]` la suit désormais.

### Mesures

| Critère | Résultat |
|---|---|
| Rendu sur la place, au sud du puits | 122 appels de dessin, 112 500 triangles (119 et 105 000 avant) |
| Passages sur la place | d'ouest en est au nord et au sud du puits, du nord au sud, de la bibliothèque au sud-ouest : libres |
| Rendu devant l'auberge | 117 appels de dessin, 76 800 triangles (73 500 avant) |
| Rendu dans l'auberge | 58 appels de dessin, 12 300 triangles (8 800 avant) |
| Rendu dans la cour de la forge | 113 appels de dessin, 77 600 triangles |
| Rendu dans la forge | 43 appels de dessin, 8 400 triangles |
| Rendu devant la bibliothèque | 117 appels de dessin, 79 700 triangles |
| Rendu dans la bibliothèque | 49 appels de dessin, 20 200 triangles |
| Rendu devant l'apothicairerie | 117 appels de dessin, 81 600 triangles |
| Rendu dans l'apothicairerie | 56 appels de dessin, 17 700 triangles |
| Rendu devant la maison du héros | 113 appels de dessin, 87 400 triangles |
| Rendu dans la maison du héros | 57 appels de dessin, 8 700 triangles |
| Collisions | bloqué au pied de l'escalier et contre le canapé |
| Console | aucune erreur |

## Version 2.7 : la liste de Jordan après sa partie (7 octobre 2026)

Jordan a joué à la 2.6 et rendu une liste de retours, traitée dans l'ordre où elle pouvait l'être en une session. Fait :

- **Les barres de vie ne descendaient pas**, depuis la 2.1 : `toDataTexture` copie les pixels dans la texture, et la jauge repeignait son tampon sans jamais recopier. `gfx/healthbar.js` recopie à chaque changement.
- **Les dégâts s'affichent** (`game/damage.js`) : un chiffre monte au-dessus de la cible à chaque coup qui porte, en or et avec la mention « Critique ! » pour le troisième coup de l'enchaînement (ses dégâts sont doublés, c'est le coup critique), en rouge au-dessus du héros quand il en reçoit. Du DOM posé sur le canvas par projection, comme les étiquettes de nom.
- **« Au revoir »** : un dernier choix sur l'offre de leçon et sur chaque question referme la conversation sans répondre et sans compter d'erreur (`game/quest.js`, texte `textesInterface.auRevoir`). La touche Échap faisait déjà la même chose, mais la boîte restait affichée à cause du bug corrigé en 2.6 (`#dialogue[hidden]`).
- **Le flou du haut de l'écran** monte un cinquième moins vite que celui du bas (`TOP_BLUR_SCALE` dans `gfx/post/dof.js`).
- **Plus de repos** sur les bancs ni au feu de camp : rien ne le montrait, le héros restait planté.
- **Le double fond des cadres** : `box-shadow` dessinait un rectangle d'ombre autour de la boîte entière, qui dépassait du filet doré en haut et en bas (les coins du cadre sont transparents). Les cadres illustrés et la légende des touches passent en `drop-shadow`, qui suit le dessin.
- **Le bandeau de lieu** descend au tiers de l'écran, où il ne passe plus sous les pastilles ; **les annonces** (parchemin, Token, coffre, exploit) vont au milieu du bord gauche ; **le lieu courant** s'affiche sous la minimap, au-dessus du bouton du son : le monde (« Village d'Elelhem », « La Lande des Hallucinations ») et dessous le quartier ou la pièce (`#endroit`, tenu par `game/banner.js`).
- **Les pigeons** du colombier : un corps fuselé (surface de révolution), cou, tête, bec, queue en éventail, deux ailes à part qui tournent à l'épaule et planent par moments, une fois et demie plus grands. Trois appels de dessin pour la volée.
- **L'écran titre** sur l'illustration fournie par Jordan (`assets/ui/titre.webp`, 1672 × 941) : l'image porte le titre peint, le menu Continuer / Nouvelle partie, le prénom, la signature, le lien du site (cliquable) et « © 2026, tous droits réservés » sont du HTML posé à droite, sur un cache de papier fondu qui couvre les éléments dessinés (dont une signature mal orthographiée). Sur un écran étroit ou court, le menu passe sous l'image. L'image de partage est refaite par `outils/vignette.mjs` : l'illustration seule. L'ancienne `titre-heros.png` est retirée.
- Outils de test : `__lia.scene()` et `__lia.objet(nom)` (visible, instances, position du premier, point à l'écran).

**L'illustration définitive** du titre (le nom du jeu bien écrit) a remplacé la première, l'image de partage est refaite.

**La marche et la course de profil, dessinées.** Le cisaillement des jambes depuis la hanche ne bougeait que les pieds : sur un personnage de 40 pixels, la jambe en fait six. Quatre fiches générées (0,25 crédit l'image, deux variantes chacune) sur fond vert, avec la planche du héros en référence : six images de marche, six de course, puis les mêmes l'épée à la main. Chaque fiche est détourée (`detourer.mjs`), découpée en six images (un petit script du scratchpad, les colonnes vides séparent les silhouettes), et chaque image transcrite comme une vue `profil` avec la palette du héros (`--reference`, `--repere 57ac` pour caler le chapeau, `--hauteurs profil=40` pour la marche et 36 pour la course : la largeur du chapeau variait trop d'une image à l'autre pour donner l'échelle). Vingt-quatre modules `heros_marche1..6`, `heros_course1..6`, `heros_marche_arme1..6`, `heros_course_arme1..6`, branchés dans `heros.js` (`marche`, `course`, `armeMarche`, `armeCourse`) ; `gfx/sprites.js` les pose aux colonnes de marche et de course de la vue de profil (et de son miroir, la droite), les vues de face, de dos et les diagonales restent fabriquées. Budget : 2 crédits, 113 restants.

**Le décor deux fois plus fin.** Tout le décor était dessiné à 16 texels par unité. Les tuiles passent de 64 à 128 pixels (`TILE_PIXELS`, facteur `K` dans `gfx/textures.js`) : les motifs en pixels absolus (colonnes de tuiles, rangs d'ardoise, assises de pierre, briques, lattes, lambris, éventails de pavés, brins d'herbe) sont multipliés par K pour garder leur taille dans le monde avec deux fois plus de détail, les bruits (fbm, Voronoï) gardent leurs fréquences par tuile. Portes et fenêtres redessinées en 32 × 64 et 32 × 32 avec le même facteur. Touffes d'herbe en 24 pixels, deux fois plus de brins, fleurs à cinq pixels de large ; grappes de feuillage en 48 pixels avec plus de touffes ; taches des lisières en 32 ; flaques de lumière, particules et tapis sur la même grille ; les colonnes de la cascade suivent la tuile. `createPixelMaterial` lit la taille de sa texture sur l'image, plus d'écriture en dur. Pas de changement d'appels de dessin ni de triangles (123 et 113 800 sur la place) ; la mémoire des textures quadruple, sans effet mesurable dans le navigateur intégré.

**Passe de contraste** (mesurée sur les styles calculés, rapport WCAG entre la couleur du texte et le fond réel derrière lui) : lieu courant 16,9, bandeau de lieu 14,8, annonces 14,8, légende des touches 11,3 à 13,5, dialogue 13 à 15,4, étiquette de nom 12,6, écran titre 8,1 à 9,6, grimoire sur parchemin 5,1 (le plus bas, au-dessus des 4,5 demandés). Les chiffres de dégâts portent un contour sombre de deux pixels. Rien à corriger.

À faire : la revue d'architecture (`/anthropic-skills:improve-codebase-architecture`, lancée par Jordan dans une conversation à part), puis le push et les étiquettes `v2.6` et `v2.7`.

### Mesures

| Critère | Résultat |
|---|---|
| Combat | un Mirage (3 pv) tombe en deux coups de fer (2 + 2) ; les chiffres s'affichent et s'effacent en une seconde ; le coup reçu ôte une clarté et affiche « -1 » |
| Pas de profil | marche 23 à 25 × 40, course 26 à 30 × 36 ; galerie des quatre rangées vérifiée, puis en jeu vers la gauche et la droite |
| Décor à 32 texels | place : 123 appels de dessin, 113 800 triangles (122 et 112 500 à 16 texels) |
| Contraste | le plus bas : 5,1 (texte sépia du grimoire sur parchemin) |

## Version 2.8 : le ressenti du jeu (7 octobre 2026)

Une seconde liste de Jordan, dix points de « game feel », tous faits dans la foulée de la 2.7, en local :

- **Bouffées de poussière et de feuilles** (`gfx/fx/bursts.js`) : une réserve de 96 points animée image par image (gravité, frottement, arrêt au sol), un seul appel de dessin, l'objet suit le héros de lieu en lieu comme son épée. De la poussière quand la direction voulue se retourne (produit scalaire sous -0,2 avec le mouvement précédent) ou quand la course commence ; des feuilles, au hasard, quand il avance sur une case d'herbe.
- **Barres de vie à double jauge** (`gfx/healthbar.js`) : la part pleine descend aussitôt, une jauge de retard (jaune sur les Hallucinations, rouge sous le héros) attend 0,4 s puis rattrape à 1,1 barre par seconde ; une fiole remonte les deux d'un coup. `update(dt)` par barre, `reset()` au retour sur la lande.
- **Retour des boutons** : au survol ou à la sélection, un bouton de menu grandit de 5 % et une étincelle animée (✦) apparaît à sa droite ; rien de tout cela avec le mouvement réduit.
- **Le curseur** : une main gantée qui pointe, dessinée pixel par pixel dans `outils/curseur.mjs` et écrite en PNG à l'échelle 2 (`assets/ui/curseur.png`, 40 × 42, point chaud au bout de l'index), posée par le CSS sur la page, le canvas, les boutons et les liens. Jugée grossière par Jordan, refaite en 2.9 (plus bas).
- **Sons** : chaque son ponctuel (pas, oiseau, roucoulement, marteau) part d'une hauteur tirée entre 95 et 105 % (`pitch()` dans `core/ambience.js` : `playbackRate` pour les bruits, fréquence pour les oscillateurs).
- **L'aide aux coins** (`world/collision.js`) : quand un pas est absorbé à plus de 65 %, le même pas est essayé depuis une position décalée de côté, par 7 cm jusqu'à 28 cm ; si l'un passe à plus de 85 %, on le prend. Le héros glisse autour des angles des maisons et des tonneaux au lieu de s'y coller. Vérifié le long du mur est de la bibliothèque : parti à 2 cm dans le mur, il arrive au bout en se décalant de 10 cm.
- **Chiffres de dégâts** : ils jaillissent (impulsion de 150 px/s, gravité 640), retombent sur leur ligne, rebondissent une fois, et grandissent avec les dégâts (14 % par point), une fois et demie plus grands et jaunes pour le coup critique.
- **L'herbe et les buissons se couchent** : dans le shader des touffes (`gfx/grass.js`) et des grappes basses (`gfx/foliage.js`, sous 1,3 unité d'altitude), un uniforme `uHero` (position du héros, tenu par `fx.uHero`, mis à jour par `update` du village et de la lande) repousse le haut de la plante loin de lui dans un rayon de 0,7 à 0,9 unité. Rien à calculer côté JavaScript.
- **Le bip des dialogues** : une lettre sur deux qui s'écrit (hors espaces) fait une note brève en triangle (`ambience.blip`), à 540 Hz fois la voix de l'habitant (`voix` dans `data/characters.js` : 0,62 pour Ferrand, 1,3 pour Pépin), fois un hasard de 90 à 110 %.
- **Le point d'exclamation** : un sprite de pixels jaune à contour sombre (`game/npc.js`, `setQuest`), qui flotte au-dessus de la tête des habitants dont le parchemin reste à gagner (et de Clodomir quand les huit sont réunis), partagé entre les lieux avec l'habitant.

### Mesures

| Critère | Résultat |
|---|---|
| Aide aux coins | depuis (20,2 ; 13) vers (20,2 ; 9) le long de la bibliothèque : arrivé, décalé en x 20,3 |
| Bouffées | 96 points dans la réserve, un appel de dessin |
| Chiffres | 1,3 rem pour 1 point, 1,48 pour 2, 2,2 et jaune pour un critique de 4 |
| Console | aucune erreur |

## Version 2.9 : moins de tics, plus de vie (7 octobre 2026)

La suite des retours de Jordan, après la 2.8 : une correction, les tics d'IA que j'avais pointés, deux points de ressenti, la direction artistique, le bois.

- **La lame de lumière** partait du mauvais côté de profil : l'angle de la lueur est inversé pour la gauche et la droite (`game/combat.js`).
- **Le bois** (`createWoodTextures`) : il était une suite de colonnes de tons. Des planches d'une demi-unité à joint sombre et chanfrein clair, des fibres fines qui ondulent (un bruit lent décale la colonne lue), un nœud par planche ou presque (ellipse sombre, cerne clair). Les pavés perdent une pierre sur vingt-cinq, la terre affleure.
- **Les tics corrigés** : les caisses sont posées de biais (`buildCrate` prend un angle, `pushSkewBox`) ; une fenêtre sur neuf a ses volets fermés, les battants couvrent les carreaux (`props.js`, hachage de la maison et de la fenêtre) ; les cachettes vides ont huit répliques (`textesInterface.points.fouille.rien`) ; les habitants ont une vraie vie (plus bas) ; et **la lumière tourne** (`world/daylight.js`) : quatre moments, soir doré (le réglage d'origine), nuit bleue, aube rose, jour clair, interpolés sur un cycle de douze minutes de jeu (`DAY_PERIOD`), qui commence au soir. Le village applique l'état (`setDaylight`) : couleur et force du soleil, lumière du ciel, brume, émission des fenêtres, force des lanternes, le dôme du ciel (`uNight`, `uNightSky`). Les lucioles ne sortent qu'à la nuit. L'étalonnage du post-traitement ne change pas.
- **L'iris des portes** : le fondu au noir se referme en cercle sur le héros (`clip-path: circle()`, `--iris-x` et `--iris-y` posés par `doors.js` depuis la projection du héros) et se rouvre de même de l'autre côté. Un fondu simple avec le mouvement réduit.
- **Les sons d'événements** (`ambience.chime`) : tintement d'une pièce ramassée, accord brisé d'un coffre, carillon montant d'un parchemin, « pop » quand le point d'exclamation d'une quête s'efface. Synthétisés en Web Audio comme le reste, avec la variation de hauteur.
- **La direction artistique, la magie qui se voit** : un cercle de huit **runes** luit la nuit sur les dalles du puits (`gfx/fx/runes.js`, glyphes de pixels symétriques tirés une fois, lumière additive, le bloom fait le halo) ; le **bâton de Gépété** lâche des étincelles qui montent (bouffée `etincelles`) ; le **grimoire flotte** devant la bibliothèque et tourne ses pages ; une **poussière d'étoiles** suit le héros qui a ses huit parchemins ; la **brume** flotte au pied de la cascade (bouffée `brume`, émise quand le héros est à moins de 18 unités).
- **Les animaux** (`gfx/fx/critters.js`) : un chat roux qui dort sur le muret de la bibliothèque et bat de la queue, trois poules qui picorent et trottent dans la pâture aux meules. Sprites de pixels dessinés dans le module, deux images chacun.
- **Ferrand frappe** : un marteau de pixels tourne au-dessus de son épaule, levé lentement puis abattu d'un coup, en phase avec le son (le marteau de `ambience.js` frappe maintenant à période fixe, `HAMMER_PERIOD`, et expose sa phase).
- **Le curseur, refait** : la main de pixels de la 2.8 était grossière. Jordan voulait un gantelet digne des grands jeux de rôle en ligne. Deux voies essayées : un gantelet en formes vectorielles rendu par le code (plaques, biseaux, reflets, rivets, sur-échantillonnage de seize), honnête mais raide, un gant de cuisine en acier ; puis un dessin du générateur d'images (gantelet de plates vu de dos, index tendu vers le haut à gauche, fond vert uni), détouré par `outils/detourer.mjs`, puis réduit par `outils/curseur.mjs` réécrit pour cela : voile vert des bords retiré, réduction par moyenne de surface en 32 px (`assets/ui/curseur.png`) et 64 px (`curseur-2x.png`, servi aux écrans à haute densité par `image-set()`), un peu de netteté rendue, ombre portée douce, point chaud repéré au bout de l'index. Sur ce qui se clique (boutons, liens, étiquettes), le même gantelet avec un éclat d'or dessiné en vectoriel à côté du doigt (`curseur-actif.png`, `curseur-actif-2x.png`) ; les règles `cursor: pointer` du CSS passent par deux propriétés personnalisées pour que le gantelet s'applique partout. La seconde voie l'a emporté sans discussion. Premier dessin (job `04771a3b`) : un gantelet élancé, beau à 64 px mais trop fin à 32 px, jugé tel par Jordan. Second dessin (job `7ec7ef29`, 1 crédit pour les quatre images) : proportions trapues demandées au générateur (index court et épais, poing large, manchette évasée, contour épais), qui remplit la case de 32 px en diagonale et reste lisible sur un écran à l'échelle 1 ; point chaud (2, 1).
- **Les tics d'interface** : Jordan a demandé d'ôter ce qui faisait « interface d'IA ». Fait, en CSS pour l'essentiel : l'étincelle ✦ animée et l'agrandissement de 5 % au survol des boutons (remplacés par une simple montée de luminosité, la sélection garde ses styles), les capitales espacées des titres de panneaux et des petites étiquettes (titres en casse de livre et plus grands, étiquettes en italique discret ; le bandeau de lieu, le « Nouvelle partie » qui clignote et les rôles du générique gardent leurs capitales), les cinq tuiles de chiffres de la fiche (une liste à points de conduite sur deux colonnes, comme un registre), les sceaux à initiale des exploits (un petit sceau de cire rouge, gris s'il reste à gagner, le nom puis la condition à la suite), les chevrons des boutons du grimoire, le point médian du sous-titre de la fiche (une virgule).
- Outil de test : `__lia.heure(0.22)` force la nuit (`0` soir, `0,48` aube, `0,72` jour, `null` pour reprendre).

**Ressources extérieures** : rien n'a été importé. Les sons restent synthétisés (un pack CC0 aurait fait entrer des fichiers, contre la règle de la page qui ne charge que ses ornements), les sprites restent transcrits du même héros. Les pistes (Kenney, OpenGameArt, Lospec, Pedro Medeiros, jsfxr) sont notées dans `suite.md` pour plus tard.

### Mesures

| Critère | Résultat |
|---|---|
| Nuit forcée sur la place | huit runes visibles autour du puits, ciel bleu profond, fenêtres plus fortes, lucioles sorties |
| Petites vies | six sprites dans le village (chat, trois poules, grimoire, marteau) |
| Iris | variables posées à (843, 686) px en passant la porte de l'auberge |
| Console | aucune erreur |
| Écran titre | bureau 1686 × 1199, mobile 375 × 812, paysage 812 × 375 et vignette 1200 × 630 vérifiés |
| Console | aucune erreur |

## Version 2.10 : la revue d'architecture appliquée, les intérieurs au pixel (7 octobre 2026)

Jordan a demandé « les améliorations nécessaires » après la revue d'architecture (`/anthropic-skills:improve-codebase-architecture`, huit candidats, voir `suite.md`), puis des intérieurs plus fins, puis la publication : le but est une version jouable et partageable.

- **Trois approfondissements sur huit**, les trois forts et sans risque pour une sortie :
  - **Les lieux** (`world/places.js`, pur, sans three.js) : les quartiers, les pièces et la lande, leurs clés de découverte (gelées parce qu'elles vivent dans les sauvegardes : identifiant nu pour un quartier, `piece:` pour une pièce, `lieu:lande`), le total des lieux et le point-dans-rectangle. Avant : trois façons d'écrire une clé dans `main.js`, le total calculé deux fois à la main, le rectangle réécrit dans le bandeau et les portes.
  - **La partie** (`game/state.js`) : la forme des vingt champs n'est écrite qu'une fois (`FIELDS`), l'état vide, l'écriture, la relecture et l'instantané de débogage en découlent (l'instantané de `__lia.gameState()` n'en connaissait que dix). Règle : qui change l'état sauvegarde ; plus de rappel `save()` passé aux points d'action et aux exploits, et les deux champs (`dissipees`, `etincelles`) qui n'étaient sauvés que par effet de bord de la bourse le sont pour de bon. `questStatus` et `hasAllScrolls` remplacent les trois copies de `main.js` (la minimap et le point d'exclamation lisent la même réponse), `discover` note un lieu une seule fois.
  - **L'hôte des panneaux** (`game/overlays.js`) : Échap referme le dernier panneau ouvert, un clic sur le fond referme, « le jeu est-il occupé » se demande à un seul endroit. Sept panneaux recopiaient ces gestes et onze écouteurs clavier se disputaient Échap ; la liste `quest.overlays` disparaît.
  - Non faits, notés dans `suite.md` : les bâtisseurs de décor (gros, risqué avant une sortie), les mondes qui portent leur comportement, la couture d'animation du sprite, la table des touches, la façade pour `__lia`.
  - `CONTEXT.md`, à la racine : le vocabulaire du jeu, un mot, une définition, le module qui en a la charge. La skill de revue s'en servira la prochaine fois.
- **Les intérieurs au pixel** : les tuiles faisaient 128 pixels depuis la 2.7, mais le plancher, le lambris, le tapis et le tableau se dessinaient encore en blocs de deux pixels, à l'ancienne finesse de 16 texels par unité. Ils passent à 32 pour de bon (Jordan a dit « 36 » : les tuiles vont par puissances de deux, 32 est la valeur de tout le décor extérieur) : joints et chanfreins d'un pixel, clous de deux pixels, nœuds ovales, fibres qui ondulent le long de la latte et dans la hauteur du lambris ; le tapis gagne un médaillon à double contour avec sa croix, une bordure à dents de loup, des rosaces aux coins et des franges fines ; le tableau passe de 20 × 14 à 40 × 28 pixels, avec trois rangs de collines, une maisonnette, des nuages et des herbes.

### Mesures

| Critère | Résultat |
|---|---|
| Panneaux | fiche ouverte par F, fermée par Échap ; grimoire fermé par un clic sur le fond ; les deux par l'hôte |
| Instantané | `__lia.gameState()` rend 20 champs (10 avant) |
| Lande | `__lia.lande(true)` : arrivée en (25,2 ; 10,5), `decouvertes` = `piece:maison`, `lieu:lande` |
| Modules purs | `places.js` et `state.js` s'exécutent dans Node sans navigateur |
| Intérieurs | maison, bibliothèque, auberge revues : lattes, lambris et tapis lisibles au pixel, zéro erreur console |
