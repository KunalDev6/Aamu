import Fastify from 'fastify';
import type { FastifyRequest } from 'fastify';
import { registerGoalRoutes } from './goals/routes.ts';
import type { GoalService } from './goals/service.ts';

// In-process server factory. No listening socket, tunnel or permissive authentication.
export function createApp(service: GoalService, authorize: (request: FastifyRequest) => boolean | Promise<boolean>) {
  const app = Fastify({ logger: false, bodyLimit: 8192 });
  app.setErrorHandler((_error, _request, reply) => reply.code(400).send({ error: 'invalid_request' }));
  registerGoalRoutes(app, { service, authorize });
  return app;
}
