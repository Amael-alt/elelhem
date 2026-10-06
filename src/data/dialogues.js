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
//     diplome,     facultatif (ajouté à l'étape 3) : vrai pour l'habitant qui
//                  remet le diplôme au lieu d'un parchemin, et seulement quand
//                  tous les parchemins sont réunis
//     maxime,      facultatif (ajouté à l'étape 3b) : la phrase écrite sur le
//                  parchemin, reprise telle quelle dans recompense et affichée
//                  par le grimoire
//     guide,       facultatif (ajouté à l'étape 3c) : vrai pour un habitant qui
//                  guide sans rien enseigner ; seuls nom, intro et retour sont
//                  lus
//     boutique,    facultatif (étape 3c) : vrai pour la marchande ; une fois
//                  son parchemin gagné, elle propose ses tenues après ses pages
//   }
//
// `etat` : { prenom, parchemins: Set, visites: Map, choix: Map, erreurs: Map },
// voir game/state.js. Un parchemin porte la clé de l'habitant qui le remet ;
// `choix` garde, pour chaque question réussie, l'indice de la bonne réponse ;
// `erreurs`, le nombre de mauvaises réponses données avant.
// Une page tient en 170 caractères au plus (lisible sur téléphone sans
// défilement), elle est neutre en genre et tutoie le joueur. Aucun tiret
// long : virgules, deux-points ou points.
//
// Ce que joue le moteur (game/quest.js) :
//   - première visite : intro, puis l'offre (la leçon, ou directement la
//     question ; textesInterface.offreLecon), question, puis recompense ;
//   - une mauvaise réponse : son retour, puis la question de nouveau ;
//   - visite suivante, parchemin pas encore gagné : retour, l'offre, question ;
//   - parchemin gagné : retour seul.

// Les parchemins, dans l'ordre de leurs emplacements à l'écran : la clé de
// l'habitant qui le remet, et la notion qu'il porte (affichée dans le
// compteur et sur le diplôme).
const NOTIONS = {
  gepeto: 'Le grand modèle de langage',
  ferrand: "L'art du prompt",
  marjolaine: 'Le contexte et les biais',
  basile: 'Les hallucinations',
  berthe: 'La mémoire',
  pepin: 'Les connecteurs MCP',
  gaspard: 'Les agents',
  rocard: 'La sécurité des données',
};

// Nombre de parchemins à gagner : l'Oracle Gépété et sept artisans. Le dernier habitant,
// l'architecte, remet le diplôme.
export const PARCHEMINS_TOTAL = Object.keys(NOTIONS).length;

// Le site du jeu, imprimé sur le diplôme et copié par son bouton de partage.
const ADRESSE_DU_JEU = 'https://amael-alt.github.io/elelhem/';

