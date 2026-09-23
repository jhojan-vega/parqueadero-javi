import type { FastifyInstance } from 'fastify';
import { autenticar, autorizarRoles, rolesAdministrativos } from '../auth/auth.middleware';
import {
  buscarColaboradorPorId,
  cambiarEstadoColaborador,
  crearColaborador,
  listarColaboradores,
  actualizarColaborador,
} from './colaborador.service';
import type {
  ActualizarColaborador,
  CrearColaborador,
  EstadoColaborador,
  RolColaborador,
} from './colaborador.types';

const rolesValidos: RolColaborador[] = [
  'Vigilante',
  'Administrador',
  'Ingeniero',
];
const estadosValidos: EstadoColaborador[] = ['activo', 'inactivo'];

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const esTextoObligatorio = (valor: unknown): valor is string =>
  typeof valor === 'string' && valor.trim().length > 0;

const esRolColaborador = (valor: unknown): valor is RolColaborador =>
  typeof valor === 'string' && rolesValidos.includes(valor as RolColaborador);

const esEstadoColaborador = (valor: unknown): valor is EstadoColaborador =>
  typeof valor === 'string' && estadosValidos.includes(valor as EstadoColaborador);

const tieneSoloCampos = (
  datos: Record<string, unknown>,
  camposPermitidos: string[],
): boolean => Object.keys(datos).every((campo) => camposPermitidos.includes(campo));

const esIdValido = (id: string): boolean => /^\d+$/.test(id);

const validarCrearColaborador = (cuerpo: unknown): CrearColaborador | null => {
  if (
    !esObjeto(cuerpo) ||
    !tieneSoloCampos(cuerpo, [
      'nombre',
      'documento',
      'usuario',
      'correo',
      'contrasena',
      'rol',
      'estado',
    ]) ||
    !esTextoObligatorio(cuerpo.nombre) ||
    !esTextoObligatorio(cuerpo.documento) ||
    !esTextoObligatorio(cuerpo.usuario) ||
    !esTextoObligatorio(cuerpo.contrasena) ||
    cuerpo.contrasena.length < 4 ||
    !esRolColaborador(cuerpo.rol) ||
    (cuerpo.estado !== undefined && !esEstadoColaborador(cuerpo.estado)) ||
    (cuerpo.correo !== undefined &&
      cuerpo.correo !== null &&
      typeof cuerpo.correo !== 'string')
  ) {
    return null;
  }

  return {
    nombre: cuerpo.nombre.trim(),
    documento: cuerpo.documento.trim(),
    usuario: cuerpo.usuario.trim(),
    correo:
      typeof cuerpo.correo === 'string' && cuerpo.correo.trim().length > 0
        ? cuerpo.correo.trim()
        : null,
    contrasena: cuerpo.contrasena,
    rol: cuerpo.rol,
    ...(cuerpo.estado !== undefined ? { estado: cuerpo.estado } : {}),
  };
};

const validarActualizarColaborador = (
  cuerpo: unknown,
): ActualizarColaborador | null => {
  if (
    !esObjeto(cuerpo) ||
    !tieneSoloCampos(cuerpo, [
      'nombre',
      'documento',
      'usuario',
      'correo',
      'rol',
    ]) ||
    Object.keys(cuerpo).length === 0
  ) {
    return null;
  }

  const datos: ActualizarColaborador = {};

  if (cuerpo.nombre !== undefined) {
    if (!esTextoObligatorio(cuerpo.nombre)) return null;
    datos.nombre = cuerpo.nombre.trim();
  }

  if (cuerpo.documento !== undefined) {
    if (!esTextoObligatorio(cuerpo.documento)) return null;
    datos.documento = cuerpo.documento.trim();
  }

  if (cuerpo.usuario !== undefined) {
    if (!esTextoObligatorio(cuerpo.usuario)) return null;
    datos.usuario = cuerpo.usuario.trim();
  }

  if (cuerpo.correo !== undefined) {
    if (cuerpo.correo !== null && typeof cuerpo.correo !== 'string') return null;
    datos.correo =
      typeof cuerpo.correo === 'string' && cuerpo.correo.trim().length > 0
        ? cuerpo.correo.trim()
        : null;
  }

  if (cuerpo.rol !== undefined) {
    if (!esRolColaborador(cuerpo.rol)) return null;
    datos.rol = cuerpo.rol;
  }

  return datos;
};

const validarCambioEstado = (cuerpo: unknown): EstadoColaborador | null => {
  if (
    !esObjeto(cuerpo) ||
    !tieneSoloCampos(cuerpo, ['estado']) ||
    !esEstadoColaborador(cuerpo.estado)
  ) {
    return null;
  }

  return cuerpo.estado;
};

const esConflictoUnico = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505';

