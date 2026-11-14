import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import type { FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import { z } from 'zod';
import { registerGoalRoutes } from '../goals/routes.ts';
import type { DemoDataRepository } from '../demo/data-postgres.ts';
import type { ClinicRepository } from './clinic-contracts.ts';
import type { GoalService } from '../goals/service.ts';
import { hasAnyIntentPhrase } from '../../../shared/safety/checker.mjs';
import { dateSchema, goalSnapshotSchema, morningSchema, wakeSchema, type LiveStore, type Repository } from './contracts.ts';

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => codeAlphabet[randomInt(codeAlphabet.length)]).join('');
const matchSchema = z.object({ mode: z.literal('code'), code: z.string().trim().toUpperCase().regex(/^[A-Z2-9]{6}$/).optional() }).strict();

export async function createRuntimeApp(options: { service: GoalService; repository: Repository; live: LiveStore; pairCodeTtlSeconds: number | null;
  demo?: { enabled: boolean; dashboardToken: string; repository: ClinicRepository; dataRepository?: DemoDataRepository; now?: () => number } }) {
  const { repository, live } = options;
  const app = Fastify({ logger: false, bodyLimit: 8192 });
  const identities = new WeakMap<FastifyRequest, string>();
  app.setErrorHandler((_error, _request, reply) => reply.code(503).send({ error: 'service_unavailable' }));
  app.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });
  if (options.demo?.enabled) {
    // Demo mode only: let the Expo web preview on this computer call the API from
    // a browser. Requests still need the bearer token; no cookies are involved.
    const localPreview = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    app.addHook('onRequest', async (request, reply) => {
      const origin = request.headers.origin;
      if (typeof origin !== 'string' || !localPreview.test(origin)) return;
      reply.header('Access-Control-Allow-Origin', origin).header('Vary', 'Origin')
        .header('Access-Control-Allow-Headers', 'authorization, content-type')
        .header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      if (request.method === 'OPTIONS') return reply.code(204).send();
    });
  }
  async function authorize(request: FastifyRequest): Promise<boolean> {
    if (identities.has(request)) return true;
    const header = request.headers.authorization;
    const match = typeof header === 'string' && /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header);
    if (!match) return false;
    const userId = await repository.userForTokenHash(tokenHash(match[1]));
    if (!userId) return false;
    identities.set(request, userId); return true;
  }
  if (options.demo?.enabled) {
    const { registerDemoClinicRoutes } = await import('../demo/clinic-routes.ts');
    registerDemoClinicRoutes(app, { ...options.demo, authorize: async request => await authorize(request) ? identities.get(request)! : null });
  }
  await app.register(websocket, { options: { maxPayload: 1024, perMessageDeflate: false } });
  registerGoalRoutes(app, { service: options.service, authorize });
  app.get('/health', async (_request, reply) => {
    try { await Promise.all([repository.health(), live.health()]); return { ok: true }; }
    catch { return reply.code(503).send({ error: 'service_unavailable' }); }
  });
  app.post('/users', async (request, reply) => {
    if (!z.object({}).strict().safeParse(request.body).success) return reply.code(400).send({ error: 'invalid_request' });
    const token = randomBytes(32).toString('base64url'); const userId = randomUUID();
    await repository.createUser(userId, tokenHash(token));
    return reply.code(201).send({ userId, token });
  });
  function dataRepository(request: FastifyRequest) {
    const demoHeader = request.headers['x-aamu-demo'];
    if (demoHeader === undefined) return repository;
    if (demoHeader !== 'true' || !options.demo?.enabled) return null;
    return options.demo.dataRepository ?? null;
  }
  app.get('/goals/revision', async (request, reply) => {
    if (!await authorize(request)) return reply.code(401).send({ error: 'unauthorized' });
    const data = dataRepository(request);
    if (!data) return reply.code(403).send({ error: 'demo_data_unavailable' });
    return { revision: await data.goalsRevision(identities.get(request)!), ...(request.headers['x-aamu-demo'] === 'true' ? { demo: true } : {}) };
  });
  app.put('/goals', async (request, reply) => {
    if (!await authorize(request)) return reply.code(401).send({ error: 'unauthorized' });
    const data = dataRepository(request);
    if (!data) return reply.code(403).send({ error: 'demo_data_unavailable' });
    const parsed = goalSnapshotSchema.safeParse(request.body);
    if (!parsed.success || parsed.data.goals.some(goal => [goal.goalText, ...Object.values(goal.steps)].some(hasAnyIntentPhrase))) {
      return reply.code(400).send({ error: 'invalid_request' });
    }
    const result = await data.replaceGoals(identities.get(request)!, parsed.data);
    if (!result.applied) return reply.code(409).send({ error: 'stale_revision', revision: result.revision });
    return { ok: true, revision: result.revision, ...(request.headers['x-aamu-demo'] === 'true' ? { demo: true } : {}) };
  });
  app.put('/mornings/:localDate', async (request, reply) => {
    if (!await authorize(request)) return reply.code(401).send({ error: 'unauthorized' });
    const data = dataRepository(request);
    if (!data) return reply.code(403).send({ error: 'demo_data_unavailable' });
    const params = z.object({ localDate: dateSchema }).safeParse(request.params);
    const parsed = morningSchema.safeParse(request.body);
    if (!params.success || !parsed.success || (parsed.data.stepText !== null && hasAnyIntentPhrase(parsed.data.stepText))) {
      return reply.code(400).send({ error: 'invalid_request' });
    }
    const goalSnapshotRevision = await data.saveMorning(identities.get(request)!, params.data.localDate, parsed.data);
    return { ok: true, ...(parsed.data.stepText !== null ? { goalSnapshotRevision } : {}),
      ...(request.headers['x-aamu-demo'] === 'true' ? { demo: true } : {}) };
  });
  app.post('/partner/match', async (request, reply) => {
    if (!await authorize(request)) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = matchSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' });
    const userId = identities.get(request)!;
    const existing = await repository.partnerFor(userId);
    if (!parsed.data.code) {
      if (existing) return { paired: true };
      if (options.pairCodeTtlSeconds === null) return reply.code(503).send({ error: 'pairing_not_configured' });
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = newCode();
        if (await live.createCode(code, userId, options.pairCodeTtlSeconds)) return { code, paired: false };
      }
      return reply.code(503).send({ error: 'service_unavailable' });
    }
    const owner = await live.codeOwner(parsed.data.code);
    if (!owner || owner === userId) return reply.code(400).send({ error: 'invalid_code' });
    if (await repository.pair(userId, owner) === 'conflict') return reply.code(409).send({ error: 'pairing_conflict' });
    // SQL locks prevent different partners claiming the owner. The atomic
    // compare-and-delete additionally permits only one successful redemption,
    // including simultaneous requests from the same joining identity.
    if (!await live.consumeCode(parsed.data.code, owner)) return reply.code(400).send({ error: 'invalid_code' });
    return { paired: true };
  });
  app.get('/partner', async (request, reply) => {
    if (!await authorize(request)) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = z.object({ localDate: dateSchema }).strict().safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' });
    const partner = await repository.partnerFor(identities.get(request)!);
    return { paired: partner !== null, partnerUpToday: partner ? await repository.isUp(partner, parsed.data.localDate) : false,
      partnerQuietDays: null }; // Quiet-run reset/pause and cross-timezone rules remain unselected.
  });
  app.post('/partner/up', async (request, reply) => {
    if (!await authorize(request)) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = wakeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' });
    const userId = identities.get(request)!;
    const first = await repository.recordUp(userId, parsed.data);
    if (first) {
      const partner = await repository.partnerFor(userId);
      if (partner) await live.publish(partner, { type: 'partner_up', localDate: parsed.data.localDate });
    }
    return { ok: true };
  });
  app.get('/live', {
    websocket: true,
    preValidation: async (request, reply) => { if (!await authorize(request)) return reply.code(401).send({ error: 'unauthorized' }); },
  }, (socket, request) => {
    const userId = identities.get(request)!;
    const stop = live.onEvent((recipient, event) => {
      if (recipient === userId && socket.readyState === 1) socket.send(JSON.stringify(event));
    });
    socket.on('close', stop); socket.on('error', stop);
    // This socket is a receive-only wake feed: no audio/text message ingress.
    socket.on('message', () => socket.close(1008, 'Receive-only connection'));
  });
  return app;
}