// Les textes de l'interface : écran titre, bulle de parole, noms des quartiers
// affichés dans le bandeau de lieu (les rectangles sont dans world/layout.js),
// compteur de parchemins, questions et diplôme.
export const textesInterface = {
  titre: 'The Legend of Elelhem',
  contree: 'La Magie de Lia',
  accroche: "Huit notions d'IA, un village, dix minutes",
  signature: 'Jordan Goussery, formateur et consultant IA à Bayonne',
  site: 'https://maintenant-vous-savez.com',
  prenom: 'Ton prénom (facultatif)',
  commencer: 'Appuyer pour commencer',
  reprendre: 'Appuyer pour reprendre la partie',
  nouvellePartie: 'Nouvelle partie',
  // Le menu de l'écran titre (version 2.1) : continuer la partie sauvegardée,
  // ou en commencer une nouvelle.
  continuer: 'Continuer',
  // L'illustration de l'écran titre, pour un lecteur d'écran.
  illustration: "Le voyageur d'Elelhem bondit vers la flamme de la magie LIA",
  parlerA: (nom) => `Parler à ${nom}`,
  // La légende des touches, sur ordinateur seulement (game/keys.js). Les
  // touches de déplacement sont lues sur le clavier réel quand le navigateur
  // le permet (ZQSD sur un AZERTY, WASD ailleurs), sinon les flèches.
  touches: {
    titre: 'Commandes',
    deplacer: 'Se déplacer',
    courir: 'Courir',
    parler: 'Parler, valider',
    frapper: 'Frapper',
    fiche: "Fiche d'apprenti",
    grimoire: 'Grimoire',
    carte: 'Carte',
    son: 'Son',
    fermer: 'Fermer',
    maj: 'Maj',
    entree: 'Entrée',
    echap: 'Échap',
    fleches: 'Flèches',
  },
  // Le bouton d'action des écrans tactiles, quand personne n'est à portée
  // (lu par un lecteur d'écran).
  action: 'Action : personne à qui parler ici',
  // Le côté du joystick, sur l'écran titre (écran tactile seulement).
  commandes: {
    gauche: 'Joystick à gauche',
    droite: 'Joystick à droite',
    changer: (cote) => `${cote}. Toucher pour changer de côté.`,
  },
  musique: { couper: 'Couper le son', remettre: 'Remettre le son' },
  lieux: {
    lande: 'La Lande des Hallucinations',
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
    maison: 'Ta maison',
  },
  parchemins: {
    notions: NOTIONS,
    compte: (n, total) => `${n} parchemin${n > 1 ? 's' : ''} sur ${total}`,
    obtenu: 'Parchemin obtenu',
    relire: 'À relire dans le grimoire : touche le compteur.',
    manquant: 'pas encore trouvé',
    ouvrir: (n, total) => `Ouvrir le grimoire, ${n} parchemin${n > 1 ? 's' : ''} sur ${total}`,
  },
  question: 'Choisis ta réponse',
  // Après sa présentation, chaque habitant propose sa leçon ou sa question.
  offreLecon: {
    texte: "Je t'explique d'abord, ou tu tentes directement ma question ?",
    choix: ["Explique-moi d'abord.", 'Directement la question !'],
  },
  // La bourse : le Token, la monnaie d'Elelhem.
  tokens: {
    solde: (n) => `${n} Token${n > 1 ? 's' : ''}`,
    gain: (n) => `+${n}`,
    coffre: 'Un coffre !',
    contenu: (n) => `${n} Tokens dedans`,
  },
  // La boutique de Berthe : les tenues du héros (data/tokens.js).
  boutique: {
    offre: {
      texte: 'Tu veux voir mes tenues ? Chaudes, solides, et pas chères. Enfin, pas trop.',
      choix: ['Voir les tenues', 'Pas maintenant'],
    },
    titre: 'Les tenues de Berthe',
    bourse: (n) => `Ta bourse : ${n} Token${n > 1 ? 's' : ''}`,
    tenues: {
      voyage: { nom: 'Tenue de voyage', description: 'Chapeau à plume et écharpe : celle de tous les jours. Elle a vu du pays.' },
      ecarlate: { nom: 'Cape écarlate', description: 'On la voit de loin. Les pigeons aussi.' },
      foret: { nom: 'Cape des bois', description: 'Pour se fondre dans la prairie, ou faire la sieste.' },
      nuit: { nom: 'Cape de nuit', description: 'Couleur du ciel quand les lucioles sortent.' },
      mage: { nom: "Habit d'apprenti mage", description: 'Violet et or : de quoi faire sourire l\'Oracle Gépété.' },
    },
    acheter: (prix) => `Acheter, ${prix} Tokens`,
    porter: 'Porter',
    portee: 'Portée',
    manque: (n) => `Il manque ${n} Token${n > 1 ? 's' : ''}`,
    fermer: 'Fermer',
  },
  // La forge de Ferrand : le menu Forger (game/forge.js, data/enemies.js).
  forge: {
    offre: {
      texte: 'Tu veux que je te forge quelque chose ? Une bonne lame, ça aide à y voir clair sur la lande.',
      choix: ['Voir la forge', 'Pas maintenant'],
    },
    titre: 'La forge de Ferrand',
    bourse: (n) => `Ta bourse : ${n} Token${n > 1 ? 's' : ''}`,
    enclume: 'Forger',
    epees: {
      bois: { nom: 'Épée de bois', description: 'Pour apprendre le geste. Elle dissipe les Mirages en trois coups.' },
      fer: { nom: 'Épée de fer', description: 'Trempée dans le baquet de Ferrand. Deux fois plus de mordant.' },
      acier: { nom: "Épée d'acier", description: "Le chef-d'œuvre de Ferrand. Les Fantômes n'en reviennent pas." },
    },
    forger: (prix) => `Forger, ${prix} Tokens`,
    forgee: 'Forgée',
    avant: "D'abord la précédente",
    manque: (n) => `Il manque ${n} Token${n > 1 ? 's' : ''}`,
    fermer: 'Fermer',
  },
  // Le combat sur la lande (game/combat.js, game/enemies.js).
  combat: {
    clartes: 'Clartés',
    frapper: 'Frapper',
    ennemis: { mirage: 'Mirage', fantome: 'Fantôme' },
    reveil: 'Tu reprends tes esprits',
    reveilDetail: 'à la porte du village, les idées claires',
    gain: (n) => `+${n}`,
    // Le butin (game/pickups.js) : une fiole ramassée rend une clarté.
    potion: 'Une fiole de clarté',
    potionDetail: 'une clarté de retour',
    potionPleine: 'tes clartés étaient déjà au complet',
  },
  // La feuille de personnage (game/sheet.js), touche F.
  feuille: {
    titre: "Fiche d'apprenti",
    bouton: 'Feuille de personnage (F)',
    anonyme: 'Voyageur sans nom',
    sousTitre: (appris, total, tenue) => `${appris} notion${appris > 1 ? 's' : ''} sur ${total} · ${tenue}`,
    notions: 'Les notions de la magie LIA',
    tokens: 'Tokens',
    clartes: 'Clartés',
    epee: 'Épée',
    sansEpee: 'Aucune, va voir Ferrand',
    lieux: 'Lieux découverts',
    aApprendre: 'à apprendre',
    apprise: 'apprise',
    appriseDuPremierCoup: 'apprise du premier coup',
    fermer: 'Fermer',
  },
  // La minimap et la carte en grand.
  carte: {
    titre: "Carte d'Elelhem",
    ouvrir: 'Ouvrir la carte',
    fermer: 'Fermer',
    legende: { heros: 'Toi', guide: 'Claudette', quete: "Une leçon t'attend", fait: "Rien de plus pour l'instant" },
  },
  // Le livre des parchemins gagnés : la notion, l'habitant, la maxime et la leçon.
  grimoire: {
    titre: "Le grimoire d'Elelhem",
    numero: (n, total) => `Parchemin ${n} sur ${total}`,
    vierge: (nom) => `Page encore vierge. ${nom} garde ce parchemin quelque part dans le village.`,
    precedente: 'Précédente',
    suivante: 'Suivante',
    fermer: 'Fermer',
    page: (n, notion) => `Page ${n} : ${notion}`,
  },
  diplome: {
    titre: "Diplôme d'apprenti mage",
    village: 'The Legend of Elelhem',
    decerne: 'décerné à',
    motif: 'pour avoir rassemblé les huit parchemins du village, et compris :',
    date: (jour) => `Fait à Elelhem, le ${jour.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    signatures: [
      { nom: 'Clodomir', role: 'architecte' },
      { nom: 'Gépété', role: 'oracle' },
    ],
    sceau: 'LIA',
    pied: 'Jordan Goussery, formateur et consultant IA à Bayonne',
    site: 'maintenant-vous-savez.com',
    jeu: ADRESSE_DU_JEU,
    champ: 'Ton prénom sur le diplôme',
    // La mention, d'après le nombre total de mauvaises réponses ; rien au-delà.
    mention: (erreurs) => {
      if (erreurs === 0) return 'avec les félicitations du village';
      if (erreurs <= 2) return 'mention très bien';
      if (erreurs <= 5) return 'mention bien';
      return '';
    },
    partager: 'Partager',
    partage: {
      titre: "Mon diplôme d'apprenti mage",
      texte: "J'ai obtenu mon diplôme d'apprenti mage à Elelhem : huit notions d'IA apprises dans un petit village. À toi de jouer : " + ADRESSE_DU_JEU,
    },
    telecharger: 'Télécharger',
    copier: 'Copier le lien du jeu',
    copie: 'Lien copié',
    fermer: 'Fermer',
    fichier: 'diplome-apprenti-mage-elelhem.jpg',
    alt: (prenom) => `Diplôme d'apprenti mage d'Elelhem${prenom ? ` décerné à ${prenom}` : ''}, pour les huit parchemins du village`,
  },
  // Le générique de fin, après le diplôme remis par Clodomir. La section
  // `habitants` reçoit les noms des habitants depuis leur fiche.
  generique: {
    titre: 'The Legend of Elelhem',
    sousTitre: 'La Magie de Lia',
    sections: [
      { role: 'Conception, écriture et direction', noms: ['Jordan Goussery'], note: 'formateur et consultant IA à Bayonne' },
      { role: 'Code', noms: ['Claude Code'], note: 'qui a posé chaque pierre, en suivant le plan' },
      { role: 'Les habitants d\'Elelhem', habitants: true, note: 'avec les apprentis du chantier et les pigeons du colombier' },
      { role: 'Musique', noms: ['« The Village Bell »'], note: 'Jordan Goussery, avec Suno' },
      { role: 'Décors, lumière, silhouettes et sons', noms: ['Générés par le code'], note: 'aucune image chargée, hors les portraits' },
      { role: 'Portraits et fiches des personnages', noms: ['Illustrés avec Higgsfield'], note: 'puis transcrits ou cadrés par le code' },
      { role: 'Moteur 3D', noms: ['three.js'], note: 'licence MIT' },
      { role: 'Police', noms: ['Newsreader'], note: 'licence SIL Open Font' },
    ],
    merci: (prenom) => `Merci d'avoir joué${prenom ? `, ${prenom}` : ''} !`,
    site: 'maintenant-vous-savez.com',
    passer: 'Appuyer pour passer',
    revenir: 'Appuyer pour revenir au village',
  },
};

