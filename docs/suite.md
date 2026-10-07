# Où en est le jeu, et ce qui vient ensuite

État au 7 octobre 2026 (soir), pour reprendre le chantier dans une nouvelle session. Le récit détaillé de chaque version, avec ses mesures, est dans [`construction.md`](construction.md) ; les règles du dépôt dans [`../CLAUDE.md`](../CLAUDE.md).

## En ligne

**Version 2.2**, étiquette `v2.2`, publiée le 7 octobre 2026 sur https://amael-alt.github.io/elelhem/ avec les étiquettes `v1.4` à `v2.2` posées d'un coup (les versions 1.4 à 2.2 avaient été validées ensemble, en local).

**Version 2.3**, étiquette `v2.3`, publiée le 7 octobre 2026 au soir après validation de l'auteur.

**Versions 2.4 et 2.5**, étiquettes `v2.4` et `v2.5`, publiées le 7 octobre 2026.

**Version 2.6 en cours** : l'auberge (validée et poussée) puis la forge (en local, à valider), dedans et dehors (voir `construction.md`, « Version 2.6 en cours »). Étiquette `v2.6` à poser quand le lot des décors sera fini.

Ce que le jeu contient : le village d'Elelhem et ses huit maîtres (quête, grimoire, diplôme, générique), les intérieurs, la minimap et la carte, les Tokens et la boutique de Berthe, la forge de Ferrand, la fiche d'apprenti, la Lande des Hallucinations et son combat en temps réel (trois coups qui s'enchaînent, cinq clartés, barres de vie, butin au sol), le tactile complet, l'écran titre en page de parchemin, l'interface illustrée, la légende des touches sur ordinateur. Et depuis la 2.3 : le village de 56 × 42 cases avec le marché, le verger, le lavoir et le terrain d'entraînement, le marchand et la lavandière, les points d'action du village (`game/spots.js`), les étincelles cachées, les exploits (`game/exploits.js`), le coffre et la tenue de la cascade, la carte illustrée.

## Comment on fabrique un sprite ou une pose, depuis la version 1.4

1. Un dessin en pied du personnage est généré (style décrit par ses traits : dessin anime, aquarelle douce, encrage fin ; jamais le nom d'un studio ou d'un jeu), puis une **fiche pixel art à cinq vues** en est dérivée (depuis la version 2.5 : face, trois-quarts face tourné vers la gauche, profil vers la gauche, trois-quarts dos vers la gauche, dos ; proportions de deux têtes et demie), sur fond vert uni `#00FF00`, le portrait du personnage en première référence et la planche du héros (`hf_20261007_094255_7949fbcb`, job `7949fbcb-3665-4bbc-ae33-b26c367a9e23`) en seconde, pour le style et l'échelle. Une pose (un coup d'épée) : trois vues seulement, face, profil, dos. Puis `node outils/detourer.mjs fiche.png --sortie det.png --teinte 18 --ecart 0.3 --rogner 0 --creux 1`, et `node outils/transcrire-sprite.mjs det.png --nom x --vues face,troisQuarts,profil,troisQuartsDos,dos --decoupe ... --hauteur 40 --cadre 48x56 --pieds 53 --couleurs 18` (24 couleurs quand une lumière doit garder son index). Les poses du héros : `--reference` sur sa planche, `--hauteurs` par vue, puis `--decalages` par vue pour caler la tête.
2. `node outils/coupes.mjs fiche.png` donne les deux colonnes de coupe entre les silhouettes (utile quand une lame tendue les relie).
3. `node outils/transcrire-sprite.mjs fiche.png --nom heros_coup1_frappe --sortie src/data/sprites/heros_coup1_frappe.js --cadre 80x88 --pieds 85 --decoupe 431,881 --reference src/data/sprites/heros.js --export heros --repere 479b --ancre repere --hauteurs face=47,profil=46,dos=46 --couleurs 6 --apercu apercu.png` transcrit la fiche en grilles : palette du personnage de référence (plus les tons nouveaux), hauteur imposée par vue (celle que le héros a dans la même pose), ancre sur le chapeau (ou les cheveux : `--repere` accepte des index ou des couleurs hexa, `--repere-part 0.3` limite la recherche au haut de la silhouette). L'aperçu agrandi sert au contrôle à l'œil.
4. Le module produit est branché dans la planche du personnage (`arme` et `coups` dans `src/data/sprites/heros.js` et dans chaque tenue), et `gfx/sprites.js` en fait les colonnes de la planche (36 colonnes : repos, marche, course, les mêmes l'épée à la main, les six poses de coup).
5. Les fiches et dessins ne sont jamais ajoutés au dépôt. Les ornements d'interface passent par `outils/detourer.mjs` (fond rendu transparent), `outils/decouper.mjs` (planche d'icônes vers fichiers) et `outils/portrait.mjs` (PNG à palette).
6. Un figurant qui reste à son poste (le marchand, la lavandière) : même méthode, cadre de 48 × 72, `--hauteur 56` (63 avec un objet qui dépasse la tête), et `figurant: true` dans sa fiche de `data/characters.js` pour qu'il lance ses répliques. Le générateur ignore la demande de fond transparent : demander un fond vert uni (`#00FF00`), détourer avec `--teinte 18 --ecart 0.3`, puis effacer des grilles les index verts restés dans les creux (entre un bras et le corps).

## Comment on refait la carte illustrée

