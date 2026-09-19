import type { FastifyInstance } from 'fastify';
import { rutasAuth } from '../modules/auth/auth.routes';
import { rutasColaborador } from '../modules/colaborador/colaborador.routes';

export const registrarRutas = async (
  app: FastifyInstance,
): Promise<void> => {
  await app.register(rutasAuth);
  await app.register(rutasColaborador);
};