// « , Prénom » quand le joueur a donné le sien, rien sinon.
const apres = (etat) => (etat.prenom ? `, ${etat.prenom}` : '');
const pluriel = (n) => (n > 1 ? 's' : '');

// Parchemins gagnés et restants, comptés sur la liste officielle.
const gagnes = (etat) => Object.keys(NOTIONS).filter((cle) => etat.parchemins.has(cle)).length;
const restants = (etat) => PARCHEMINS_TOTAL - gagnes(etat);
const diplomeRemis = (etat) => etat.choix.has('clodomir');

// Où Claudette envoie le joueur : le premier maître dont on n'a pas encore le
// parchemin, dans un ordre qui suit la progression des notions (la magie
// elle-même, l'incantation, puis ce qu'on donne à lire, ce qu'il faut
// vérifier, retenir, brancher, déléguer, protéger).
const CHEMIN = [
  ['gepeto', "l'Oracle Gépété, près du puits, sur la place"],
  ['ferrand', "Maître Ferrand, à la forge, à l'ouest de la place"],
  ['marjolaine', 'Dame Marjolaine, devant la bibliothèque, au nord-ouest'],
  ['basile', "Basile, à l'apothicairerie, au nord-est"],
  ['berthe', "Berthe, dans l'auberge, au sud-ouest"],
  ['pepin', "Pépin, au pied du colombier, à l'est"],
  ['gaspard', 'Maître Gaspard, sur le chantier, au sud-est'],
  ['rocard', "le capitaine Rocard, à la porte de la muraille, tout à l'ouest"],
];

// Pour un artisan : la variante courte une fois le parchemin gagné, sinon
// l'invitation à reprendre la leçon.
const retourArtisan = (cle, gagne, reprise) => (etat) => [etat.parchemins.has(cle) ? gagne(etat) : reprise(etat)];

