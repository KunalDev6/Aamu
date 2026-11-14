import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClinicServer } from './server.mjs';
import { clinicDemoMode } from './mode.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
// Private server configuration only. Never read, print or copy these values into dist/.
try { process.loadEnvFile(fileURLToPath(new URL('../../api/.env', import.meta.url))); }
catch (error) { if (error?.code !== 'ENOENT') throw Error('Clinic server configuration could not be loaded'); }
const port = process.env.CLINIC_PORT ? Number(process.env.CLINIC_PORT) : 4174;
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid CLINIC_PORT');
await stat(path.join(root, 'index.html'));
const builtForDemo = (await readFile(path.join(root, 'config.js'), 'utf8')).includes('demoEnabled = true');
const server = createClinicServer({ root, demoEnabled: builtForDemo && clinicDemoMode(),
  dashboardToken: process.env.DEMO_DASHBOARD_TOKEN });
server.listen(port, '127.0.0.1', () => console.log(`Local clinic preview: http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
