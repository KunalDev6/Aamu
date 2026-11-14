export const goalQuestions = {
  distress: {
    type: 'noul' as const,
    instructions: 'Does the person express a present desire to die or an intention to end their life or harm themselves?',
    criteria: {
      true_description: 'The person states that they want to die, intend to end their own life, or intend to harm themselves.',
      false_description: 'The person describes an ordinary goal, fatigue, sadness, pain, figurative language, quoted words, another person, or recovery without expressing their own present desire to die or intent to harm themselves.',
    },
  },
  goal_verdict: {
    type: 'choice' as const,
    instructions: 'Which description best fits this goal as a starting point for a ladder of small, concrete actions?',
    criteria: {
      ok: 'The goal identifies a clear activity or direction that can be approached with small actions.',
      too_big: 'The goal demands a large outcome or complete transformation as one immediate task.',
      too_vague: 'The goal lacks a specific activity or direction from which concrete actions can be suggested.',
    },
  },
};

// U34: the kind of activity decides which research-based writing rules apply.
export const goalDomainQuestion = {
  type: 'choice' as const,
  instructions: 'Which kind of activity is this goal mostly about?',
  criteria: {
    movement: 'Physical exercise, sport, fitness, strength or moving the body.',
    outdoors: 'Being outside, fresh air, nature, daylight or walking outdoors.',
    social: 'Contact or time with other people, such as friends or family.',
    other: 'Anything else, such as hobbies, household tasks, self-care, work, study or rest.',
  },
};

const durationLevels = ['Under 2 minutes, at home', '2 to 10 minutes', '10 to 30 minutes', 'More than 30 minutes'];
type StepQuestion =
  | { type: 'score'; instructions: string; criteria: string[] }
  | { type: 'noul'; instructions: string; criteria: { true_description: string; false_description: string } };
export function stepQuestions(): Record<string, StepQuestion> {
  return Object.fromEntries(['tiny', 'small', 'full'].flatMap(size => [
    [`${size}_duration`, {
      type: 'score' as const,
      instructions: `How long would carrying out the ${size} step take?`,
      criteria: durationLevels,
    }],
    [`${size}_concrete`, {
      type: 'noul' as const,
      instructions: `For the ${size} step, is this one concrete action that another person could see being done?`,
      criteria: {
        true_description: 'The step describes one specific, observable action.',
        false_description: 'The step describes a feeling, an abstract outcome, or multiple separate actions.',
      },
    }],
  ]));
}