export const rutasColaborador = async (
  app: FastifyInstance,
): Promise<void> => {
  app.get('/colaboradores', { preHandler: [autenticar, autorizarRoles(...rolesAdministrativos)] }, async () => {
    const colaboradores = await listarColaboradores();

    return colaboradores;
  });

  app.get<{ Params: { id: string } }>(
    '/colaboradores/:id',
    { preHandler: [autenticar, autorizarRoles(...rolesAdministrativos)] },
    async (solicitud, respuesta) => {
      const colaborador = await buscarColaboradorPorId(
        solicitud.params.id,
      );

      if (!colaborador) {
        return respuesta.status(404).send({
          mensaje: 'Colaborador no encontrado',
        });
      }

      return colaborador;
    },
  );

  app.post('/colaboradores', { preHandler: [autenticar, autorizarRoles(...rolesAdministrativos)] }, async (solicitud, respuesta) => {
    const datos = validarCrearColaborador(solicitud.body);

    if (!datos) {
      return respuesta.status(400).send({ mensaje: 'Datos de colaborador inválidos' });
    }

    if (datos.rol === 'Ingeniero') {
      return respuesta.status(403).send({
        mensaje: 'No se permite crear colaboradores Ingeniero mediante esta ruta',
      });
    }

    if (solicitud.user.rol === 'Administrador' && datos.rol !== 'Vigilante') {
      return respuesta.status(403).send({
        mensaje: 'Un Administrador solamente puede crear colaboradores Vigilante',
      });
    }

    try {
      const colaborador = await crearColaborador(datos);
      return respuesta.status(201).send(colaborador);
    } catch (error) {
      if (esConflictoUnico(error)) {
        return respuesta.status(409).send({
          mensaje: 'El documento o usuario ya está registrado',
        });
      }

      throw error;
    }
  });

  app.put<{ Params: { id: string } }>(
    '/colaboradores/:id',
    { preHandler: [autenticar, autorizarRoles(...rolesAdministrativos)] },
    async (solicitud, respuesta) => {
      if (!esIdValido(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de colaborador inválido' });
      }

      const datos = validarActualizarColaborador(solicitud.body);

      if (!datos) {
        return respuesta.status(400).send({ mensaje: 'Datos de colaborador inválidos' });
      }

      const colaboradorActual = await buscarColaboradorPorId(
        solicitud.params.id,
      );

      if (!colaboradorActual) {
        return respuesta.status(404).send({
          mensaje: 'Colaborador no encontrado',
        });
      }

      if (colaboradorActual.rol === 'Ingeniero' || datos.rol === 'Ingeniero') {
        return respuesta.status(403).send({
          mensaje: 'No se permite administrar colaboradores Ingeniero mediante esta ruta',
        });
      }

      if (
        solicitud.user.rol === 'Administrador' &&
        (colaboradorActual.rol !== 'Vigilante' ||
          (datos.rol !== undefined && datos.rol !== 'Vigilante'))
      ) {
        return respuesta.status(403).send({
          mensaje: 'Un Administrador solamente puede modificar colaboradores Vigilante',
        });
      }

      try {
        const colaborador = await actualizarColaborador(solicitud.params.id, datos);

        if (!colaborador) {
          return respuesta.status(404).send({
            mensaje: 'Colaborador no encontrado',
          });
        }

        return colaborador;
      } catch (error) {
        if (esConflictoUnico(error)) {
          return respuesta.status(409).send({
            mensaje: 'El documento o usuario ya está registrado',
          });
        }

        throw error;
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/colaboradores/:id/estado',
    { preHandler: [autenticar, autorizarRoles(...rolesAdministrativos)] },
    async (solicitud, respuesta) => {
      if (!esIdValido(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de colaborador inválido' });
      }

      const estado = validarCambioEstado(solicitud.body);

      if (!estado) {
        return respuesta.status(400).send({ mensaje: 'Estado de colaborador inválido' });
      }

      const colaboradorActual = await buscarColaboradorPorId(
        solicitud.params.id,
      );

      if (!colaboradorActual) {
        return respuesta.status(404).send({
          mensaje: 'Colaborador no encontrado',
        });
      }

      if (colaboradorActual.rol === 'Ingeniero') {
        return respuesta.status(403).send({
          mensaje: 'No se permite administrar colaboradores Ingeniero mediante esta ruta',
        });
      }

      if (
        solicitud.user.rol === 'Administrador' &&
        colaboradorActual.rol !== 'Vigilante'
      ) {
        return respuesta.status(403).send({
          mensaje: 'Un Administrador solamente puede cambiar el estado de Vigilantes',
        });
      }

      const colaborador = await cambiarEstadoColaborador(
        solicitud.params.id,
        estado,
      );

      if (!colaborador) {
        return respuesta.status(404).send({
          mensaje: 'Colaborador no encontrado',
        });
      }

      return colaborador;
    },
  );
};
