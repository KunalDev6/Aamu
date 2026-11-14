import { readFile } from 'node:fs/promises';

export class ConfigurationError extends Error {
  readonly fields: string[];
  constructor(fields: string[]) { super(`Configure ${fields.join(', ')} before starting the API.`); this.fields = fields; }
}
export async function readRuntimeConfig(env: Record<string, string | undefined>) {
  const missing = ['DATABASE_URL', 'VALKEY_URL'].filter(field => !env[field]?.trim());
  if (missing.length) throw new ConfigurationError(missing);
  let database: URL; let valkey: URL;
  try { database = new URL(env.DATABASE_URL!); valkey = new URL(env.VALKEY_URL!); }
  catch { throw new ConfigurationError(['DATABASE_URL', 'VALKEY_URL']); }
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new ConfigurationError(['DATABASE_URL']);
  if (valkey.protocol !== 'rediss:') throw new ConfigurationError(['VALKEY_URL (rediss TLS URI)']);
  // Explicit TLS settings must not be replaced by sslmode parameters in the URI.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) database.searchParams.delete(key);
  async function ca(field: string): Promise<string | undefined> {
    if (!env[field]?.trim()) return undefined;
    try { return await readFile(env[field]!, 'utf8'); }
    catch { throw new ConfigurationError([field]); }
  }
  const port = env.PORT ? Number(env.PORT) : 3000;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ConfigurationError(['PORT']);
  const pairCodeTtlSeconds = env.PAIR_CODE_TTL_SECONDS?.trim() ? Number(env.PAIR_CODE_TTL_SECONDS) : null;
  if (pairCodeTtlSeconds !== null && (!Number.isSafeInteger(pairCodeTtlSeconds) || pairCodeTtlSeconds < 0)) throw new ConfigurationError(['PAIR_CODE_TTL_SECONDS']);
  const demoSetting = env.DEMO_MODE?.trim() || 'true';
  if (!['true', 'false'].includes(demoSetting)) throw new ConfigurationError(['DEMO_MODE (true or false)']);
  const demoMode = demoSetting === 'true';
  const demoDashboardToken = env.DEMO_DASHBOARD_TOKEN?.trim();
  if (demoMode && (!demoDashboardToken || !/^[A-Za-z0-9_-]{32,256}$/.test(demoDashboardToken))) {
    throw new ConfigurationError(['DEMO_DASHBOARD_TOKEN']);
  }
  return { databaseUrl: database.toString(), valkeyUrl: valkey.toString(),
    databaseCa: await ca('DATABASE_CA_PATH'), valkeyCa: await ca('VALKEY_CA_PATH'),
    demoMode, demoDashboardToken, host: env.HOST?.trim() || '127.0.0.1', port, pairCodeTtlSeconds };
}
