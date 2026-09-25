import type { FastifyInstance } from 'fastify';
import { autenticar, autorizarRoles, rolesAdministrativos } from '../auth/auth.middleware';
import { consultarInformes } from './informes.service';

export const rutasInformes = async (app: FastifyInstance): Promise<void> => {
  app.get<{ Querystring: { desde?: string; hasta?: string } }>('/informes', { preHandler: [autenticar, autorizarRoles(...rolesAdministrativos)] }, async (solicitud, respuesta) => {
    const { desde, hasta } = solicitud.query;
    if (!desde || !hasta || Number.isNaN(Date.parse(desde)) || Number.isNaN(Date.parse(hasta)) || new Date(desde) >= new Date(hasta)) return respuesta.status(400).send({ mensaje: 'Rango de fechas inválido' });
    return consultarInformes(desde, hasta);
  });
};