1. `node outils/plan.mjs --sortie plan.png` dessine le plan exact de la grille (cases, bâtiments, arbres) en PNG.
2. Le plan est donné en référence au générateur d'images avec la consigne de garder la géographie à l'identique, bord à bord, et de la repeindre en carte de parchemin (encre sépia, lavis, rose des vents, sans aucun texte). Deux variantes, on garde la plus fidèle (les repères du jeu se posent en coordonnées de la grille : un bâtiment déplacé serait faux).
3. `node outils/reduire.mjs carte.png --sortie assets/ui/carte.png --largeur 1120` la réduit en PNG à palette (800 Ko environ). `game/minimap.js` la charge à la première apparition de la minimap et garde le plan en aplats en attendant.

Hauteurs du héros par pose et par vue, à réutiliser pour une nouvelle tenue (multipliées par le rapport de sa taille debout sur 56, par exemple 62/56 pour le chapeau pointu du mage) : épée à la main 56/56/56 ; premier coup, élan 58/57/59, frappe 47/46/46 ; deuxième coup, élan 52/52/53, frappe 53/53/53 ; troisième coup, élan 75/75/74, frappe 49/49/48.

## Comment vérifier

Tout se vérifie dans un navigateur, sur le serveur local (`npx -y http-server . -a 127.0.0.1 --no-dotfiles -c-1`), en bureau, en mobile 375 × 812 et en paysage 812 × 375, puis sur l'adresse publique après le push. Le déploiement se suit avec `gh run list` (l'exécution « pages build and deployment », une minute environ) ; l'ancien point d'API `pages/builds` peut dire « Page build failed » alors que l'exécution a réussi et que la page est à jour : se fier à l'exécution et à la page. Si une exécution reste bloquée, `gh api -X POST repos/Amael-alt/elelhem/pages/builds` en demande une nouvelle. Les outils de test sont dans `window.__lia` (`galerie`, `lande`, `epee`, `frapper`, `butin`, `tenue`, `walk`, `freeze`, `step`, `stats`...). Deux pièges : un onglet de fond tourne au ralenti (tester dans l'onglet au premier plan) ; une touche envoyée par un pilote de navigateur n'atteint pas toujours le jeu (passer par `__lia.advance()` et `__lia.walk()`).

## Ce qui vient ensuite

Par ordre de priorité, tel que décidé avec l'auteur :

1. **Faire valider la forge** (cour et atelier), puis continuer maison par maison : la bibliothèque, l'apothicairerie, la maison du héros, puis la place. Les textes de la 2.3 (noms des lieux, maximes du puits, répliques du marchand et de la lavandière, exploits, points d'action : `textesInterface.points` et `exploits` dans `data/dialogues.js`) sont publiés sans relecture explicite : à reprendre s'il veut les retoucher.
2. **Les façades, suite possible** : fait en 2.4 pour les maisons (`buildHouse` dans `world/props.js`, piloté par `HOUSES` de `world/layout.js`). Restent nues : les deux tours (`buildTower` dans `world/landmarks.js` : encadrement de porte, lanterne, volets) et le chantier.
3. **La suite de la refonte 2.5** (demandée par l'auteur, pas encore faite) :
   - **La richesse des décors**, extérieurs et intérieurs, le gros morceau restant ; l'auberge et la forge sont faites (version 2.6 en cours). Pour les autres : la bibliothèque, l'apothicairerie, la maison du héros, la place (pavés en éventail, bancs, jardinières), puis un perron surélevé à marches, qui demande de lisser la hauteur du héros d'une case à l'autre. D'après les captures de référence : des niveaux (terrasses, murets de pierre à chaperon, escaliers à rampe, perrons de porte avec balustrade), des pavés en éventail sur les places, des rangées de tonneaux et de jardinières fleuries devant les maisons, des bancs, des lampadaires à lanterne ; dedans, des pièces plus meublées (canapés et fauteuils rouges, tables basses, guéridons, grands tapis à motif, tableaux, escalier vers l'étage, horloge, bibliothèques à hauteur de plafond), des sols de marbre ou de dalles à frise. Méthode proposée : partir d'une seule maison (l'auberge, dedans et dehors), la pousser au niveau des captures, la faire valider, puis étendre.
   - **Redessiner les tenues** : depuis la 2.5, ce ne sont que des recolorations de la planche du héros. La cape de feuilles de la forêt, la cape à lucioles de la nuit, le chapeau pointu du mage ont disparu. Chaque tenue redessinée coûte huit fiches (base et sept poses), soit environ douze crédits.
   - **Les coups en diagonale** : dessinés en quatre directions seulement, le héros se tourne avant de frapper. Les dessiner en trois-quarts coûterait douze fiches de plus.
   - **Les portraits** restent ceux de la version 1.4, dans leur style d'illustration ; à revoir si l'auteur les veut plus proches des captures.
   - Les deux tours et le chantier, restés nus après les façades de la 2.4.
4. Points plus anciens : jamais testé sur un vrai téléphone (images par seconde avec `?debug`, deux pouces, pincement, bouton Partager) ; volumes des sons à valider à l'oreille (`LEVELS` dans `src/core/ambience.js`) ; les libellés du côté du joystick et le générique en mouvement réduit jamais relus ou vus.

Chaque lot suit la même méthode : état des lieux après une partie, série de trois ou quatre questions à choix pour décider, vérification dans le navigateur, journal dans `construction.md`, commits découpés par sujet, push après validation, une étiquette par lot publié.
