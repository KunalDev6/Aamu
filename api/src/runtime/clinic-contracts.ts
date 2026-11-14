import type { ClinicRecord } from '../../../shared/clinic/engine.ts';

/** Explicit numeric/category projection only; never a goal, recording or contact. */
export type ClinicPatient = ClinicRecord & { presenter: boolean; callbackRequestedAt: number | null };
export interface ClinicRepository {
  setSharing(userId: string, enabled: boolean): Promise<void>;
  requestCallback(userId: string, now: number): Promise<number | null>;
  patients(): Promise<ClinicPatient[]>;
}
