import { shiftClinicDate, type ClinicLevel, type ClinicMorning } from '../../../shared/clinic/engine.ts';
import type { ClinicPatient } from '../runtime/clinic-contracts.ts';

/** Four explicitly fictional records; this module is loaded only in demo mode. */
export function demoClinicPatients(today: string): ClinicPatient[] {
  const date = (offset: number) => shiftClinicDate(today, offset);
  const row = (offset: number, level: ClinicLevel, done: boolean | null = null, confirmed = false): ClinicMorning => ({
    localDate: date(offset), level, stepDone: done, upAt: confirmed ? Date.parse(`${date(offset)}T07:00:00Z`) : null,
  });
  const comparison = () => Array.from({ length: 14 }, (_, i) => row(i - 20, 'medium', i % 3 === 0, true));
  const recent = (levels: ClinicLevel[]) => levels.map((level, i) => row(i - 6, level,
    ['easy', 'medium'].includes(level) ? i % 2 === 0 : null,
    ['easy', 'medium', 'hard'].includes(level) || (level === 'stopped' && i === 3)));
  return [
    { id: 'DEMO-01', presenter: false, startedOn: date(-42), callbackRequestedAt: null,
      lastClassified: { status: 'drifting', localDate: date(-8) },
      mornings: [...comparison(), ...recent(['no_response', 'hard', 'stopped', 'no_response', 'medium', 'no_response', 'easy'])] },
    { id: 'DEMO-02', presenter: false, startedOn: date(-36), callbackRequestedAt: null,
      lastClassified: { status: 'steady', localDate: date(-8) },
      mornings: [...comparison(), ...recent(['easy', 'stopped', 'medium', 'stopped', 'easy', 'stopped', 'medium'])] },
    { id: 'DEMO-03', presenter: false, startedOn: date(-60), callbackRequestedAt: null,
      lastClassified: { status: 'drifting', localDate: date(-22) },
      mornings: [row(-22, 'medium', true, true), ...Array.from({ length: 21 }, (_, i) => row(i - 20, 'off'))] },
    { id: 'DEMO-04', presenter: false, startedOn: date(-32), callbackRequestedAt: null,
      lastClassified: { status: 'steady', localDate: date(-8) },
      mornings: [...comparison(), ...recent(['easy', 'easy', 'medium', 'easy', 'medium', 'easy', 'easy'])] },
  ];
}
