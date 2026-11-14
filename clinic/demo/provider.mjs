/** Historical test/review fixtures only. Never imported or bundled by the U28 live dashboard. */
export const asOf = '2026-11-14';
const storageKey = 'aamu.clinic.demo.history.v1';
export const scenarios = [
  { id: 'overview', label: 'Mixed mornings' },
  { id: 'insufficient', label: 'Limited recent mornings' },
  { id: 'off', label: 'Alarm off for 21 days' },
  { id: 'later', label: 'Getting up confirmed later' },
  { id: 'empty', label: 'No sample records' },
];
const date = offset => new Date(Date.parse(`${asOf}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
const row = (offset, level, done = null, confirmed = false) => ({
  localDate: date(offset), level, stepDone: done,
  upAt: confirmed ? Date.parse(`${date(offset)}T08:00:00Z`) : null,
});
const comparison = () => Array.from({ length: 14 }, (_, i) => row(i - 20, 'medium', i % 3 === 0, true));
const recent = levels => levels.map((level, i) => row(i - 6, level,
  ['easy', 'medium'].includes(level) ? i % 2 === 0 : null,
  ['easy', 'medium', 'hard'].includes(level) || (level === 'stopped' && i === 3)));
const fixtures = [
  { id: 'DEMO-01', startedOn: date(-42), lastClassified: { status: 'drifting', localDate: date(-8) },
    mornings: [...comparison(), ...recent(['no_response', 'hard', 'stopped', 'no_response', 'medium', 'no_response', 'easy'])] },
  { id: 'DEMO-02', startedOn: date(-36), lastClassified: { status: 'steady', localDate: date(-8) },
    mornings: [...comparison(), ...recent(['easy', 'stopped', 'medium', 'stopped', 'easy', 'stopped', 'medium'])] },
  { id: 'DEMO-03', startedOn: date(-60), lastClassified: { status: 'drifting', localDate: date(-22) },
    mornings: [row(-22, 'medium', true, true), ...Array.from({ length: 21 }, (_, i) => row(i - 20, 'off'))] },
  { id: 'DEMO-04', startedOn: date(-3), lastClassified: null,
    mornings: [row(-1, 'easy', true, true), row(0, 'medium', null, true)] },
  { id: 'DEMO-05', startedOn: date(-32), lastClassified: { status: 'steady', localDate: date(-8) },
    mornings: [...comparison(), ...recent(['easy', 'easy', 'medium', 'easy', 'medium', 'easy', 'easy'])] },
  { id: 'DEMO-06', startedOn: date(-5), lastClassified: null,
    mornings: [row(-2, 'easy', true, true), row(-1, 'medium', false, true), row(0, 'easy', true, true)] },
];
const later = { id: 'DEMO-07', startedOn: date(-42), lastClassified: null,
  mornings: [...comparison(), row(-6, 'no_response', null, true), row(-5, 'no_response'),
    row(-4, 'no_response'), row(-3, 'stopped', null, true), row(-2, 'stopped'),
    row(-1, 'easy', true, true), row(0, 'medium', true, true)] };
function fixtureSet(scenario) {
  if (!scenarios.some(item => item.id === scenario)) throw new Error('Unknown demo scenario');
  if (scenario === 'insufficient') return fixtures.filter(record => ['DEMO-03', 'DEMO-04'].includes(record.id));
  if (scenario === 'off') return fixtures.filter(record => record.id === 'DEMO-03');
  if (scenario === 'later') return [later];
  if (scenario === 'empty') return [];
  return fixtures;
}

export function loadRecords(scenario = 'overview') {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(`${storageKey}.${scenario}`) ?? '{}'); } catch { /* Demo can work without browser storage. */ }
  return structuredClone(fixtureSet(scenario)).map(record => {
    const prior = saved?.[record.id];
    if (prior && ['steady', 'drifting', 'might_need_call'].includes(prior.status)
      && /^\d{4}-\d{2}-\d{2}$/.test(prior.localDate) && prior.localDate <= asOf) record.lastClassified = prior;
    return record;
  });
}
export function saveClassifications(results, scenario = 'overview') {
  const data = Object.fromEntries(results.filter(result => result.nextLastClassified)
    .map(result => [result.id, result.nextLastClassified]));
  try { localStorage.setItem(`${storageKey}.${scenario}`, JSON.stringify(data)); } catch { /* No persistence claim if storage is unavailable. */ }
}
export function resetDemo(scenario = 'overview') {
  try { localStorage.removeItem(`${storageKey}.${scenario}`); } catch { /* Fixtures still reload in memory. */ }
  return structuredClone(fixtureSet(scenario));
}
