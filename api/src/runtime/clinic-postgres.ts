import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { z } from 'zod';
import { dateSchema } from './contracts.ts';
import type { ClinicPatient, ClinicRepository } from './clinic-contracts.ts';

const schema = `CREATE TABLE IF NOT EXISTS aamu_demo_clinic_memberships (
  user_id uuid PRIMARY KEY REFERENCES aamu_users(id),
  connected_at timestamptz NOT NULL DEFAULT now(),
  callback_requested_at bigint
);`;
const projectionSchema = z.array(z.object({ localDate: dateSchema,
  level: z.enum(['easy', 'medium', 'hard', 'stopped', 'no_response', 'off']).nullable(),
  upAt: z.number().finite().nonnegative().nullable(), stepDone: z.boolean().nullable(),
}).strict());

/** The membership join enforces consent at every read, including after restart. */
export function createPostgresClinicRepository(pool: Pool): ClinicRepository & { migrate(): Promise<void> } {
  return {
    async migrate() { await pool.query(schema); },
    async setSharing(userId, enabled) {
      if (enabled) await pool.query(`INSERT INTO aamu_demo_clinic_memberships (user_id) VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING`, [userId]);
      else await pool.query('DELETE FROM aamu_demo_clinic_memberships WHERE user_id = $1', [userId]);
    },
    async requestCallback(userId, now) {
      const result = await pool.query<{ callback_requested_at: string }>(`UPDATE aamu_demo_clinic_memberships
        SET callback_requested_at = COALESCE(callback_requested_at, $2)
        WHERE user_id = $1 RETURNING callback_requested_at`, [userId, Math.trunc(now)]);
      return result.rows[0] ? Number(result.rows[0].callback_requested_at) : null;
    },
    async patients(): Promise<ClinicPatient[]> {
      const result = await pool.query<{ user_id: string; started_on: string; callback_requested_at: string | null; mornings: unknown }>(`
        SELECT c.user_id,
          to_char(LEAST(u.created_at::date, COALESCE(MIN(m.local_date), u.created_at::date)), 'YYYY-MM-DD') AS started_on,
          c.callback_requested_at,
          COALESCE(jsonb_agg(jsonb_build_object(
            'localDate', to_char(m.local_date, 'YYYY-MM-DD'),
            'level', m.data->'level', 'stepDone', m.data->'stepDone', 'upAt', m.data->'upAt'
          ) ORDER BY m.local_date) FILTER (WHERE m.local_date IS NOT NULL), '[]'::jsonb) AS mornings
        FROM aamu_demo_clinic_memberships c JOIN aamu_users u ON u.id = c.user_id
        LEFT JOIN aamu_demo_mornings m ON m.user_id = c.user_id
        GROUP BY c.user_id, c.callback_requested_at, u.created_at
        ORDER BY u.created_at, c.user_id`);
      return result.rows.map(row => ({
        // This dashboard ID is opaque and distinct from the API identity/token.
        id: `P-${createHash('sha256').update(row.user_id).digest('hex').slice(0, 16)}`,
        presenter: true, startedOn: dateSchema.parse(row.started_on),
        mornings: projectionSchema.parse(row.mornings), lastClassified: null,
        callbackRequestedAt: row.callback_requested_at === null ? null : Number(row.callback_requested_at),
      }));
    },
  };
}
