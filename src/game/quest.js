// La quête : ce qui se dit quand on parle à un habitant, dans quel ordre, et
// ce qu'on y gagne. Le moteur ne choisit aucune phrase : il enchaîne les
// morceaux de data/dialogues.js selon l'état de la partie.
//
//   première visite         intro, lecon, question
//   visite suivante         retour, puis lecon et question tant que le
//                           parchemin n'est pas gagné ; retour seul ensuite
//   mauvaise réponse        son retour, puis la question de nouveau, le choix
//                           essayé grisé
//   bonne réponse           son retour, le parchemin (sauvegardé aussitôt,
//                           compteur animé), puis la recompense
//   l'habitant du diplôme   ne pose sa question que si tous les parchemins
//                           sont réunis ; la recompense ouvre le diplôme, et
//                           chaque visite suivante le rouvre

import { recordVisit, saveGameState } from './state.js';

// dialogue : la boîte (dialogue.js) ; state : l'état de partie ; texts :
// data/dialogues.js ; scrolls : identifiants des parchemins à gagner ; counter :
// le compteur (hud.js) ; diploma : l'écran du diplôme (diploma.js).
export function createQuest({ dialogue, state, texts, scrolls, counter, diploma }) {
  const missing = () => scrolls.filter((id) => !state.parchemins.has(id)).length;

  function showDiploma() {
    dialogue.close();
    diploma.open();
  }

  // Bonne réponse : on note le choix et on remet le parchemin (ou le diplôme)
  // avant la dernière page, pour qu'une page fermée trop tôt ne le perde pas.
  function reward(entry, key, index) {
    state.choix.set(key, index);
    if (entry.diplome) {
      saveGameState(state);
      dialogue.open(entry.nom, entry.recompense, showDiploma);
      return;
    }
    state.parchemins.add(key);
    saveGameState(state);
    counter.gain(key);
    dialogue.open(entry.nom, entry.recompense);
  }

  // La question, et un nouvel essai après chaque mauvaise réponse. tried :
  // indices des choix déjà essayés.
  function ask(entry, key, tried) {
    const { question } = entry;
    const options = question.choix.map((choice, i) => ({ texte: choice.texte, ecarte: tried.has(i) }));
    dialogue.ask(entry.nom, question.texte, options, (index) => {
      const choice = question.choix[index];
      if (choice.bon) {
        dialogue.open(entry.nom, [choice.retour], () => reward(entry, key, index));
      } else {
        tried.add(index);
        dialogue.open(entry.nom, [choice.retour], () => ask(entry, key, tried));
      }
    });
  }

  return {
    // Ouvre la conversation avec npc.
    talk(npc) {
      const key = npc.character.dialogue;
      const entry = texts[key];
      const first = (state.visites.get(npc.id) ?? 0) === 0;
      const opening = first ? entry.intro(state) : entry.retour(state);
      recordVisit(state, npc.id);
      const lesson = () => dialogue.open(entry.nom, [...opening, ...entry.lecon], () => ask(entry, key, new Set()));

      if (entry.diplome) {
        if (state.choix.has(key)) dialogue.open(entry.nom, opening, showDiploma);
        else if (missing() > 0) dialogue.open(entry.nom, opening);
        else lesson();
      } else if (state.parchemins.has(key)) {
        dialogue.open(entry.nom, opening);
      } else {
        lesson();
      }
    },
    // Vrai tant qu'une conversation ou le diplôme occupe l'écran : le héros
    // ne bouge pas, la bulle ne s'affiche pas.
    get isBusy() {
      return dialogue.isOpen || diploma.isOpen;
    },
  };
}