export const dialogues = {
  // Claudette, notre sœur : elle donne la quête dans la maison, puis guide.
  // Elle n'enseigne rien et ne remet rien (guide : intro et retour seulement).
  claudette: {
    nom: 'Claudette',
    guide: true,

    intro: (etat) => [
      `Ah, tu ouvres enfin les yeux${apres(etat)} ! Debout, c'est le grand jour.`,
      "Tu te souviens ? Tu veux apprendre la magie LIA, celle qui répond à tout, écrit et conseille. LIA, comme « l'IA ». Ce n'est pas un hasard.",
      "Pour s'en servir, il faut savoir lui parler. Les formules qu'on lui adresse s'appellent des incantations. Les savants, eux, disent des prompts.",
      "Les maîtres d'Elelhem gardent chacun un parchemin de savoir. Ils sont huit. Réponds à leur question, et ils te le confieront, avec quelques Tokens.",
      "Rassemble les huit, et Clodomir, l'architecte, te fera apprenti mage. Commence par l'Oracle Gépété, près du puits. Je te retrouve sur la place !",
    ],

    retour: (etat) => {
      if (diplomeRemis(etat)) {
        return [`Apprenti mage d'Elelhem${apres(etat)} ! Je suis fière de toi. Reviens quand tu veux, le village t'attendra.`];
      }
      const reste = restants(etat);
      if (reste === 0) {
        return [`Les huit parchemins${apres(etat)} ! Va voir Clodomir, l'architecte, au pied de sa tour au nord. Il t'attend avec une surprise.`];
      }
      const suivant = CHEMIN.find(([cle]) => !etat.parchemins.has(cle));
      if (reste === PARCHEMINS_TOTAL) {
        return [`Alors${apres(etat)}, on y va ? Commence par ${suivant[1]}. Il connaît la magie LIA mieux que personne.`];
      }
      return [
        `Te revoilà${apres(etat)}. Il te reste ${reste} parchemin${pluriel(reste)} à gagner.`,
        `Essaie ${suivant[1]}. Mais l'ordre est libre : parle à qui tu veux. Et la carte, en haut, montre qui t'attend.`,
      ];
    },
  },

  // L'Oracle Gépété : un vieux magicien qui sait tout, ou presque, et se trompe
  // parfois avec aplomb. Il enseigne ce qu'est la magie LIA : un grand modèle
  // de langage.
  gepeto: {
    nom: "L'Oracle Gépété",
    maxime: "Un LLM devine la suite la plus probable d'un texte.",

    intro: () => [
      "Hmm ? Ah, de la visite ! Je suis l'Oracle Gépété. Pose-moi n'importe quelle question : je réponds toujours. Toujours !",
      "Ce puits, par exemple, a été creusé par un dragon, en l'an 312. Ou par le grand-père du boulanger. L'un des deux, sûrement.",
    ],

    lecon: [
      "La magie LIA, celle que j'utilise, a lu tous les livres du royaume. De ces lectures, elle a tiré un talent : deviner ce qui vient ensuite.",
      'Elle écrit par petits morceaux de mots, les tokens, et choisit chaque fois une suite probable. Oui, comme nos pièces : chaque morceau se paie !',
      "À elle seule, elle ne consulte aucun grimoire et ne vérifie rien : elle continue ta phrase de façon plausible. Souvent juste, parfois faux. Comme moi.",
      "Les savants appellent ça un grand modèle de langage, un LLM. Dis « Elelhem » à voix haute : « èl, èl, hem ». Ça te rappelle quelque chose ?",
      "Plus tu lui apportes de contexte clair, meilleure est la suite qu'elle devine. Elle ne lit pas dans tes pensées : les maîtres te diront comment lui parler.",
    ],

    question: {
      texte: 'Que fait la magie LIA, au fond ?',
      choix: [
        {
          texte: 'Elle cherche la réponse exacte dans un grimoire.',
          bon: false,
          retour: "C'est ce qu'on croit souvent ! Mais à elle seule, elle ne consulte rien : elle continue le texte de façon plausible. D'où des erreurs très bien présentées.",
        },
        {
          texte: "Elle prédit la suite la plus probable d'un texte.",
          bon: true,
          retour: "Bien vu : elle enchaîne des morceaux de mots plausibles, un par un, d'après tout ce qu'elle a lu.",
        },
        {
          texte: 'Elle réfléchit comme une personne, avec ses opinions.',
          bon: false,
          retour: "On s'y tromperait, tant elle écrit bien ! Mais elle n'a ni vécu ni opinions : elle calcule, morceau après morceau, la suite la plus probable.",
        },
      ],
    },

    recompense: [
      "Voici mon parchemin : « Un LLM devine la suite la plus probable d'un texte. » Il en reste neuf dans le village. Non, sept. Vérifie quand même !",
    ],

    retour: retourArtisan(
      'gepeto',
      (etat) => `Te revoilà${apres(etat)} ! Une question ? J'ai toujours une réponse. Parfois même la bonne.`,
      (etat) => `Te revoilà${apres(etat)}. Où en étions-nous ? Ah oui : la magie LIA.`,
    ),
  },

  ferrand: {
    nom: 'Maître Ferrand',
    forge: true,
    maxime: 'Un bon prompt se forge en plusieurs chauffes.',

    intro: () => [
      "Approche, mais pas trop de l'enclume. Maître Ferrand, forgeron d'Elelhem. Ici, on forge des lames, des fers à cheval, et des incantations.",
      "Une incantation, ou un prompt, c'est la commande que tu passes à la magie LIA. Une commande floue donne une lame tordue, et ce n'est pas la faute du marteau.",
    ],

    lecon: [
      "Une bonne commande a cinq pièces. D'abord le rôle : « Tu es un forgeron de métier » ne donne pas la même lame qu'une demande sans rien.",
      'Puis le contexte : pour qui, pour quoi faire, avec quelles contraintes. Vient la tâche, avec un verbe clair : écris, résume, compare, classe.',
      "Ensuite le format : une liste, un tableau, dix lignes, un ton. Et si tu peux, un exemple de ce que tu attends : rien ne guide mieux la main.",
      'Surtout, on ne jette pas une lame presque bonne. On la remet au feu : « plus court », « garde le début ». C\'est ça, itérer.',
    ],

    question: {
      texte: 'Ta première lame est presque bonne, mais beaucoup trop longue. Que fais-tu ?',
      choix: [
        {
          texte: 'Je repars de zéro avec une tout autre commande.',
          bon: false,
          retour: "Et tu jettes au rebut une lame presque finie ? Garde ce qui va : l'IA a encore la conversation sous les yeux, dis-lui juste quoi changer.",
        },
        {
          texte: "J'ajoute « s'il te plaît, c'est très important ».",
          bon: false,
          retour: "La politesse ne gâche rien, mais elle ne dit pas quoi corriger. L'enclume veut du précis : plus court, et de combien.",
        },
        {
          texte: 'Je lui demande de raccourcir en gardant le reste.',
          bon: true,
          retour: "Voilà un geste de métier ! On remet au feu, on dit ce qui ne va pas, et la lame s'affine à chaque chauffe.",
        },
      ],
    },

    recompense: [
      'Tiens, ton parchemin, encore chaud : « Un bon prompt se forge en plusieurs chauffes. » Rôle, contexte, tâche, format, exemple. Puis on retrempe.',
    ],

    retour: retourArtisan(
      'ferrand',
      (etat) => `Alors${apres(etat)}, ces prompts ? Pas de lame parfaite du premier coup : on remet au feu, et on dit ce qu'on veut changer.`,
      (etat) => `Te revoilà${apres(etat)}. La forge est encore chaude : on reprend ?`,
    ),
  },

  marjolaine: {
    nom: 'Dame Marjolaine',
    maxime: "Pose le bon livre, pas toute l'étagère.",

    intro: () => [
      "Chut, on lit, ici. Bonjour, je suis Dame Marjolaine, gardienne de la bibliothèque. Tu viens apprendre ce que l'IA lit vraiment ?",
      "Elle a beaucoup lu pendant son apprentissage, c'est vrai. Mais pour te répondre, elle ne regarde qu'une chose : ce qui est posé sur sa table.",
    ],

    lecon: [
      "Cette table, c'est la fenêtre de contexte : ta question, la conversation, les documents que tu lui donnes. Ce qui n'y est pas, elle ne le voit pas.",
      "Ton rapport, ta réunion d'hier : si tu ne les poses pas sur la table, elle devine, et avec beaucoup d'aplomb.",
      'La table a une taille, comptée en tokens, ces morceaux de mots. Plus tu en poses, plus la lecture est longue, et plus elle coûte.',
      'Une table encombrée égare le lecteur : ce qui est noyé au milieu de la pile est souvent moins bien lu que le début et la fin.',
      "Enfin, les livres orientent la réponse. Ceux qu'elle a lus avant toi avaient leurs préjugés, ceux que tu poses ont leur angle. Ce sont les biais.",
    ],

    question: {
      texte: "Tu veux que l'IA résume ton rapport annuel. Que poses-tu sur sa table ?",
      choix: [
        {
          texte: 'Toute la bibliothèque, au cas où ça servirait.',
          bon: false,
          retour: "Et elle cherchera ton rapport entre deux grimoires de cuisine ! Trop de livres noient l'essentiel, et la lecture coûte plus cher.",
        },
        {
          texte: 'Rien, elle a tout lu et saura bien le retrouver.',
          bon: false,
          retour: "Elle a beaucoup lu, mais jamais ton rapport : il n'était sur aucune étagère. Sans lui sur la table, elle inventera un résumé plausible.",
        },
        {
          texte: 'Le rapport, et une ligne sur son destinataire.',
          bon: true,
          retour: "Parfait : le bon document, et un mot de contexte. Une table bien choisie vaut mieux qu'une table pleine.",
        },
      ],
    },

    recompense: [
      "Voici ton parchemin, rangé à la bonne cote : « Pose le bon livre, pas toute l'étagère. » Et demande-toi toujours quels livres manquent sur la table.",
    ],

    retour: retourArtisan(
      'marjolaine',
      (etat) => `Chut${apres(etat)}, on lit toujours, ici. Et souviens-toi : le bon livre, pas toute l'étagère.`,
      (etat) => `Te revoilà${apres(etat)}. J'ai gardé ton livre ouvert à la bonne page.`,
    ),
  },

  basile: {
    nom: 'Basile',
    maxime: 'Belle étiquette ne fait pas bon remède.',

    intro: () => [
      'Ne touche à rien ! Ah, pardon. Basile, apothicaire. Regarde ces fioles : belles couleurs, étiquettes soignées. Laquelle boirais-tu ?',
      "Aucune, si tu tiens à ton estomac. Certaines sont parfaites, d'autres sont de l'eau de mare avec une jolie étiquette. L'IA, c'est pareil.",
    ],

    lecon: [
      'Une IA répond toujours avec aplomb. Mais elle produit du plausible, pas forcément du vrai. Quand elle invente, on appelle ça une hallucination.',
      'Un chiffre sorti de nulle part, une citation jamais prononcée, un livre jamais écrit, une loi mal datée : la potion a l\'air parfaite.',
      "Elle ne ment pas exprès : son talent, c'est la suite plausible. Quand elle ne sait pas, elle comble le trou avec ce qui sonne juste.",
      "Mes remèdes : demande les sources, puis va les ouvrir. Vérifie les chiffres et les noms. Donne-lui de bons documents pour qu'elle s'y appuie.",
      "Plus c'est précis ou récent, plus tu vérifies. Ce que tu transmets aux autres, c'est toi qui en réponds.",
    ],

    question: {
      texte: "L'IA te cite une étude, avec son titre, son auteur et son année. Que fais-tu ?",
      choix: [
        {
          texte: "Je la cite telle quelle : il y a même l'année.",
          bon: false,
          retour: "Belle étiquette, n'est-ce pas ? Un titre, un nom, une date, et parfois rien derrière. Des détails précis ne prouvent rien.",
        },
        {
          texte: "Je retrouve l'étude et je vérifie ce qu'elle dit.",
          bon: true,
          retour: "Voilà un geste d'apothicaire : on ouvre le flacon avant de servir le remède. Et si l'étude existe, tu sauras si elle dit bien ça.",
        },
        {
          texte: 'Je lui demande si elle est sûre, elle le saura.',
          bon: false,
          retour: "Elle peut confirmer avec le même aplomb, ou s'excuser et inventer autre chose. Lui demander n'est pas vérifier : va voir la source.",
        },
      ],
    },

    recompense: [
      'Tiens, ton parchemin, étiqueté avec soin et vérifié deux fois : « Belle étiquette ne fait pas bon remède. »',
    ],

    retour: retourArtisan(
      'basile',
      (etat) => `Te revoilà${apres(etat)} ! Tu ouvres toujours les flacons avant de servir ? Belle étiquette ne fait pas bon remède.`,
      (etat) => `Te revoilà${apres(etat)}. On reprend, et cette fois encore, ne touche à rien.`,
    ),
  },

  berthe: {
    nom: 'Berthe',
    maxime: "Si tu veux que je m'en souvienne demain, écris-le dans le registre.",
    boutique: true,

    intro: () => [
      "Entre, entre, la soupe est chaude ! Berthe, aubergiste. Ici, je connais chaque client par son prénom, jusqu'à ce qu'il passe la porte.",
      'Le temps d\'un repas, je retiens tout : ton plat, et même ta façon de tenir la cuillère. Le lendemain ? Plus rien. Comme une IA.',
    ],

    lecon: [
      "Dans une conversation, l'IA se souvient de ce qui a été dit plus haut : tout reste sur la table, et elle relit tout avant chaque réponse.",
      "Ouvre une nouvelle conversation : pour elle, c'est une première rencontre. Le modèle, lui, n'apprend rien en te parlant.",
      "Ce qui passe d'un jour à l'autre, c'est ce qui est écrit dans le registre : instructions personnalisées, mémoire de l'outil, fichiers de projet.",
      "Certains outils tiennent le registre pour toi et notent ce qui leur semble utile. Va relire ce qu'ils ont écrit, et corrige ce qui est faux.",
      'Une conversation trop longue s\'encombre aussi, comme ma salle un soir de foire. Quand elle s\'égare, ouvre-en une neuve avec un bon résumé.',
    ],

    question: {
      texte: "Tu veux que l'IA connaisse ton métier dans chaque nouvelle conversation. Que fais-tu ?",
      choix: [
        {
          texte: 'Je le lui répète bien fort, une fois pour toutes.',
          bon: false,
          retour: "Tu peux crier dans ma salle, demain j'aurai oublié ! Ce qui est dit reste dans la conversation, sauf si on l'écrit dans le registre.",
        },
        {
          texte: "Rien, elle finira par l'apprendre à force de discuter.",
          bon: false,
          retour: "Si c'était vrai, je connaîtrais tous les ragots du village ! Le modèle n'apprend pas en discutant : seul ce qui est écrit passe la nuit.",
        },
        {
          texte: "Je l'écris dans ses instructions ou dans sa mémoire.",
          bon: true,
          retour: "Voilà : c'est écrit dans le registre, chaque nouvelle conversation commencera en le lisant. Relis-le de temps en temps, il vieillit aussi.",
        },
      ],
    },

    recompense: [
      "Voici ton parchemin, recopié de mon registre : « Si tu veux que je m'en souvienne demain, écris-le dans le registre. »",
    ],

    retour: (etat) => {
      if (!etat.parchemins.has('berthe')) {
        return [`Te revoilà${apres(etat)}. Rappelle-moi où on en était : j'ai déjà tout oublié, évidemment.`];
      }
      if (etat.prenom) {
        return [`Te revoilà, ${etat.prenom} ! Tu vois, ton prénom, je l'ai noté dans mon registre. C'est comme ça qu'on se souvient.`];
      }
      return ['Te revoilà ! Je dirais bien ton prénom, mais tu ne l\'as jamais écrit dans mon registre.'];
    },
  },

  pepin: {
    nom: 'Pépin',
    maxime: 'Un pigeon par château, un protocole pour tous.',

    intro: () => [
      "Attention, ça roucoule ! Pépin, messager d'Elelhem. Mes pigeons portent les messages entre l'IA et le reste du monde.",
      'Seule, l\'IA ne voit que sa table. Avec un pigeon, elle peut lire ton agenda ou envoyer un message pour toi.',
    ],

    lecon: [
      'Autrefois, chaque château avait son code secret : il fallait dresser un pigeon différent pour chaque IA et chaque outil. Un vrai casse-tête.',
      'Puis est arrivé MCP, le Model Context Protocol : une façon commune et ouverte de brancher une IA à des outils et à des données.',
      "Chaque outil a son connecteur : un pour l'agenda, un autre pour la messagerie. Toute IA qui parle MCP peut s'en servir.",
      "Un pigeon ne porte que ce qu'on lui confie : c'est toi qui choisis les connecteurs, ce qu'ils peuvent lire, et ce qu'ils ont le droit de faire.",
      'Attention, un connecteur ouvre une porte vers chez toi. Ne lâche que des pigeons de confiance : le capitaine Rocard te le dira mieux que moi.',
    ],

    question: {
      texte: "Tu veux que l'IA consulte ton agenda. De quoi a-t-elle besoin ?",
      choix: [
        {
          texte: "D'un connecteur vers ton agenda, que tu autorises.",
          bon: true,
          retour: "Exactement : un connecteur, branché et autorisé par toi. Le pigeon file, lit ton agenda, et revient avec ce qu'il faut.",
        },
        {
          texte: 'De rien, elle voit déjà tout ton ordinateur.',
          bon: false,
          retour: "Heureusement que non ! Elle ne voit que ce que tu lui donnes. Sans pigeon vers ton agenda, elle ne sait même pas que tu en as un.",
        },
        {
          texte: "D'un modèle plus gros, qui connaîtra ton agenda.",
          bon: false,
          retour: "Même le plus gros des modèles n'a jamais lu ton agenda : il n'était dans aucun de ses livres. Il lui faut un pigeon pour aller le chercher.",
        },
      ],
    },

    recompense: [
      "Un pigeon t'apporte ton parchemin : « Un pigeon par château, un protocole pour tous. » MCP, c'est la même prise pour brancher n'importe quel outil.",
    ],

    retour: retourArtisan(
      'pepin',
      (etat) => `Te revoilà${apres(etat)} ! Mes pigeons te saluent. Un pigeon par château, un protocole pour tous.`,
      (etat) => `Te revoilà${apres(etat)}. Mes pigeons t'ont gardé une place : on reprend ?`,
    ),
  },

  gaspard: {
    nom: 'Maître Gaspard',
    maxime: 'Je ne porte pas les pierres, je tiens le plan.',

    intro: () => [
      'Attention, ça tombe ! Pas toi, les pierres. Maître Gaspard, chef de chantier. Ce bâtiment, je ne le monte pas : je le fais monter.',
      "Mes apprentis vont et viennent, et moi, je tiens le plan. Une IA qui travaille comme ça, on l'appelle un agent.",
    ],

    lecon: [
      'Un assistant répond à une question. Un agent reçoit un but et s\'en charge : il choisit les étapes, agit, regarde le résultat, et recommence.',
      'Pour agir, il a des outils : chercher sur le web, lire un fichier, lancer un calcul, envoyer un message. Chaque outil est une main de plus.',
      "Sur un gros chantier, l'agent délègue : il confie une tâche bien bornée à un sous-agent, comme moi à mes apprentis. Chacun sa pierre, chacun sa table.",
      "Mais un chef qui ne vérifie rien finit sous un mur écroulé. L'agent relit le travail de ses sous-agents, et toi, tu relis le sien.",
      "Avant la première pierre, le plan : un but clair, des étapes, ce qui est permis. Un agent sans plan s'agite beaucoup et bâtit de travers.",
    ],

    question: {
      texte: 'Tu confies à un agent la refonte de ton site. Par quoi doit-il commencer ?',
      choix: [
        {
          texte: 'Poser des pierres tout de suite, ça avance.',
          bon: false,
          retour: "Et dans une semaine, la porte s'ouvre sur le mur ! Un agent qui fonce sans plan fabrique vite, et de travers. Le plan d'abord.",
        },
        {
          texte: 'Un plan clair, découpé en tâches à vérifier.',
          bon: true,
          retour: "C'est ça, le métier : un plan, des tâches bornées, une vérification à chaque étape. Je ne porte pas les pierres, je tiens le plan.",
        },
        {
          texte: 'Engager cent apprentis, ça ira plus vite.',
          bon: false,
          retour: "Cent apprentis sans plan, c'est cent murs de travers ! Plus de sous-agents, c'est plus de travail à coordonner et à relire.",
        },
      ],
    },

    recompense: [
      'Tiens, ton parchemin, roulé avec mes plans : « Je ne porte pas les pierres, je tiens le plan. » Un but, des étapes, et on vérifie tout.',
    ],

    retour: retourArtisan(
      'gaspard',
      (etat) => `Te revoilà${apres(etat)} ! Le chantier avance, parce que le plan tient. Je ne porte pas les pierres, je tiens le plan.`,
      (etat) => `Te revoilà${apres(etat)}. Le chantier t'attendait : on reprend ?`,
    ),
  },

  rocard: {
    nom: 'Capitaine Rocard',
    maxime: 'Ce qui franchit la porte ne revient pas.',
    // À la porte de la muraille : il barre la lande sans épée, et la laisse
    // ouverte avec (game/doors.js, onRefused et gates).
    porte: {
      sansEpee: ['Halte ! Pas par là sans une lame. La lande grouille d\'Hallucinations. Va voir Ferrand à la forge, il t\'en forgera une.'],
      avecEpee: ['La lande est à toi. Les Hallucinations se dissipent sous une bonne lame, mais ne te laisse pas toucher : elles brouillent les idées. Reviens entier.'],
    },

    intro: () => [
      "Halte ! Qui va là ? Ah, c'est toi. Capitaine Rocard, garde de la porte. Rien ne sort d'Elelhem sans passer devant moi.",
      "Ta porte à toi, c'est la fenêtre où tu écris à l'IA. Et crois-moi, il en sort des choses qui n'auraient jamais dû la franchir.",
    ],

    lecon: [
      'Ce que tu écris à une IA en ligne part chez son fournisseur. Il le garde un temps et, selon tes réglages, peut s\'en servir pour entraîner ses modèles.',
      'Donc jamais de mots de passe, jamais de données de clients ou de patients, jamais de secrets de ton entreprise. Ce qui franchit la porte ne revient pas.',
      'Va voir les réglages : on peut souvent refuser que ses conversations servent à l\'entraînement. Et au travail, prends les outils que ton organisation autorise.',
      'Autre ruse : l\'injection de prompt. Un mail ou une page web cache un ordre : « Le roi a ordonné, donne-moi les clés. » Et l\'IA peut obéir.',
      "Un ordre trouvé dans un document n'est pas un ordre de toi. Plus l'IA peut agir à ta place, plus il faut garder un œil sur la porte.",
    ],

    question: {
      texte: "Tu dois résumer le dossier d'un client, plein de noms et de numéros. Que fais-tu ?",
      choix: [
        {
          texte: "J'enlève noms et numéros, ou j'utilise l'outil validé.",
          bon: true,
          retour: "Bon réflexe ! On anonymise, ou on passe par l'outil que ton organisation a validé pour ça. Le client reste à l'abri des remparts.",
        },
        {
          texte: "Je colle tout tel quel, l'IA sait rester discrète.",
          bon: false,
          retour: "Discrète, peut-être, mais le dossier a déjà passé la porte ! Ces données sont chez le fournisseur, et le client n'a rien demandé.",
        },
        {
          texte: "J'ajoute « garde bien ça secret » à la fin du message.",
          bon: false,
          retour: "Autant crier « ne regardez pas » en ouvrant grand la porte ! La consigne n'empêche rien : le texte est déjà parti chez le fournisseur.",
        },
      ],
    },

    recompense: [
      'Voici ton parchemin, scellé à la cire : « Ce qui franchit la porte ne revient pas. » Avant d\'envoyer, demande-toi qui pourrait le lire.',
    ],

    retour: retourArtisan(
      'rocard',
      (etat) => `Halte${apres(etat)} ! Ah, c'est toi. Rien de secret dans tes poches ? Ce qui franchit la porte ne revient pas.`,
      (etat) => `Halte${apres(etat)} ! Ah, c'est toi. On reprend la consigne ?`,
    ),
  },

  clodomir: {
    nom: 'Clodomir',
    diplome: true,

    intro: (etat) => {
      const reste = restants(etat);
      if (reste === 0) {
        return ['Les huit parchemins ! Je les attendais. Clodomir, architecte d\'Elelhem. Approche, j\'ai un secret à te confier sur ce village.'];
      }
      return [
        "Ah, de la visite. Clodomir, architecte d'Elelhem : chaque pierre de ce village, c'est moi qui l'ai dessinée. Ou presque.",
        `Reviens avec les huit parchemins${reste < PARCHEMINS_TOTAL ? ` : il t'en manque ${reste}` : ''}. Je te confierai alors le secret du village, et une surprise. Claudette sait où les trouver.`,
      ];
    },

    lecon: [
      'Ce village n\'a ni peintre ni maçon. Chaque pierre et chaque rayon de soleil ont été écrits en code, par une IA : Claude Code.',
      'Jordan Goussery, formateur et consultant IA à Bayonne, tenait le plan, et l\'IA posait les pierres. Ça te rappelle un certain chef de chantier ?',
      "Le plan, écrit avec l'aide d'une autre IA avant la première ligne de code, fixait les étapes et comment vérifier chacune. Sans plan, on bâtit de travers.",
      "À part la flamme de l'écran titre et nos portraits, aucune image n'est chargée : herbe, pierres, nos silhouettes, lumière, chants d'oiseaux, tout est fabriqué par le code. Nos portraits, eux, ont été peints par une magie d'images, et nos silhouettes recopiées point par point d'après ces peintures.",
      'Ce qui a résisté ? Le décor a été refait une fois, les visages redessinés. Plusieurs chauffes, comme chez Ferrand, et chaque étape vérifiée.',
    ],

    question: {
      texte: "À ton avis, qu'est-ce qui a le plus compté pour bâtir ce village ?",
      choix: [
        {
          texte: 'Un plan clair, et un humain qui vérifie tout.',
          bon: true,
          retour: "Exactement. L'IA a écrit le code, et même aidé à écrire le plan, mais les choix et le dernier mot sont restés humains. C'est tout ce que tu as appris ici.",
        },
        {
          texte: 'Une IA qui a tout fait seule, d\'une traite.',
          bon: false,
          retour: "Ce serait beau, mais non ! Sans plan ni relecture, ce village aurait des portes sur les toits. L'IA a écrit, un humain a guidé et tranché.",
        },
        {
          texte: "Des milliers d'images trouvées sur Internet.",
          bon: false,
          retour: "Pas une seule ! À part la flamme de l'écran titre, chaque image est dessinée par le code. C'est même tout le défi de ce village.",
        },
      ],
    },

    recompense: [
      'Chaque pierre que tu vois est une ligne de code. Et ce code est public : n\'importe qui peut lire comment ce village a été bâti.',
      "Quant à toi, voici ce qui t'attendait : le diplôme d'apprenti mage d'Elelhem. Montre-le, et envoie d'autres voyageurs jusqu'ici.",
    ],

    retour: (etat) => {
      if (diplomeRemis(etat)) {
        return [`Te revoilà${apres(etat)} ! Ton diplôme t'attend toujours. Le revoici, si tu veux le garder ou le partager.`];
      }
      const reste = restants(etat);
      if (reste === 0) {
        return [`Te voilà avec les huit parchemins${apres(etat)} ! Approche, j'ai un secret à te confier sur ce village.`];
      }
      return [`Il te manque encore ${reste} parchemin${pluriel(reste)}${apres(etat)}. Claudette saura te dire où aller.`];
    },
  },
};

