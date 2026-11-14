/**
 * Research-based writing rules (U34). Gemini Decision sorts the goal into one of
 * these kinds; Gemma then writes the three sizes under that kind's rules. The
 * explanation and source shown to the person are these fixed sentences, checked
 * against the cited papers on 14 November 2026. The model never writes a research
 * claim or a citation. They describe an approach; they are not medical advice.
 */
export const goalDomains = ['movement', 'outdoors', 'social', 'other'] as const;
export type GoalDomain = typeof goalDomains[number];
export type GoalBasis = { domain: GoalDomain; why: string; source: string };

const activation = 'Richards et al., The Lancet, 2016 (COBRA trial)';
const exercise = 'Noetel et al., BMJ, 2024';

export const goalEvidence: Record<GoalDomain, { rules: string[]; why: string; source: string }> = {
  movement: {
    rules: [
      'This goal is about moving the body. Any amount of movement counts, and walking, yoga-like stretching and simple strength moves are all good choices.',
      'Tiny is a short burst the person can do beside the bed with no equipment, with a count, such as a number of squats or a named stretch.',
      'Small and Full use walking, or the activity the person named, with a duration. Full is the named activity done properly.',
    ],
    why: 'Any amount of movement counts. A 2024 review of 218 trials found that walking or jogging, yoga and strength training each reduced depression.',
    source: exercise,
  },
  outdoors: {
    rules: [
      'This goal is about being outside. Prefer daylight, somewhere green, and walking to a named kind of place rather than only a length of time.',
      'Tiny is stepping just outside the door, or to an open window or balcony, for a short named action such as ten slow breaths.',
      'Small is a short walk to a nearby point and back. Full is a longer walk somewhere green or pleasant.',
    ],
    why: 'Walking is one of the best-studied kinds of exercise for depression, and going out early puts you in daylight at the start of the day.',
    source: exercise,
  },
  social: {
    rules: [
      'This goal is about contact with people the person already knows. Small, planned contact counts.',
      'Tiny is one short message to one person. Small is a short call or voice message. Full is time together or a longer call.',
      'Say what kind of contact it is. Never name a specific person and never suggest meeting strangers.',
    ],
    why: 'Small, planned contact with people you value is part of behavioural activation, which was no less effective than CBT for depression in a large trial.',
    source: activation,
  },
  other: {
    rules: [
      'Choose actions that give a small sense of enjoyment, or of having finished something the person can see.',
      'Each size leaves a visible result or a clear end point, such as a number of items or a finished part.',
    ],
    why: 'Small, planned activities that matter to you are the core of behavioural activation, which was no less effective than CBT for depression in a large trial.',
    source: activation,
  },
};
export const goalBasis = (domain: GoalDomain): GoalBasis => ({ domain, why: goalEvidence[domain].why, source: goalEvidence[domain].source });
