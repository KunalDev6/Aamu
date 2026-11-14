import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { createConfiguredGoalService } from './goals/configured.ts';
import { ConfigurationError, readRuntimeConfig } from './runtime/config.ts';
import { createPostgresRepository } from './runtime/postgres.ts';
import { createDemoDataRepository } from './demo/data-postgres.ts';
import { createPostgresClinicRepository } from './runtime/clinic-postgres.ts';
import { createValkeyStore } from './runtime/valkey.ts';
import { createRuntimeApp } from './runtime/app.ts';

export async function startServer(env: Record<string, string | undefined> = process.env) {
  const config = await readRuntimeConfig(env);
  const service = createConfiguredGoalService({ ...env, DEMO_MODE: String(config.demoMode) });
  const pool = new Pool({ connectionString: config.databaseUrl, max: 5, connectionTimeoutMillis: 5_000,
    ssl: { rejectUnauthorized: true, ...(config.databaseCa ? { ca: config.databaseCa } : {}) } });
  pool.on('error', () => {}); // Never print a driver error containing connection credentials.
  const repository = createPostgresRepository(pool);
  const demoData = config.demoMode ? createDemoDataRepository(pool) : null;
  const clinic = config.demoMode ? createPostgresClinicRepository(pool) : null;
  const redisOptions = { lazyConnect: true, enableOfflineQueue: false, connectTimeout: 5_000,
    // Fail each request promptly while reconnecting after a temporary outage.
    // A short network loss must not leave pairing permanently disconnected.
    maxRetriesPerRequest: 1, retryStrategy: (attempt: number) => Math.min(attempt * 250, 5_000),
    tls: { rejectUnauthorized: true, ...(config.valkeyCa ? { ca: config.valkeyCa } : {}) } };
  const client = new Redis(config.valkeyUrl, redisOptions);
  const subscriber = new Redis(config.valkeyUrl, redisOptions);
  client.on('error', () => {}); subscriber.on('error', () => {});
  const live = createValkeyStore(client, subscriber);
  try {
    await repository.health(); await live.start(); await repository.migrate();
    if (demoData) await demoData.migrate();
    if (clinic) await clinic.migrate();
    const app = await createRuntimeApp({ service, repository, live, pairCodeTtlSeconds: config.pairCodeTtlSeconds,
      ...(clinic ? { demo: { enabled: true, dashboardToken: config.demoDashboardToken!, repository: clinic, dataRepository: demoData! } } : {}) });
    app.addHook('onClose', async () => { await live.close(); await repository.close(); });
    await app.listen({ port: config.port, host: config.host });
    return app;
  } catch (error) {
    await live.close(); await repository.close(); throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const app = await startServer();
    process.stdout.write('Aamu API is listening.\n');
    const close = () => { void app.close().then(() => { process.exitCode = 0; }); };
    process.once('SIGINT', close); process.once('SIGTERM', close);
  } catch (error) {
    process.stderr.write(error instanceof ConfigurationError ? `${error.message}\n` : 'Aamu API could not start. Check private service configuration and connectivity.\n');
    process.exitCode = 1;
  }
}
