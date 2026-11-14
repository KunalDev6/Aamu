import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { stepsSchema } from './contracts.ts';
import type { GoalService } from './service.ts';

const goalText = z.string().min(1).refine(value => value.trim().length > 0);
const shrinkBody = z.object({ goalText }).strict();
const hintsBody = z.object({ goalText, steps: stepsSchema }).strict();
export function registerGoalRoutes(app: FastifyInstance, options: {
  service: GoalService;
  // Auth integration must be supplied; no default-open server/listener is created here.
  authorize: (request: FastifyRequest) => boolean | Promise<boolean>;
}) {
  for (const mode of ['shrink', 'hints'] as const) {
    app.post(`/goals/${mode}`, { bodyLimit: 8192 }, async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      if (!await options.authorize(request)) return reply.code(401).send({ error: 'unauthorized' });
      const parsed = (mode === 'shrink' ? shrinkBody : hintsBody).safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' });
      const cancellation = new AbortController();
      const onClose = () => { if (!reply.raw.writableEnded) cancellation.abort(); };
      reply.raw.on('close', onClose);
      try {
        return mode === 'shrink'
          ? await options.service.shrink(parsed.data.goalText, cancellation.signal)
          : await options.service.hints(parsed.data.goalText, hintsBody.parse(parsed.data).steps, cancellation.signal);
      } finally { reply.raw.off('close', onClose); }
    });
  }
}
