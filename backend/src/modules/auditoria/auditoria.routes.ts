import type { FastifyInstance } from 'fastify';
import { autenticar, autorizarRoles, rolesAdministrativos } from '../auth/auth.middleware';
import { crearAuditoria, listarHistorialAuditorias } from './auditoria.service';
import type {
  CrearAuditoria,
  FiltrosHistorialAuditorias,
} from './auditoria.types';

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const esIdValido = (valor: unknown): boolean =>
  (typeof valor === 'string' && /^\d+$/.test(valor)) ||
  (typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0);

const esConteoFisicoValido = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= 0;

const esFechaValida = (valor: unknown): valor is string =>
  typeof valor === 'string' &&
  valor.trim().length > 0 &&
  !Number.isNaN(Date.parse(valor));

const tieneSoloCampos = (
  datos: Record<string, unknown>,
  camposPermitidos: string[],
): boolean => Object.keys(datos).every((campo) => camposPermitidos.includes(campo));

const validarCrearAuditoria = (
  cuerpo: unknown,
  id_administrador_auditor: string,
): CrearAuditoria | null => {
  if (
    !esObjeto(cuerpo) ||
    !tieneSoloCampos(cuerpo, [
      'id_operador_auditado',
      'id_caja',
      'carros_fisico',
      'motos_fisico',
      'bicicletas_fisico',
      'observaciones',
    ]) ||
    !esIdValido(cuerpo.id_operador_auditado) ||
    !esIdValido(cuerpo.id_caja) ||
    !esConteoFisicoValido(cuerpo.carros_fisico) ||
    !esConteoFisicoValido(cuerpo.motos_fisico) ||
    !esConteoFisicoValido(cuerpo.bicicletas_fisico) ||
    (cuerpo.observaciones !== undefined &&
      cuerpo.observaciones !== null &&
      typeof cuerpo.observaciones !== 'string')
  ) {
    return null;
  }

  return {
    id_administrador_auditor,
    id_operador_auditado: String(cuerpo.id_operador_auditado),
    id_caja: String(cuerpo.id_caja),
    carros_fisico: cuerpo.carros_fisico,
    motos_fisico: cuerpo.motos_fisico,
    bicicletas_fisico: cuerpo.bicicletas_fisico,
    observaciones:
      typeof cuerpo.observaciones === 'string'
        ? cuerpo.observaciones.trim() || null
        : null,
  };
};

const validarFiltrosHistorial = (
  consulta: Record<string, unknown>,
): FiltrosHistorialAuditorias | null => {
  const camposPermitidos = [
    'id_operador_auditado',
    'id_administrador_auditor',
    'fecha_desde',
    'fecha_hasta',
  ];

  if (Object.keys(consulta).some((campo) => !camposPermitidos.includes(campo))) {
    return null;
  }

  if (
    (consulta.id_operador_auditado !== undefined &&
      !esIdValido(consulta.id_operador_auditado)) ||
    (consulta.id_administrador_auditor !== undefined &&
      !esIdValido(consulta.id_administrador_auditor)) ||
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
    ...(consulta.id_operador_auditado !== undefined
      ? { id_operador_auditado: String(consulta.id_operador_auditado) }
      : {}),
    ...(consulta.id_administrador_auditor !== undefined
      ? { id_administrador_auditor: String(consulta.id_administrador_auditor) }
      : {}),
    ...(fecha_desde ? { fecha_desde } : {}),
    ...(fecha_hasta ? { fecha_hasta } : {}),
  };
};

export const rutasAuditoria = async (app: FastifyInstance): Promise<void> => {
  app.post('/auditorias', { preHandler: [autenticar, autorizarRoles(...rolesAdministrativos)] }, async (solicitud, respuesta) => {
    const datos = validarCrearAuditoria(
      solicitud.body,
      solicitud.user.id_colaborador,
    );

    if (!datos) {
      return respuesta.status(400).send({ mensaje: 'Datos de auditoría inválidos' });
    }

    const resultado = await crearAuditoria(datos);

    if (resultado.resultado === 'administrador_no_encontrado') {
      return respuesta.status(404).send({ mensaje: 'Administrador no encontrado' });
    }

    if (resultado.resultado === 'administrador_inactivo') {
      return respuesta.status(403).send({ mensaje: 'El administrador está inactivo' });
    }

    if (resultado.resultado === 'administrador_sin_rol') {
      return respuesta.status(403).send({ mensaje: 'El colaborador no es administrador' });
    }

    if (resultado.resultado === 'operador_no_encontrado') {
      return respuesta.status(404).send({ mensaje: 'Operador auditado no encontrado' });
    }

    if (resultado.resultado === 'caja_no_encontrada') {
      return respuesta.status(404).send({ mensaje: 'Caja no encontrada' });
    }

    if (resultado.resultado === 'caja_no_corresponde_operador') {
      return respuesta.status(409).send({
        mensaje: 'La caja no corresponde al operador auditado',
      });
    }

    return respuesta.status(201).send(resultado.auditoria);
  });

  app.get<{ Querystring: Record<string, unknown> }>(
    '/auditorias',
    { preHandler: [autenticar, autorizarRoles(...rolesAdministrativos)] },
    async (solicitud, respuesta) => {
      const filtros = validarFiltrosHistorial(solicitud.query);

      if (!filtros) {
        return respuesta.status(400).send({ mensaje: 'Filtros de auditoría inválidos' });
      }

      return listarHistorialAuditorias(filtros);
    },
  );
};
