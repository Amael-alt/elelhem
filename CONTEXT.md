# Le vocabulaire du jeu

Les mots que le code, le journal et les revues d'architecture emploient pour parler d'Elelhem. Un mot, une définition, le module qui en a la charge. À compléter quand un nouveau concept reçoit un nom.

| Mot | Ce que c'est | Qui en a la charge |
|---|---|---|
| **Héros** | Le personnage que le joueur dirige, sans genre connu, qui apprend la magie LIA. | `game/player.js`, sa planche dans `data/sprites/heros.js` |
| **Habitant** | Un personnage du village qui parle. Un **maître** enseigne une notion ; le **guide** (Claudette) n'enseigne rien ; un **figurant** reste à son poste et lance des répliques. | `data/characters.js`, `game/npc.js` |
| **Notion** | Une des huit idées d'IA transposées en magie LIA. Apprise, elle devient un **parchemin** dans le grimoire. | `data/dialogues.js`, `game/scrolls.js`, `game/grimoire.js` |
| **Quête** | Ce qui reste à faire chez un habitant : prendre sa leçon et répondre à sa question. L'habitant du diplôme n'a de quête que les huit parchemins réunis. | `game/quest.js` ; son état par `questStatus` de `game/state.js` |
| **Partie** | L'état qui survit au rechargement : prénom, parchemins, Tokens, tenues, lieux découverts, coffres, épée, exploits... Qui le change le sauvegarde. | `game/state.js` |
| **Lieu** | Ce qui se découvre une fois et se paie une fois : un **quartier** du village (rectangle de `REGIONS`), une **pièce** (l'intérieur d'une maison) ou la **lande**. Chaque lieu a une clé de découverte gelée. | `world/places.js` |
| **Monde** | Une scène où le héros peut être : le village, la lande, ou une pièce. Les **portes** font passer de l'un à l'autre. | `world/village.js`, `world/moor.js`, `world/interior.js`, `game/doors.js` |
| **Panneau** | Un écran posé sur le jeu qui le suspend : grimoire, carte, fiche d'apprenti, boutique, forge, diplôme, générique. L'**hôte des panneaux** sait lequel est ouvert et les referme. | `game/overlays.js`, un module par panneau |
| **Tokens** | La monnaie du village, gagnée en jouant, dépensée chez Berthe et Ferrand. | `game/wallet.js`, `data/tokens.js` |
| **Clartés** | Les points de vie du héros sur la lande, cinq au plus ; une **fiole** en rend une. | `game/combat.js` |
| **Hallucination** | Un ennemi de la lande, dissipé par l'épée, qui lâche du butin. | `data/enemies.js`, `game/enemies.js`, `game/pickups.js` |
| **Point d'action** | Un endroit du village où le bouton d'action fait autre chose que parler : le puits à vœux, une cachette, la pomme, l'étal des fioles, le défi du mannequin. | `game/spots.js` |
| **Exploit** | Un des six titres décrochés en jouant, affichés en sceaux sur la fiche. | `game/exploits.js` |
| **Annonce** | Le bandeau du HUD qui dit ce qu'on vient de gagner (« +3 Tokens », un exploit). Vit encore dans le compteur de parchemins. | `game/scrolls.js` (`say`) |
| **Planche** | La feuille de sprites d'un personnage, générée par le code depuis ses grilles : repos, marche, course, l'épée à la main, les coups. | `gfx/sprites.js` |
| **Bouffée** | Une émission de particules courte : poussière, feuilles, étincelles, brume, poussière d'étoiles. | `gfx/fx/bursts.js` |
