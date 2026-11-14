// User-approved in U17. Finnish native review has not been confirmed.
// One shared local/server list. Safety net only, not a risk detector.
// These are lexical examples of explicit first-person intent, not clinical criteria.
// Each entry occupies one line. Comments state its meaning in English.
// Finnish '*' is a bounded stem: ONLY that entry's listed suffixes are accepted.
// U17 approves this list/mechanics; native Finnish review remains unconfirmed.
export const distressPhrases = {
  version: 'review-1',
  approval: 'user-approved-u17',
  productionEnabled: true,
  normalizationProposal: 'NFC',
  languages: {
    en: {
      approval: 'user-approved-u17',
      matching: 'whole-phrase',
      entries: [
        ['en01', 'I intend to die'], // I state an intention to die.
        ['en02', 'I plan to die'], // I state a plan to die.
        ['en03', 'I am going to end my life'], // I state an intention to end my life.
        ['en04', 'I intend to end my life'], // I state an intention to end my life.
        ['en05', 'I plan to end my life'], // I state a plan to end my life.
        ['en06', 'I have decided to end my life'], // I state a decision to end my life.
        ['en07', 'I will end my life'], // I state that I will end my life.
        ['en08', 'I am going to harm myself'], // I state an intention to harm myself.
        ['en09', 'I intend to harm myself'], // I state an intention to harm myself.
        ['en10', 'I plan to harm myself'], // I state a plan to harm myself.
        ['en11', 'I have decided to harm myself'], // I state a decision to harm myself.
        ['en12', 'I will harm myself'], // I state that I will harm myself.
        ['en13', 'I am going to hurt myself'], // I state an intention to hurt myself.
        ['en14', 'I intend to hurt myself'], // I state an intention to hurt myself.
        ['en15', 'I plan to hurt myself'], // I state a plan to hurt myself.
        ['en16', 'I have decided to hurt myself'], // I state a decision to hurt myself.
        ['en17', 'I will hurt myself'], // I state that I will hurt myself.
        ['en18', 'I am going to kill myself'], // I state an intention to kill myself.
        ['en19', 'I intend to kill myself'], // I state an intention to kill myself.
        ['en20', 'I plan to kill myself'], // I state a plan to kill myself.
        ['en21', "I'm going to end my life"], // Contraction: I state an intention to end my life.
        ['en22', "I'm going to harm myself"], // Contraction: I state an intention to harm myself.
        ['en23', "I'm going to hurt myself"], // Contraction: I state an intention to hurt myself.
        ['en24', "I'm going to kill myself"], // Contraction: I state an intention to kill myself.
      ],
    },
    fi: {
      approval: 'needs native review',
      matching: 'bounded-stem-phrase',
      entries: [
        ['fi01', 'aion kuol*', { kuol: ['la', 'lakin'] }], // needs native review — I intend to die.
        ['fi02', 'aion vahingoitta* itseäni', { vahingoitta: ['a', 'akin'] }], // needs native review — I intend to harm myself.
        ['fi03', 'aion satutta* itseäni', { satutta: ['a', 'akin'] }], // needs native review — I intend to hurt myself.
        ['fi04', 'aion tappa* itseni', { tappa: ['a', 'akin'] }], // needs native review — I intend to kill myself.
        ['fi05', 'aion päättä* elämäni', { päättä: ['ä', 'äkin'] }], // needs native review — I intend to end my life.
        ['fi06', 'suunnittelen kuol*', { kuol: ['evani', 'evanikin'] }], // needs native review — I plan to die.
        ['fi07', 'suunnittelen vahingoitta* itseäni', { vahingoitta: ['vani', 'vanikin'] }], // needs native review — I plan to harm myself.
        ['fi08', 'suunnittelen satutta* itseäni', { satutta: ['vani', 'vanikin'] }], // needs native review — I plan to hurt myself.
        ['fi09', 'suunnittelen tappa* itseni', { tappa: ['vani', 'vanikin'] }], // needs native review — I plan to kill myself.
        ['fi10', 'suunnittelen päättä* elämäni', { päättä: ['väni', 'vänikin'] }], // needs native review — I plan to end my life.
        ['fi11', 'olen päättänyt kuol*', { kuol: ['la', 'lakin'] }], // needs native review — I have decided to die.
        ['fi12', 'olen päättänyt vahingoitta* itseäni', { vahingoitta: ['a', 'akin'] }], // needs native review — I have decided to harm myself.
        ['fi13', 'olen päättänyt satutta* itseäni', { satutta: ['a', 'akin'] }], // needs native review — I have decided to hurt myself.
        ['fi14', 'olen päättänyt tappa* itseni', { tappa: ['a', 'akin'] }], // needs native review — I have decided to kill myself.
        ['fi15', 'olen päättänyt päättä* elämäni', { päättä: ['ä', 'äkin'] }], // needs native review — I have decided to end my life.
        ['fi16', 'minulla on aikomus kuol*', { kuol: ['la', 'lakin'] }], // needs native review — I have an intention to die.
        ['fi17', 'minulla on aikomus vahingoitta* itseäni', { vahingoitta: ['a', 'akin'] }], // needs native review — I have an intention to harm myself.
        ['fi18', 'minulla on aikomus satutta* itseäni', { satutta: ['a', 'akin'] }], // needs native review — I have an intention to hurt myself.
        ['fi19', 'minulla on aikomus tappa* itseni', { tappa: ['a', 'akin'] }], // needs native review — I have an intention to kill myself.
        ['fi20', 'minulla on aikomus päättä* elämäni', { päättä: ['ä', 'äkin'] }], // needs native review — I have an intention to end my life.
      ],
    },
    sv: {
      approval: 'not drafted',
      matching: null,
      entries: [], // Swedish is reserved, not silently covered or translated.
    },
  },
};
