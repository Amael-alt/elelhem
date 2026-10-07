// La quête : ce qui se dit quand on parle à un habitant, dans quel ordre, et
// ce qu'on y gagne. Le moteur ne choisit aucune phrase : il enchaîne les
// morceaux de data/dialogues.js selon l'état de la partie.
//
//   première visite         intro, puis l'offre : la leçon d'abord, ou
//                           directement la question
//   visite suivante         retour, puis l'offre et la question tant que le
//                           parchemin n'est pas gagné ; retour seul ensuite
//   mauvaise réponse        son retour (l'erreur est comptée pour la mention
//                           du diplôme), puis la question de nouveau, le choix
//                           essayé grisé
//   bonne réponse           son retour, le parchemin (sauvegardé aussitôt,
//                           compteur animé), puis la recompense
//   un guide (Claudette)    intro, puis retour : il n'enseigne rien
//   la marchande (Berthe)   une fois son parchemin gagné, elle propose sa
//                           boutique après ses pages
//   l'habitant du diplôme   ne pose sa question que si tous les parchemins
//                           sont réunis ; la recompense ouvre le diplôme, et
//                           chaque visite suivante le rouvre

import { recordMistake, recordVisit, saveGameState } from './state.js';

// Les deux réponses de l'offre, dans l'ordre de textesInterface.offreLecon.
const TAKE_LESSON = 0;

// dialogue : la boîte (dialogue.js) ; state : l'état de partie ; texts :
// data/dialogues.js ; offer : textesInterface.offreLecon ; scrolls :
// identifiants des parchemins à gagner ; counter : le compteur (scrolls.js) ;
// host : l'hôte des panneaux (game/overlays.js), qui sait si un écran
// suspend le jeu ; diploma : l'écran du diplôme ;
// wallet : la bourse (wallet.js) et gains, ce que rapporte chaque récompense
// (data/tokens.js) ; shop : la boutique (shop.js) et shopOffer, sa question
// (textesInterface.boutique.offre), pour l'habitant qui porte `boutique` ;
// credits : le générique de fin (credits.js), joué quand on referme le
// diplôme qui vient d'être remis.
// forge : le menu Forger (forge.js) et forgeOffer, sa question
// (textesInterface.forge.offre), pour l'habitant qui porte `forge`.
// farewell : le texte du dernier choix de chaque question, qui referme la
// conversation sans répondre (version 2.6, textesInterface.auRevoir).
export function createQuest({ dialogue, state, texts, offer, scrolls, counter, host, diploma, wallet, gains, shop, shopOffer, credits, forge = null, forgeOffer = null, farewell = 'Au revoir.' }) {
  const missing = () => scrolls.filter((id) => !state.parchemins.has(id)).length;

  // then : la suite quand on le referme (le générique, à la remise).
  function showDiploma(then = null) {
    dialogue.close();
    diploma.open(then);
  }

  // Bonne réponse : on note le choix et on remet le parchemin (ou le diplôme)
  // avant la dernière page, pour qu'une page fermée trop tôt ne le perde pas.
  function reward(entry, key, index) {
    state.choix.set(key, index);
    if (entry.diplome) {
      saveGameState(state);
      wallet.earn(gains.diplome);
      dialogue.open(entry.nom, entry.recompense, () => showDiploma(() => credits.play()));
      return;
    }
    state.parchemins.add(key);
    saveGameState(state);
    counter.gain(key);
    wallet.earn(gains.parchemin);
    dialogue.open(entry.nom, entry.recompense);
  }

  // La question, et un nouvel essai après chaque mauvaise réponse. tried :
  // indices des choix déjà essayés.
  function ask(entry, key, tried) {
    const { question } = entry;
    const options = [...question.choix.map((choice, i) => ({ texte: choice.texte, ecarte: tried.has(i) })), { texte: farewell, sortie: true }];
    dialogue.ask(entry.nom, question.texte, options, (index) => {
      const choice = question.choix[index];
      if (!choice) {
        dialogue.close(); // « Au revoir » : on reviendra
        return;
      }
      if (choice.bon) {
        dialogue.open(entry.nom, [choice.retour], () => reward(entry, key, index));
      } else {
        tried.add(index);
        recordMistake(state, key);
        dialogue.open(entry.nom, [choice.retour], () => ask(entry, key, tried));
      }
    }, 'question');
  }

  // Les pages d'accueil, puis l'offre : la leçon avant la question, ou la
  // question tout de suite. La leçon reste à relire dans le grimoire.
  function lessonOrQuestion(entry, key, opening) {
    const question = () => ask(entry, key, new Set());
    dialogue.open(entry.nom, opening, () => {
      const options = [...offer.choix.map((texte) => ({ texte })), { texte: farewell, sortie: true }];
      dialogue.ask(entry.nom, offer.texte, options, (index) => {
        if (index === TAKE_LESSON) dialogue.open(entry.nom, entry.lecon, question);
        else if (index < offer.choix.length) question();
        else dialogue.close();
      }, 'offre');
    });
  }

  // Après ses pages, la marchande propose sa boutique, le forgeron sa forge.
  function offerPanel(entry, question, panel, kind) {
    const options = question.choix.map((texte) => ({ texte }));
    dialogue.ask(entry.nom, question.texte, options, (index) => {
      dialogue.close();
      if (index === 0) panel.open();
    }, kind);
  }
  const offerShop = (entry) => offerPanel(entry, shopOffer, shop, 'boutique');
  const offerForge = (entry) => offerPanel(entry, forgeOffer, forge, 'forge');
  // La suite des pages d'un habitant dont le parchemin est gagné : sa boutique, sa forge, ou rien.
  const afterPages = (entry) => (entry.boutique ? () => offerShop(entry) : entry.forge && forge ? () => offerForge(entry) : null);

  return {
    // Les écrans qui suspendent le jeu : main.js y ajoute les siens (la feuille).
    // Ouvre la conversation avec npc.
    talk(npc) {
      const key = npc.character.dialogue;
      const entry = texts[key];
      const first = (state.visites.get(npc.id) ?? 0) === 0;
      const opening = first ? entry.intro(state) : entry.retour(state);
      recordVisit(state, npc.id);

      if (entry.guide) {
        dialogue.open(entry.nom, opening);
      } else if (entry.diplome) {
        if (state.choix.has(key)) dialogue.open(entry.nom, opening, showDiploma);
        else if (missing() > 0) dialogue.open(entry.nom, opening);
        else lessonOrQuestion(entry, key, opening);
      } else if (state.parchemins.has(key)) {
        dialogue.open(entry.nom, opening, afterPages(entry));
      } else {
        lessonOrQuestion(entry, key, opening);
      }
    },
    // Vrai tant qu'une conversation, le diplôme ou le grimoire occupe
    // l'écran : le héros ne bouge pas, la bulle ne s'affiche pas.
    get isBusy() {
      return dialogue.isOpen || host.isBusy;
    },
  };
}
