import type { FastifyInstance } from 'fastify';
import { rutasAuth } from '../modules/auth/auth.routes';
import { rutasCaja } from '../modules/caja/caja.routes';
import { rutasColaborador } from '../modules/colaborador/colaborador.routes';
import { rutasServicio } from '../modules/servicio/servicio.routes';
import { rutasTarifa } from '../modules/tarifa/tarifa.routes';

export const registrarRutas = async (
  app: FastifyInstance,
): Promise<void> => {
  await app.register(rutasAuth);
  await app.register(rutasCaja);
  await app.register(rutasColaborador);
  await app.register(rutasTarifa);
  await app.register(rutasServicio);
};
