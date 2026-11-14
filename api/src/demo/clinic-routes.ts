import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { classifyClinic } from '../../../shared/clinic/engine.ts';
import type { ClinicPatient, ClinicRepository } from '../runtime/clinic-contracts.ts';
import { demoClinicPatients } from './clinic-fixtures.ts';

const sharing = z.object({ enabled: z.boolean(), code: z.string().trim().max(40).optional() }).strict();
const empty = z.object({}).strict();
const digest = (value: string) => createHash('sha256').update(value).digest();

function withHistory(patient: ClinicPatient, today: string): ClinicPatient {
  let lastClassified = patient.lastClassified;
  for (const date of patient.mornings.map(row => row.localDate).filter(date => date < today && date >= patient.startedOn).sort()) {
    lastClassified = classifyClinic({ ...patient, lastClassified }, date).nextLastClassified;
  }
  return { id: patient.id, presenter: true, startedOn: patient.startedOn,
    mornings: patient.mornings.map(({ localDate, level, upAt, stepDone }) => ({ localDate, level, upAt, stepDone })),
    callbackRequestedAt: patient.callbackRequestedAt, lastClassified };
}

export function registerDemoClinicRoutes(app: FastifyInstance, options: {
  repository: ClinicRepository; dashboardToken: string; now?: () => number;
  authorize(request: FastifyRequest): Promise<string | null>;
}) {
  const now = options.now ?? Date.now;
  app.put('/clinic/sharing', async (request, reply) => {
    const userId = await options.authorize(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = sharing.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' });
    if (parsed.data.enabled && parsed.data.code?.toUpperCase() !== 'AAMU-DEMO') return reply.code(400).send({ error: 'invalid_code' });
    await options.repository.setSharing(userId, parsed.data.enabled);
    return { demo: true, enabled: parsed.data.enabled };
  });
  app.post('/clinic/callback', async (request, reply) => {
    const userId = await options.authorize(request);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!empty.safeParse(request.body).success) return reply.code(400).send({ error: 'invalid_request' });
    const callbackRequestedAt = await options.repository.requestCallback(userId, now());
    if (callbackRequestedAt === null) return reply.code(409).send({ error: 'clinic_not_connected' });
    return { demo: true, callbackRequestedAt };
  });
  app.get('/clinic/patients', async (request, reply) => {
    const header = request.headers['x-demo-dashboard-token'];
    const supplied = typeof header === 'string' ? header : /^Bearer (\S+)$/.exec(request.headers.authorization ?? '')?.[1];
    if (!supplied || supplied.length > 256 || !timingSafeEqual(digest(supplied), digest(options.dashboardToken))) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    const today = new Date(now()).toISOString().slice(0, 10);
    const presenters = (await options.repository.patients()).map(patient => withHistory(patient, today));
    return { demo: true, patients: [...demoClinicPatients(today), ...presenters] };
  });
}
