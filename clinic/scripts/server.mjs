import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseClinicPayload } from '../provider.mjs';

const upstream = 'http://127.0.0.1:3000/clinic/patients';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };
export function createClinicServer({ root, demoEnabled, dashboardToken, fetchImpl = globalThis.fetch }) {
  const directory = path.resolve(root);
  return http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const json = (status, payload) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(payload)); };
    try {
      const host = request.headers.host;
      const allowed = [`localhost:${request.socket.localPort}`, `127.0.0.1:${request.socket.localPort}`];
      if (!allowed.includes(host) || request.headers['sec-fetch-site'] === 'cross-site'
        || (request.headers.origin && request.headers.origin !== `http://${host}`)) { response.writeHead(403).end(); return; }
      const url = new URL(request.url, `http://${host}`);
      if (url.pathname === '/api/clinic/patients') {
        if (!demoEnabled) { response.writeHead(404).end(); return; }
        if (request.method !== 'GET') { response.writeHead(405).end(); return; }
        if (!dashboardToken) { json(503, { error: 'Clinic connection is unavailable.' }); return; }
        try {
          const result = await fetchImpl(upstream, { method: 'GET', redirect: 'error',
            signal: AbortSignal.timeout(5_000), headers: { Accept: 'application/json', 'x-demo-dashboard-token': dashboardToken } });
          if (!result.ok) throw Error('Upstream unavailable');
          json(200, parseClinicPayload(await result.json()));
        } catch { json(503, { error: 'Clinic refresh is unavailable. Try again.' }); }
        return;
      }
      if (url.pathname.startsWith('/api/')) { response.writeHead(404).end(); return; }
      if (url.pathname === '/config.js') {
        response.writeHead(200, { 'Content-Type': types['.js'] });
        response.end(request.method === 'HEAD' ? undefined : `export const demoEnabled = ${demoEnabled};\n`); return;
      }
      const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const target = path.resolve(directory, `.${pathname}`);
      if (!target.startsWith(`${directory}${path.sep}`) || !(await stat(target)).isFile()) { response.writeHead(404).end(); return; }
      const body = await readFile(target);
      response.writeHead(200, { 'Content-Type': types[path.extname(target)] ?? 'application/octet-stream' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch { response.writeHead(404).end(); }
  });
}
