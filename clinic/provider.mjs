/** Narrow browser/BFF contract. No credential, personal text or patient names are retained. */
const levels = new Set(['easy', 'medium', 'hard', 'stopped', 'no_response', 'off']);
const historicalStatuses = new Set(['might_need_call', 'drifting', 'steady']);
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw Error('Invalid clinic data');
  return value;
}
function timestamp(value) {
  if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 8.64e15)) throw Error('Invalid clinic data');
  return value;
}
export function parseClinicPayload(payload) {
  if (!payload || payload.demo !== true || !Array.isArray(payload.patients)) throw Error('Invalid clinic data');
  const seen = new Set();
  const patients = payload.patients.map(record => {
    if (!record || typeof record.id !== 'string' || !record.id || seen.has(record.id)
      || typeof record.presenter !== 'boolean' || !Array.isArray(record.mornings)) throw Error('Invalid clinic data');
    seen.add(record.id);
    const dates = new Set();
    const mornings = record.mornings.map(row => {
      if (!row || (row.level !== null && !levels.has(row.level))
        || ![true, false, null].includes(row.stepDone)) throw Error('Invalid clinic data');
      const localDate = date(row.localDate);
      if (dates.has(localDate)) throw Error('Invalid clinic data');
      dates.add(localDate);
      return { localDate, level: row.level, upAt: timestamp(row.upAt), stepDone: row.stepDone };
    });
    let lastClassified = null;
    if (record.lastClassified !== null) {
      if (!record.lastClassified || !historicalStatuses.has(record.lastClassified.status)) throw Error('Invalid clinic data');
      lastClassified = { status: record.lastClassified.status, localDate: date(record.lastClassified.localDate) };
    }
    return { id: record.id, presenter: record.presenter, startedOn: date(record.startedOn), mornings,
      lastClassified, callbackRequestedAt: timestamp(record.callbackRequestedAt) };
  });
  return { demo: true, patients };
}

export function createClinicProvider({ demoEnabled, fetchImpl = globalThis.fetch }) {
  return async signal => {
    if (!demoEnabled) return { demo: false, patients: [] };
    const response = await fetchImpl('/api/clinic/patients', {
      signal, cache: 'no-store', credentials: 'same-origin', headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw Error('Clinic refresh unavailable');
    return parseClinicPayload(await response.json());
  };
}

/** Requests precede all pattern statuses; existing ordering is retained within each group. */
export function prioritizeCallRequests(orderedResults, records) {
  const requested = new Set(records.filter(record => record.callbackRequestedAt !== null).map(record => record.id));
  return [...orderedResults.filter(row => requested.has(row.id)), ...orderedResults.filter(row => !requested.has(row.id))];
}
