// Tous les textes du jeu, séparés du moteur : rien d'autre ne contient de
// phrase. C'est ce qui permet de réutiliser le moteur avec d'autres textes
// (un autre village, une autre langue) sans toucher au code.
//
// FORMAT GELÉ (étape 1e). Une entrée par habitant, la clé est celle du champ
// `dialogue` de data/characters.js :
//
//   cle: {
//     nom,         nom affiché au-dessus du texte
//     intro,       (etat) => [pages]   première rencontre ; fonction de l'état
//                  pour les variantes (le prénom, par exemple)
//     lecon,       [pages]             l'explication de la notion
//     question,    { texte, choix: [{ texte, bon, retour }, ...] }
//                  trois choix, un seul bon ; `retour` répond à chaque choix
//     recompense,  [pages]             la remise du parchemin
//     retour,      (etat) => [pages]   quand on revient voir l'habitant
//   }
//
// `etat` : { prenom, parchemins: Set, visites: Map, choix: Map }, voir
// game/state.js. Une page tient en 170 caractères au plus (lisible sur
// téléphone sans défilement), elle est neutre en genre et tutoie le joueur.
// Aucun tiret long : virgules, deux-points ou points.

// Nombre de parchemins à gagner : Lia et sept artisans. Le dernier habitant,
// l'architecte, remet le diplôme.
export const PARCHEMINS_TOTAL = 8;

// Les textes de l'interface : écran titre, bulle de parole, noms des quartiers
// affichés dans le bandeau de lieu (les rectangles sont dans world/layout.js).
export const textesInterface = {
  titre: 'Le Village de LIA',
  contree: "Contrée d'Ellelhem",
  signature: 'Jordan Goussery, formateur et consultant IA à Bayonne',
  site: 'https://maintenant-vous-savez.com',
  prenom: 'Ton prénom (facultatif)',
  commencer: 'Appuyer pour commencer',
  reprendre: 'Appuyer pour reprendre la partie',
  nouvellePartie: 'Nouvelle partie',
  parlerA: (nom) => `Parler à ${nom}`,
  musique: { couper: 'Couper le son', remettre: 'Remettre le son' },
  lieux: {
    place: 'La place du puits',
    forge: 'La forge',
    bibliotheque: 'La bibliothèque',
    apothicairerie: "L'apothicairerie et son jardin",
    tour: "La tour de l'architecte",
    porte: 'La porte de la muraille',
    auberge: "L'auberge",
    colombier: 'Le colombier',
    chantier: 'Le chantier',
    pont: 'Le pont',
    prairie: "La prairie de l'est",
  },
};

// « , Prénom » quand le joueur a donné le sien, rien sinon.
const apres = (etat) => (etat.prenom ? `, ${etat.prenom}` : '');

export const dialogues = {
  lia: {
    nom: 'Lia',

    intro: (etat) => [
      `Bienvenue à Ellelhem${apres(etat)}. Moi, c'est Lia, et ça se prononce comme « l'IA ». Ce n'est pas un hasard.`,
      'Dis le nom de la contrée à voix haute : « èl, èl, hem ». Presque les lettres L, L, M, comme les grands modèles de langage cachés derrière les IA que tu utilises.',
      "Ici, chaque habitant garde une notion de l'IA. Écoute-les, réponds à leur question, et tu repartiras avec un parchemin de chacun.",
      "Je te guiderai. Je suis brillante, mais je ne vois que ce qu'on m'apporte : viens me parler quand tu te perds.",
    ],

    lecon: [
      'Un grand modèle de langage, un LLM, a lu énormément de textes. Son talent : deviner quel mot a le plus de chances de venir ensuite.',
      'Il enchaîne les mots un par un. Il ne « sait » pas comme un livre de référence : il continue ta phrase de la façon la plus plausible.',
      "Plus tu lui apportes de contexte clair, meilleure est la suite qu'il devine. Il ne lit pas dans tes pensées.",
    ],

    question: {
      texte: 'Que fait un grand modèle de langage, au fond ?',
      choix: [
        {
          texte: 'Il retrouve la réponse exacte dans une encyclopédie.',
          bon: false,
          retour: "Presque : on le croit souvent, mais il ne consulte rien. Il continue le texte de façon plausible, d'où des erreurs très bien présentées.",
        },
        {
          texte: "Il prédit la suite la plus probable d'un texte.",
          bon: true,
          retour: "Bien vu : il enchaîne les mots les plus plausibles, un par un, d'après tout ce qu'il a lu.",
        },
        {
          texte: 'Il réfléchit comme une personne, avec ses opinions.',
          bon: false,
          retour: "Non : il n'a ni souvenirs ni opinions à lui. Il calcule des probabilités de mots, et le fait si bien qu'on s'y trompe.",
        },
      ],
    },

    recompense: [
      "Voici ton premier parchemin : « Un LLM devine la suite la plus probable d'un texte. » Garde-le, il y en a sept autres à gagner.",
    ],

    retour: (etat) => {
      const restants = PARCHEMINS_TOTAL - etat.parchemins.size;
      if (restants <= 0) {
        return [`Tu as tout rassemblé${apres(etat)}. Va trouver Clodomir, l'architecte : il t'attend avec une surprise.`];
      }
      const pluriel = restants > 1 ? 's' : '';
      return [`Te revoilà${apres(etat)}. Il reste ${restants} parchemin${pluriel} à gagner : va parler aux habitants du village.`];
    },
  },
};
