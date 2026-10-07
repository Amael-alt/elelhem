// Les sprites transcrits, un module par personnage, réunis par leur nom : la
// fiche d'un habitant (data/characters.js) dit « sprite: 'ferrand' », et
// gfx/sprites.js vient chercher ses grilles ici. Chaque module a été produit
// par outils/transcrire-sprite.mjs depuis une fiche dessinée, puis retouché.

import { heros } from './heros.js';
import { claudette } from './claudette.js';
import { gepeto } from './gepeto.js';
import { ferrand } from './ferrand.js';
import { marjolaine } from './marjolaine.js';
import { basile } from './basile.js';
import { pepin } from './pepin.js';
import { rocard } from './rocard.js';
import { berthe } from './berthe.js';
import { gaspard } from './gaspard.js';
import { clodomir } from './clodomir.js';
import { apprenti } from './apprenti.js';
// Le marchand de fioles et la lavandière (version 2.3), figurants qui parlent.
import { marchand } from './marchand.js';
import { lavandiere } from './lavandiere.js';
// Les tenues du héros (data/tokens.js), une planche chacune.
import { heros_ecarlate } from './heros_ecarlate.js';
import { heros_foret } from './heros_foret.js';
import { heros_nuit } from './heros_nuit.js';
import { heros_mage } from './heros_mage.js';
import { heros_cascade } from './heros_cascade.js';
// Les Hallucinations de la lande (data/enemies.js).
import { mirage } from './mirage.js';
import { fantome } from './fantome.js';

export const sprites = { heros, claudette, gepeto, ferrand, marjolaine, basile, pepin, rocard, berthe, gaspard, clodomir, apprenti, marchand, lavandiere, heros_ecarlate, heros_foret, heros_nuit, heros_mage, heros_cascade, mirage, fantome };
