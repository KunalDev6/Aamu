// Local-only planning. No goal text, audio, network, clock reads or native APIs.
export const eveningReminder = Object.freeze({ hour: 18, minute: 0, prefix: 'aamu_evening_',
  category: 'aamu_evening', yes: 'aamu_evening_yes', notToday: 'aamu_evening_not_today' });
export type EveningMorning = {
  localDate: string; utcOffsetMinutes: number; stepOffered: boolean;
  stepOfferedAt?: number; stepRemoved: boolean; stepDone: boolean | null;
};
export type EveningReminderData = { kind: 'aamu_evening'; version: 1; localDate: string; offeredAt: number };
export type EveningPlan = { identifier: string; dueAt: number; expiresAt: number; data: EveningReminderData };

function offerPlan(morning: EveningMorning): EveningPlan | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(morning.localDate) || !Number.isFinite(morning.utcOffsetMinutes)
    || Math.abs(morning.utcOffsetMinutes) > 14 * 60 || !morning.stepOffered || morning.stepRemoved
    || !Number.isFinite(morning.stepOfferedAt)) return null;
  const midnightUtc = Date.parse(`${morning.localDate}T00:00:00Z`);
  if (!Number.isFinite(midnightUtc) || new Date(midnightUtc).toISOString().slice(0, 10) !== morning.localDate) return null;
  const dayStart = midnightUtc - morning.utcOffsetMinutes * 60_000;
  const dueAt = dayStart + (eveningReminder.hour * 60 + eveningReminder.minute) * 60_000;
  const offeredAt = morning.stepOfferedAt!;
  // Never infer first-offer time from upAt or from a later app launch.
  if (offeredAt < dayStart || offeredAt >= dueAt) return null;
  return { identifier: `${eveningReminder.prefix}${morning.localDate}`, dueAt, expiresAt: dayStart + 86_400_000,
    data: { kind: 'aamu_evening', version: 1, localDate: morning.localDate, offeredAt } };
}

export function planEveningReminder(morning: EveningMorning, now: number): EveningPlan | null {
  const plan = offerPlan(morning);
  if (!plan || !Number.isFinite(now) || morning.stepDone === true || now < plan.data.offeredAt || now >= plan.dueAt) return null;
  return plan;
}

export function parseEveningData(value: unknown): EveningReminderData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.kind !== 'aamu_evening' || data.version !== 1 || typeof data.localDate !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(data.localDate) || typeof data.offeredAt !== 'number'
    || !Number.isFinite(data.offeredAt)) return null;
  return { kind: 'aamu_evening', version: 1, localDate: data.localDate, offeredAt: data.offeredAt };
}

/** Eligibility for an already-delivered notice, including the recorded-day
 * midnight rule. A stale/answered notice cannot change a different offer. */
export function canAnswerEveningReminder(morning: EveningMorning | undefined, data: EveningReminderData, now: number): boolean {
  if (!morning || morning.stepDone !== null || !Number.isFinite(now)) return false;
  const plan = offerPlan(morning);
  return !!plan && data.localDate === morning.localDate && data.offeredAt === morning.stepOfferedAt
    && now >= plan.dueAt && now < plan.expiresAt;
}

export type ExistingReminder = { identifier: string; data: unknown };
export function reconcileEveningQueue(mornings: readonly EveningMorning[], pending: readonly ExistingReminder[],
  presented: readonly ExistingReminder[], now: number) {
  const plans = mornings.flatMap(morning => { const plan = planEveningReminder(morning, now); return plan ? [plan] : []; });
  const cancel = pending.filter(item => {
    if (!item.identifier.startsWith(eveningReminder.prefix)) return false;
    const data = parseEveningData(item.data);
    if (!data || item.identifier !== `${eveningReminder.prefix}${data.localDate}`) return true;
    const morning = mornings.find(row => row.localDate === data.localDate);
    // Do not cancel a due notification while the OS is in the act of delivering it.
    return !plans.some(plan => plan.identifier === item.identifier && plan.data.offeredAt === data.offeredAt)
      && !canAnswerEveningReminder(morning, data, now);
  }).map(item => item.identifier);
  const schedule = plans.filter(plan => !pending.some(item => item.identifier === plan.identifier
    && parseEveningData(item.data)?.offeredAt === plan.data.offeredAt));
  const dismiss = presented.filter(item => {
    if (!item.identifier.startsWith(eveningReminder.prefix)) return false;
    const data = parseEveningData(item.data);
    return !data || !canAnswerEveningReminder(mornings.find(row => row.localDate === data.localDate), data, now);
  }).map(item => item.identifier);
  return { cancel, schedule, dismiss };
}
