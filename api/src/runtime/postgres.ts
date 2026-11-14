import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import type { GoalSnapshot, MorningPayload, Repository, Wake } from './contracts.ts';

// No support flags, raw check inputs, personal recordings or safe-person details.
const schema = `
CREATE TABLE IF NOT EXISTS aamu_users (
  id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL, goals_revision bigint NOT NULL DEFAULT 0,
  partner_id uuid UNIQUE REFERENCES aamu_users(id), created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (partner_id IS NULL OR partner_id <> id)
);
ALTER TABLE aamu_users ADD COLUMN IF NOT EXISTS goals_revision bigint NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS aamu_goals (
  user_id uuid NOT NULL REFERENCES aamu_users(id), id text NOT NULL,
  goal_text text NOT NULL, steps jsonb NOT NULL, PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS aamu_mornings (
  user_id uuid NOT NULL REFERENCES aamu_users(id), local_date date NOT NULL,
  goal_id text, step_text text, data jsonb NOT NULL, PRIMARY KEY (user_id, local_date)
);
CREATE TABLE IF NOT EXISTS aamu_wakes (
  user_id uuid NOT NULL REFERENCES aamu_users(id), local_date date NOT NULL,
  up_at bigint NOT NULL, utc_offset_minutes integer NOT NULL, PRIMARY KEY (user_id, local_date)
);`;

export function createPostgresRepository(pool: Pool): Repository & { migrate(): Promise<void>; close(): Promise<void> } {
  async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const value = await work(client); await client.query('COMMIT'); return value; }
    catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  }
  return {
    async migrate() { await pool.query(schema); },
    async health() { await pool.query('SELECT 1'); },
    async close() { await pool.end(); },
    async createUser(userId, tokenHash) { await pool.query('INSERT INTO aamu_users (id, token_hash) VALUES ($1, $2)', [userId, tokenHash]); },
    async userForTokenHash(tokenHash) {
      const result = await pool.query<{ id: string }>('SELECT id FROM aamu_users WHERE token_hash = $1', [tokenHash]);
      return result.rows[0]?.id ?? null;
    },
    async goalsRevision(userId) {
      const result = await pool.query<{ goals_revision: string }>('SELECT goals_revision FROM aamu_users WHERE id = $1', [userId]);
      if (!result.rows[0]) throw Error('Unknown user');
      return Number(result.rows[0].goals_revision);
    },
    async replaceGoals(userId: string, { goals, revision, baseRevision }: GoalSnapshot) {
      return transaction(async client => {
        const locked = await client.query<{ goals_revision: string }>('SELECT goals_revision FROM aamu_users WHERE id = $1 FOR UPDATE', [userId]);
        if (!locked.rows[0]) throw Error('Unknown user');
        const current = Number(locked.rows[0].goals_revision);
        // The base check also rejects an old higher-number request from before
        // a token restore. Revision coordination is user-level, never a marker
        // that a particular private goal exists.
        if (baseRevision !== current || revision <= current) return { applied: false, revision: current };
        const ids = goals.map(goal => goal.id);
        // Redact every omitted goal, including opaque IDs without a goal row.
        // Keep historical IDs/sizes/outcomes; no private-existence marker is stored.
        await client.query('UPDATE aamu_mornings SET step_text = NULL WHERE user_id = $1 AND NOT (goal_id = ANY($2::text[]))', [userId, ids]);
        await client.query('DELETE FROM aamu_goals WHERE user_id = $1 AND NOT (id = ANY($2::text[]))', [userId, ids]);
        for (const goal of goals) await client.query(`INSERT INTO aamu_goals (user_id, id, goal_text, steps) VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, id) DO UPDATE SET goal_text = EXCLUDED.goal_text, steps = EXCLUDED.steps`, [userId, goal.id, goal.goalText, JSON.stringify(goal.steps)]);
        await client.query('UPDATE aamu_users SET goals_revision = $2 WHERE id = $1', [userId, revision]);
        return { applied: true, revision };
      });
    },
    async saveMorning(userId: string, localDate: string, morning: MorningPayload) {
      return transaction(async client => {
        const locked = await client.query<{ goals_revision: string }>('SELECT goals_revision FROM aamu_users WHERE id = $1 FOR UPDATE', [userId]);
        if (!locked.rows[0]) throw Error('Unknown user');
        const revision = Number(locked.rows[0].goals_revision);
        const { goalId, stepText, goalSnapshotRevision, ...data } = morning;
        const currentText = goalSnapshotRevision === revision ? stepText : null;
        // A stale phone upload cannot restore a redacted text for an omitted goal.
        await client.query(`INSERT INTO aamu_mornings (user_id, local_date, goal_id, step_text, data)
          VALUES ($1, $2, $3, CASE WHEN EXISTS (SELECT 1 FROM aamu_goals WHERE user_id = $1 AND id = $3) THEN $4 ELSE NULL END, $5)
          ON CONFLICT (user_id, local_date) DO UPDATE SET goal_id = EXCLUDED.goal_id, step_text = EXCLUDED.step_text, data = EXCLUDED.data`,
        [userId, localDate, goalId, currentText, JSON.stringify(data)]);
        return revision;
      });
    },
    async partnerFor(userId) {
      const result = await pool.query<{ partner_id: string | null }>('SELECT partner_id FROM aamu_users WHERE id = $1', [userId]);
      return result.rows[0]?.partner_id ?? null;
    },
    async pair(userId, otherId) {
      if (userId === otherId) return 'conflict';
      return transaction(async client => {
        const result = await client.query<{ id: string; partner_id: string | null }>(
          'SELECT id, partner_id FROM aamu_users WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE', [[userId, otherId]]);
        if (result.rows.length !== 2) return 'conflict';
        if (result.rows.every(row => row.partner_id === (row.id === userId ? otherId : userId))) return 'paired';
        if (result.rows.some(row => row.partner_id !== null)) return 'conflict';
        await client.query('UPDATE aamu_users SET partner_id = CASE WHEN id = $1 THEN $2::uuid ELSE $1::uuid END WHERE id = ANY($3::uuid[])', [userId, otherId, [userId, otherId]]);
        return 'paired';
      });
    },
    async recordUp(userId: string, wake: Wake) {
      const result = await pool.query(`INSERT INTO aamu_wakes (user_id, local_date, up_at, utc_offset_minutes) VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, local_date) DO NOTHING RETURNING user_id`, [userId, wake.localDate, Math.trunc(wake.upAt), wake.utcOffsetMinutes]);
      return result.rowCount === 1;
    },
    async isUp(userId, localDate) {
      const result = await pool.query('SELECT 1 FROM aamu_wakes WHERE user_id = $1 AND local_date = $2', [userId, localDate]);
      return result.rowCount === 1;
    },
  };
}
