// One explicit false restores the normal first-run store. Presenter fixtures
// stay in this folder; real identity and code pairing are never seeded.
export const demoEnabled = process.env.EXPO_PUBLIC_DEMO_MODE !== 'false';
// Presenter choice (U31): demo fixtures stay on, but the word "Demo" is kept off
// the screens an audience sees. Set EXPO_PUBLIC_DEMO_LABELS=true to show it again.
// The Demo control panel itself always says what it is.
export const demoLabelsVisible = process.env.EXPO_PUBLIC_DEMO_LABELS === 'true';
/** The labelled wording, or the plain wording while labels are hidden. */
export const demoText = (labelled: string, plain: string) => demoLabelsVisible ? labelled : plain;
