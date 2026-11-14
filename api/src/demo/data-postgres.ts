import type { Pool, PoolClient } from 'pg';
import type { Repository } from '../runtime/contracts.ts';

export type DemoDataRepository = Pick<Repository, 'goalsRevision' | 'replaceGoals' | 'saveMorning'>;
const schema = `
CREATE TABLE IF NOT EXISTS aamu_demo_goal_revisions (
  user_id uuid PRIMARY KEY REFERENCES aamu_users(id), revision bigint NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS aamu_demo_goals (
  user_id uuid NOT NULL REFERENCES aamu_users(id), id text NOT NULL,
  goal_text text NOT NULL, steps jsonb NOT NULL, PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS aamu_demo_mornings (
  user_id uuid NOT NULL REFERENCES aamu_users(id), local_date date NOT NULL,
  goal_id text, step_text text, data jsonb NOT NULL, PRIMARY KEY (user_id, local_date)
);`;

/** Same revision/redaction contract as real storage, with isolated demo tables. */
export function createDemoDataRepository(pool: Pool): DemoDataRepository & { migrate(): Promise<void> } {
  async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  }
  async function lockRevision(client: PoolClient, userId: string) {
    await client.query('INSERT INTO aamu_demo_goal_revisions (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
    const result = await client.query<{ revision: string }>('SELECT revision FROM aamu_demo_goal_revisions WHERE user_id = $1 FOR UPDATE', [userId]);
    if (!result.rows[0]) throw Error('Unknown user');
    return Number(result.rows[0].revision);
  }
  return {
    async migrate() { await pool.query(schema); },
    async goalsRevision(userId) {
      const result = await pool.query<{ revision: string }>('SELECT revision FROM aamu_demo_goal_revisions WHERE user_id = $1', [userId]);
      return Number(result.rows[0]?.revision ?? 0);
    },
    async replaceGoals(userId, { goals, revision, baseRevision }) {
      return transaction(async client => {
        const current = await lockRevision(client, userId);
        if (baseRevision !== current || revision <= current) return { applied: false, revision: current };
        const ids = goals.map(goal => goal.id);
        await client.query('UPDATE aamu_demo_mornings SET step_text = NULL WHERE user_id = $1 AND NOT (goal_id = ANY($2::text[]))', [userId, ids]);
        await client.query('DELETE FROM aamu_demo_goals WHERE user_id = $1 AND NOT (id = ANY($2::text[]))', [userId, ids]);
        for (const goal of goals) await client.query(`INSERT INTO aamu_demo_goals (user_id, id, goal_text, steps) VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, id) DO UPDATE SET goal_text = EXCLUDED.goal_text, steps = EXCLUDED.steps`, [userId, goal.id, goal.goalText, JSON.stringify(goal.steps)]);
        await client.query('UPDATE aamu_demo_goal_revisions SET revision = $2 WHERE user_id = $1', [userId, revision]);
        return { applied: true, revision };
      });
    },
    async saveMorning(userId, localDate, morning) {
      return transaction(async client => {
        const revision = await lockRevision(client, userId);
        const { goalId, stepText, goalSnapshotRevision, ...data } = morning;
        const currentText = goalSnapshotRevision === revision ? stepText : null;
        await client.query(`INSERT INTO aamu_demo_mornings (user_id, local_date, goal_id, step_text, data)
          VALUES ($1, $2, $3, CASE WHEN EXISTS (SELECT 1 FROM aamu_demo_goals WHERE user_id = $1 AND id = $3) THEN $4 ELSE NULL END, $5)
          ON CONFLICT (user_id, local_date) DO UPDATE SET goal_id = EXCLUDED.goal_id, step_text = EXCLUDED.step_text, data = EXCLUDED.data`,
        [userId, localDate, goalId, currentText, JSON.stringify(data)]);
        return revision;
      });
    },
  };
}
