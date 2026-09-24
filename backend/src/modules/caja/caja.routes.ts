import type { FastifyInstance } from 'fastify';
import { autenticar, autorizarRoles, rolesAdministrativos, rolesOperativos } from '../auth/auth.middleware';
import {
  abrirCaja,
  buscarCajaPorId,
  cerrarCaja,
  listarCajasAbiertas,
  listarHistorialCajas,
  obtenerResumenFaltantes,
  actualizarNovedadesCaja,
  verificarCaja,
} from './caja.service';
import type { FiltrosHistorialCajas } from './caja.types';

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const esIdValido = (valor: unknown): boolean =>
  (typeof valor === 'string' && /^\d+$/.test(valor)) ||
  (typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0);

const validarAperturaCaja = (cuerpo: unknown): boolean => {
  if (
    !esObjeto(cuerpo) ||
    Object.keys(cuerpo).length !== 0
  ) {
    return false;
  }

  return true;
};

const validarEfectivoReal = (cuerpo: unknown): number | null => {
  if (
    !esObjeto(cuerpo) ||
    Object.keys(cuerpo).length !== 1 ||
    !('efectivo_real' in cuerpo) ||
    typeof cuerpo.efectivo_real !== 'number' ||
    !Number.isInteger(cuerpo.efectivo_real) ||
    cuerpo.efectivo_real < 0
  ) {
    return null;
  }

  return cuerpo.efectivo_real;
};

const esFechaValida = (valor: unknown): valor is string =>
  typeof valor === 'string' &&
  valor.trim().length > 0 &&
  !Number.isNaN(Date.parse(valor));

const validarFiltrosHistorial = (
  consulta: Record<string, unknown>,
): FiltrosHistorialCajas | null => {
  const camposPermitidos = ['id_colaborador', 'fecha_desde', 'fecha_hasta'];

  if (Object.keys(consulta).some((campo) => !camposPermitidos.includes(campo))) {
    return null;
  }

  if (
    (consulta.id_colaborador !== undefined && !esIdValido(consulta.id_colaborador)) ||
    (consulta.fecha_desde !== undefined && !esFechaValida(consulta.fecha_desde)) ||
    (consulta.fecha_hasta !== undefined && !esFechaValida(consulta.fecha_hasta))
  ) {
    return null;
  }

  const fecha_desde =
    typeof consulta.fecha_desde === 'string' ? consulta.fecha_desde.trim() : undefined;
  const fecha_hasta =
    typeof consulta.fecha_hasta === 'string' ? consulta.fecha_hasta.trim() : undefined;

  if (
    fecha_desde &&
    fecha_hasta &&
    new Date(fecha_desde).getTime() > new Date(fecha_hasta).getTime()
  ) {
    return null;
  }

  return {
    ...(consulta.id_colaborador !== undefined
      ? { id_colaborador: String(consulta.id_colaborador) }
      : {}),
    ...(fecha_desde ? { fecha_desde } : {}),
    ...(fecha_hasta ? { fecha_hasta } : {}),
  };
};

const validarNovedades = (cuerpo: unknown): string | null | undefined => {
  if (
    !esObjeto(cuerpo) ||
    Object.keys(cuerpo).length !== 1 ||
    !('novedades' in cuerpo) ||
    (cuerpo.novedades !== null && typeof cuerpo.novedades !== 'string')
  ) {
    return undefined;
  }

  return cuerpo.novedades;
};

