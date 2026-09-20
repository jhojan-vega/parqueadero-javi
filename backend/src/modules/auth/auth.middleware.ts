import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RolColaborador } from '../colaborador/colaborador.types';
import { obtenerEstadoSeguridad } from './auth.service';
import type { TokenAutenticacion } from './auth.types';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenAutenticacion;
    user: TokenAutenticacion;
  }
}

export const autenticar = async (
  solicitud: FastifyRequest,
  respuesta: FastifyReply,
): Promise<void> => {
  try {
    await solicitud.jwtVerify();
  } catch {
    await respuesta.status(401).send({ mensaje: 'Token inválido o ausente' });
    return;
  }

  const colaborador = await obtenerEstadoSeguridad(solicitud.user.id_colaborador);

  if (!colaborador || colaborador.estado !== 'activo') {
    await respuesta.status(401).send({ mensaje: 'Usuario no autorizado' });
  }
};

export const autorizarRoles = (...rolesPermitidos: RolColaborador[]) =>
  async (solicitud: FastifyRequest, respuesta: FastifyReply): Promise<void> => {
    const colaborador = await obtenerEstadoSeguridad(solicitud.user.id_colaborador);
    if (!colaborador || colaborador.estado !== 'activo' || colaborador.requiere_cambio_contrasena) {
      await respuesta.status(403).send({ mensaje: 'Debe cambiar su contraseña antes de continuar' });
      return;
    }
    if (!rolesPermitidos.includes(solicitud.user.rol)) {
      await respuesta.status(403).send({ mensaje: 'No tiene permiso para esta operación' });
    }
  };

export const rolesOperativos: RolColaborador[] = [
  'Vigilante',
  'Administrador',
  'Ingeniero',
];

export const rolesAdministrativos: RolColaborador[] = [
  'Administrador',
  'Ingeniero',
];
