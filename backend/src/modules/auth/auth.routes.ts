import type { FastifyInstance } from 'fastify';
import { iniciarSesion } from './auth.service';
import type { CredencialesLogin } from './auth.types';

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const validarCredencialesLogin = (
  cuerpo: unknown,
): CredencialesLogin | null => {
  if (
    !esObjeto(cuerpo) ||
    Object.keys(cuerpo).some(
      (campo) => campo !== 'usuario' && campo !== 'contrasena',
    ) ||
    typeof cuerpo.usuario !== 'string' ||
    cuerpo.usuario.trim().length === 0 ||
    typeof cuerpo.contrasena !== 'string' ||
    cuerpo.contrasena.length === 0
  ) {
    return null;
  }

  return {
    usuario: cuerpo.usuario.trim(),
    contrasena: cuerpo.contrasena,
  };
};

export const rutasAuth = async (app: FastifyInstance): Promise<void> => {
  app.post('/auth/login', async (solicitud, respuesta) => {
    const credenciales = validarCredencialesLogin(solicitud.body);

    if (!credenciales) {
      return respuesta.status(400).send({
        mensaje: 'Usuario y contraseña son obligatorios',
      });
    }

    const resultado = await iniciarSesion(credenciales);

    if (resultado.resultado === 'credenciales_invalidas') {
      return respuesta.status(401).send({
        mensaje: 'Usuario o contraseña incorrectos',
      });
    }

    if (resultado.resultado === 'inactivo') {
      return respuesta.status(403).send({
        mensaje: 'Colaborador inactivo',
      });
    }

    return resultado.colaborador;
  });
};
