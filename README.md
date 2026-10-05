# Le Village de LIA

Un petit RPG en HD-2D, jouable dans le navigateur, dans la contrée d'Ellelhem. Chaque habitant du village transpose une notion d'intelligence artificielle en univers médiéval fantastique : le forgeron forge des prompts, la bibliothécaire veille sur le contexte, l'apothicaire se méfie des potions trop belles pour être vraies.

**Aucune image n'est chargée par le jeu.** Textures, personnages, ciel et effets de lumière sont générés par le code au chargement de la page.

> **En construction, en public.** Le village se bâtit étape par étape. Pour l'instant, on promène un voyageur à capuche sur un village provisoire (place pavée, chemins, murets, rivière et gué), au clavier : ZQSD, WASD ou flèches, molette pour le zoom. Le récit de la construction est dans [`docs/construction.md`](docs/construction.md).

- **Jouer** : https://amael-alt.github.io/village-de-lia/
- **Mesurer** : ajouter `?debug` à l'adresse pour afficher les images par seconde et le coût du rendu.

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

Arborescence prévue :

```
index.html        page unique : carte d'import, conteneurs de l'interface
styles.css        interface par-dessus le canvas
vendor/three/     three.js, avec sa licence
src/main.js       démarrage, boucle, redimensionnement
src/core/         rendu, caméra, entrées (clavier, joystick)
src/gfx/          pixels, textures, matériaux, sprites, post-traitement, effets
src/world/        carte, terrain, bâtiments, collisions
src/game/         joueur, habitants, dialogues, quête, interface, débogage
src/data/         palette, habitants, textes des dialogues
docs/             journal de construction
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

## Licence

Code et textes sous licence MIT, voir [`LICENSE`](LICENSE). Le logo Maintenant Vous Savez, la flamme de l'écran titre, en est exclu : tous droits réservés.