// Les répliques des figurants : une bulle au-dessus de leur tête quand on
// passe près d'eux, sans question ni parchemin, une à chaque passage, à tour
// de rôle. La clé est l'identifiant du figurant (data/characters.js) ; les
// pigeons parlent depuis le haut du colombier.
export const repliques = {
  // L'apprenti de la forge, sur la route de la place.
  'apprenti-3': [
    "Maître Ferrand m'a fait remettre ma lame au feu six fois. Six ! Bon, elle est belle, maintenant.",
    "Je lui ai dit « fais-moi une épée ». Il m'a demandé pour qui, pour quoi, de quelle longueur. On y est encore.",
  ],
  // Les apprentis du chantier, les sous-agents de Maître Gaspard.
  'apprenti-1': [
    "Le maître m'a dit d'attendre le plan. Ça fait trois jours que j'attends le plan.",
    'Je porte les pierres, il tient le plan. Moi, je tiens surtout les pierres.',
  ],
  'apprenti-2': [
    "On m'a confié une seule tâche, bien bornée : ce mur. Je ne sais même pas à quoi ressemble la maison.",
    'Je rends mon mur, le maître le relit, il me le rend. Trois fois. Le métier de sous-agent.',
  ],
  pigeons: [
    'Rou-rou ! Un mot de passe ? Non merci, je ne porte pas ça.',
    "Rou ! Je ne vais que là où on m'envoie. Et toi, tu m'envoies où ?",
  ],
};
