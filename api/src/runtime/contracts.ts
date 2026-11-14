import { z } from 'zod';
import { stepsSchema } from '../goals/contracts.ts';

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
});
const opaqueId = z.string().min(1).max(128);
const finiteTime = z.number().finite().nonnegative();
export const remoteGoalSchema = z.object({ id: opaqueId, goalText: z.string().min(1).refine(value => Boolean(value.trim())), steps: stepsSchema }).strict();
export const goalSnapshotSchema = z.object({
  goals: z.array(remoteGoalSchema).max(3).refine(goals => new Set(goals.map(goal => goal.id)).size === goals.length),
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  baseRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();
export type RemoteGoal = z.infer<typeof remoteGoalSchema>;
export type GoalSnapshot = z.infer<typeof goalSnapshotSchema>;
export type GoalSnapshotResult = { applied: boolean; revision: number };
export const wakeSchema = z.object({ localDate: dateSchema, upAt: finiteTime, utcOffsetMinutes: z.number().int().min(-840).max(840) }).strict();
export type Wake = z.infer<typeof wakeSchema>;
export const morningSchema = z.object({
  scheduledAt: finiteTime, firstRingAt: finiteTime.nullable(), upAt: finiteTime.nullable(),
  minutesToUp: z.number().finite().nonnegative().nullable(), minutesBeforeAlarm: z.number().int().nonnegative().nullable(),
  snoozeCount: z.number().int().nonnegative(),
  voiceState: z.enum(['spoke', 'silent', 'skipped', 'unavailable', 'failed']).nullable(),
  speechShare: z.number().min(0).max(1).nullable(), speechOnsetMs: finiteTime.nullable(),
  stepSize: z.enum(['tiny', 'small', 'full']).nullable(), stepDone: z.boolean().nullable(),
  stepOffered: z.boolean(), stepRemoved: z.boolean(),
  utcOffsetMinutes: z.number().int().min(-840).max(840).optional(),
  level: z.enum(['easy', 'medium', 'hard', 'stopped', 'no_response', 'off']),
  goalId: opaqueId.nullable(), stepText: z.string().max(60).nullable(),
  goalSnapshotRevision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullish(),
}).strict().refine(value => value.stepText === null ? value.goalSnapshotRevision == null : value.goalSnapshotRevision != null);
export type MorningPayload = z.infer<typeof morningSchema>;
export type PartnerEvent = { type: 'partner_up'; localDate: string };

export interface Repository {
  health(): Promise<void>;
  createUser(userId: string, tokenHash: string): Promise<void>;
  userForTokenHash(tokenHash: string): Promise<string | null>;
  goalsRevision(userId: string): Promise<number>;
  replaceGoals(userId: string, snapshot: GoalSnapshot): Promise<GoalSnapshotResult>;
  saveMorning(userId: string, localDate: string, morning: MorningPayload): Promise<number>;
  partnerFor(userId: string): Promise<string | null>;
  pair(userId: string, otherId: string): Promise<'paired' | 'conflict'>;
  recordUp(userId: string, wake: Wake): Promise<boolean>;
  isUp(userId: string, localDate: string): Promise<boolean>;
}
export interface LiveStore {
  health(): Promise<void>;
  createCode(code: string, ownerId: string, ttlSeconds: number): Promise<boolean>;
  codeOwner(code: string): Promise<string | null>;
  consumeCode(code: string, ownerId: string): Promise<boolean>;
  publish(userId: string, event: PartnerEvent): Promise<void>;
  onEvent(listener: (userId: string, event: PartnerEvent) => void): () => void;
}