export const rutasCaja = async (app: FastifyInstance): Promise<void> => {
  app.get('/cajas/abiertas', { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] }, async (solicitud) =>
    listarCajasAbiertas(
      solicitud.user.rol === 'Vigilante'
        ? solicitud.user.id_colaborador
        : undefined,
    ),
  );

  app.get<{ Querystring: Record<string, unknown> }>(
    '/cajas/historial',
    { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] },
    async (solicitud, respuesta) => {
      const filtros = validarFiltrosHistorial(solicitud.query);

      if (!filtros) {
        return respuesta.status(400).send({ mensaje: 'Filtros de historial inválidos' });
      }

      return listarHistorialCajas({
        ...filtros,
        ...(solicitud.user.rol === 'Vigilante'
          ? { id_colaborador: solicitud.user.id_colaborador }
          : {}),
      });
    },
  );

  app.get<{ Querystring: Record<string, unknown> }>(
    '/cajas/resumen-faltantes',
    { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] },
    async (solicitud, respuesta) => {
      const filtros = validarFiltrosHistorial(solicitud.query);

      if (!filtros) {
        return respuesta.status(400).send({ mensaje: 'Filtros de faltantes inválidos' });
      }

      return obtenerResumenFaltantes({
        ...filtros,
        ...(solicitud.user.rol === 'Vigilante'
          ? { id_colaborador: solicitud.user.id_colaborador }
          : {}),
      });
    },
  );

  app.get<{ Params: { id: string } }>(
    '/cajas/:id',
    { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] },
    async (solicitud, respuesta) => {
      if (!/^\d+$/.test(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de caja inválido' });
      }

      const caja = await buscarCajaPorId(solicitud.params.id);

      if (!caja) {
        return respuesta.status(404).send({ mensaje: 'Caja no encontrada' });
      }

      if (
        solicitud.user.rol === 'Vigilante' &&
        caja.id_colaborador !== solicitud.user.id_colaborador
      ) {
        return respuesta.status(403).send({ mensaje: 'No tiene permiso para consultar esta caja' });
      }

      return caja;
    },
  );

  app.post('/cajas/apertura', { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] }, async (solicitud, respuesta) => {
    const aperturaValida = validarAperturaCaja(solicitud.body);

    if (!aperturaValida) {
      return respuesta.status(400).send({ mensaje: 'Datos de apertura inválidos' });
    }

    try {
      const resultado = await abrirCaja(solicitud.user.id_colaborador);

      if (resultado.resultado === 'colaborador_no_encontrado') {
        return respuesta.status(404).send({ mensaje: 'Colaborador no encontrado' });
      }

      if (resultado.resultado === 'colaborador_inactivo') {
        return respuesta.status(409).send({ mensaje: 'El colaborador está inactivo' });
      }

      if (resultado.resultado === 'rol_no_permitido') {
        return respuesta.status(403).send({
          mensaje: 'El rol del colaborador no puede abrir caja',
        });
      }

      return respuesta.status(201).send(resultado.caja);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505' &&
        'constraint' in error &&
        error.constraint === 'uq_caja_abierta_colaborador'
      ) {
        return respuesta.status(409).send({
          mensaje: 'El colaborador ya tiene una caja abierta',
        });
      }

      throw error;
    }
  });

  app.post<{ Params: { id: string } }>(
    '/cajas/:id/verificar',
    { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] },
    async (solicitud, respuesta) => {
      if (!/^\d+$/.test(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de caja inválido' });
      }

      const efectivo_real = validarEfectivoReal(solicitud.body);

      if (efectivo_real === null) {
        return respuesta.status(400).send({ mensaje: 'Efectivo real inválido' });
      }

      const caja = await buscarCajaPorId(solicitud.params.id);

      if (
        caja &&
        solicitud.user.rol === 'Vigilante' &&
        caja.id_colaborador !== solicitud.user.id_colaborador
      ) {
        return respuesta.status(403).send({ mensaje: 'No tiene permiso para verificar esta caja' });
      }

      const resultado = await verificarCaja(
        solicitud.params.id,
        efectivo_real,
      );

      if (resultado.resultado === 'no_encontrada') {
        return respuesta.status(404).send({ mensaje: 'Caja no encontrada' });
      }

      if (resultado.resultado === 'no_abierta') {
        return respuesta.status(409).send({ mensaje: 'La caja no está abierta' });
      }

      return resultado.verificacion;
    },
  );

  app.post<{ Params: { id: string } }>(
    '/cajas/:id/cierre',
    { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] },
    async (solicitud, respuesta) => {
      if (!/^\d+$/.test(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de caja inválido' });
      }

      const efectivo_real = validarEfectivoReal(solicitud.body);

      if (efectivo_real === null) {
        return respuesta.status(400).send({ mensaje: 'Efectivo real inválido' });
      }

      const caja = await buscarCajaPorId(solicitud.params.id);

      if (
        caja &&
        solicitud.user.rol === 'Vigilante' &&
        caja.id_colaborador !== solicitud.user.id_colaborador
      ) {
        return respuesta.status(403).send({ mensaje: 'No tiene permiso para cerrar esta caja' });
      }

      const resultado = await cerrarCaja(
        solicitud.params.id,
        efectivo_real,
      );

      if (resultado.resultado === 'no_encontrada') {
        return respuesta.status(404).send({ mensaje: 'Caja no encontrada' });
      }

      if (resultado.resultado === 'no_abierta') {
        return respuesta.status(409).send({ mensaje: 'La caja no está abierta' });
      }

      return resultado.caja;
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/cajas/:id/novedades',
    { preHandler: [autenticar, autorizarRoles(...rolesAdministrativos)] },
    async (solicitud, respuesta) => {
      if (!/^\d+$/.test(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de caja inválido' });
      }

      const novedades = validarNovedades(solicitud.body);

      if (novedades === undefined) {
        return respuesta.status(400).send({ mensaje: 'Novedades inválidas' });
      }

      const resultado = await actualizarNovedadesCaja(
        solicitud.params.id,
        novedades,
      );

      if (resultado.resultado === 'no_encontrada') {
        return respuesta.status(404).send({ mensaje: 'Caja no encontrada' });
      }

      if (resultado.resultado === 'no_cerrada') {
        return respuesta.status(409).send({
          mensaje: 'Solo se pueden actualizar novedades de una caja cerrada',
        });
      }

      return resultado.caja;
    },
  );
};
