import type { FastifyInstance } from 'fastify';
import { rutasAuth } from '../modules/auth/auth.routes';
import { rutasAuditoria } from '../modules/auditoria/auditoria.routes';
import { rutasCaja } from '../modules/caja/caja.routes';
import { rutasColaborador } from '../modules/colaborador/colaborador.routes';
import { rutasServicio } from '../modules/servicio/servicio.routes';
import { rutasTarifa } from '../modules/tarifa/tarifa.routes';
import { rutasInformes } from '../modules/informes/informes.routes';

export const registrarRutas = async (
  app: FastifyInstance,
): Promise<void> => {
  await app.register(rutasAuth);
  await app.register(rutasAuditoria);
  await app.register(rutasCaja);
  await app.register(rutasColaborador);
  await app.register(rutasTarifa);
  await app.register(rutasServicio);
  await app.register(rutasInformes);
};
