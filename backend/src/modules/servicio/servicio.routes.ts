import type { FastifyInstance } from 'fastify';
import { autenticar, autorizarRoles, rolesOperativos } from '../auth/auth.middleware';
import {
  calcularSalidaServicio,
  obtenerDisponibilidadServicios,
  listarServiciosActivos,
  registrarEntradaServicio,
} from './servicio.service';
import { registrarSalidaConPago } from '../pago/pago.service';
import type { MedioPago, RegistrarSalidaServicio } from '../pago/pago.types';
import type {
  CrearEntradaServicio,
  TipoVehiculoServicio,
} from './servicio.types';

const tiposVehiculoValidos: TipoVehiculoServicio[] = [
  'Carro',
  'Moto',
  'Bicicleta',
];
const mediosPagoValidos: MedioPago[] = ['Efectivo', 'Nequi'];

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const esTextoObligatorio = (valor: unknown): valor is string =>
  typeof valor === 'string' && valor.trim().length > 0;

const esTipoVehiculoServicio = (
  valor: unknown,
): valor is TipoVehiculoServicio =>
  typeof valor === 'string' &&
  tiposVehiculoValidos.includes(valor as TipoVehiculoServicio);

const esIdColaboradorValido = (valor: unknown): valor is string =>
  (typeof valor === 'string' && /^\d+$/.test(valor)) ||
  (typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0);

const esMedioPago = (valor: unknown): valor is MedioPago =>
  typeof valor === 'string' && mediosPagoValidos.includes(valor as MedioPago);

const tieneSoloCampos = (
  datos: Record<string, unknown>,
  camposPermitidos: string[],
): boolean => Object.keys(datos).every((campo) => camposPermitidos.includes(campo));

const normalizarPlaca = (placa: string): string =>
  placa.trim().toUpperCase();

const validarEntradaServicio = (
  cuerpo: unknown,
  id_colaborador_entrada: string,
): CrearEntradaServicio | null => {
  if (!esObjeto(cuerpo) || !esTipoVehiculoServicio(cuerpo.tipo_vehiculo)) {
    return null;
  }

  if (cuerpo.tipo_vehiculo === 'Bicicleta') {
    if (
      !tieneSoloCampos(cuerpo, [
        'tipo_vehiculo',
        'identificacion_usuario',
      ]) ||
      !esTextoObligatorio(cuerpo.identificacion_usuario)
    ) {
      return null;
    }

    return {
      tipo_vehiculo: 'Bicicleta',
      identificacion_usuario: cuerpo.identificacion_usuario.trim(),
      id_colaborador_entrada,
    };
  }

  if (
    !tieneSoloCampos(cuerpo, [
      'tipo_vehiculo',
      'placa',
      'vehiculo_especial',
    ]) ||
    !esTextoObligatorio(cuerpo.placa) ||
    (cuerpo.vehiculo_especial !== undefined &&
      typeof cuerpo.vehiculo_especial !== 'boolean')
  ) {
    return null;
  }

  const placa = normalizarPlaca(cuerpo.placa);
  const vehiculoEspecial = cuerpo.vehiculo_especial ?? false;
  const placaValida =
    vehiculoEspecial ||
    (cuerpo.tipo_vehiculo === 'Carro'
      ? /^[A-Z]{3}\d{3}$/.test(placa)
      : /^[A-Z]{3}\d{2}[A-Z]$/.test(placa));

  if (!placaValida) {
    return null;
  }

  return {
    tipo_vehiculo: cuerpo.tipo_vehiculo,
    placa,
    vehiculo_especial: vehiculoEspecial,
    id_colaborador_entrada,
  };
};

const validarSalidaConPago = (
  cuerpo: unknown,
  id_colaborador: string,
): RegistrarSalidaServicio | null => {
  if (!esObjeto(cuerpo) || !esMedioPago(cuerpo.medio_pago)) {
    return null;
  }

  const camposPermitidos =
    cuerpo.medio_pago === 'Efectivo'
      ? ['id_caja', 'medio_pago']
      : ['id_caja', 'medio_pago', 'referencia_nequi'];

  if (
    !tieneSoloCampos(cuerpo, camposPermitidos) ||
    !esIdColaboradorValido(cuerpo.id_caja)
  ) {
    return null;
  }

  if (
    cuerpo.medio_pago === 'Nequi' &&
    cuerpo.referencia_nequi !== undefined &&
    cuerpo.referencia_nequi !== null &&
    (typeof cuerpo.referencia_nequi !== 'string' ||
      cuerpo.referencia_nequi.length > 100)
  ) {
    return null;
  }

  return {
    id_caja: String(cuerpo.id_caja),
    id_colaborador,
    medio_pago: cuerpo.medio_pago,
    ...(cuerpo.medio_pago === 'Nequi'
      ? {
          referencia_nequi:
            typeof cuerpo.referencia_nequi === 'string'
              ? cuerpo.referencia_nequi.trim() || null
              : null,
        }
      : {}),
  };
};

const esConflictoPlacaActiva = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505' &&
  'constraint' in error &&
  error.constraint === 'uq_placa_servicio_activo';

export const rutasServicio = async (app: FastifyInstance): Promise<void> => {
  app.get('/servicios/activos', { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] }, async () => listarServiciosActivos());

  app.get('/servicios/disponibilidad', { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] }, async () =>
    obtenerDisponibilidadServicios(),
  );

  app.get<{ Params: { id: string } }>(
    '/servicios/:id/salida-calculo',
    { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] },
    async (solicitud, respuesta) => {
      if (!/^\d+$/.test(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de servicio inválido' });
      }

      const resultado = await calcularSalidaServicio(solicitud.params.id);

      if (resultado.resultado === 'no_encontrado') {
        return respuesta.status(404).send({ mensaje: 'Servicio no encontrado' });
      }

      if (resultado.resultado === 'finalizado') {
        return respuesta.status(409).send({ mensaje: 'El servicio ya está finalizado' });
      }

      return resultado.calculo;
    },
  );

  app.post('/servicios/entrada', { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] }, async (solicitud, respuesta) => {
    const datos = validarEntradaServicio(
      solicitud.body,
      solicitud.user.id_colaborador,
    );

    if (!datos) {
      return respuesta.status(400).send({ mensaje: 'Datos de entrada inválidos' });
    }

    try {
      const resultado = await registrarEntradaServicio(datos);

      if (resultado.resultado === 'colaborador_no_encontrado') {
        return respuesta.status(404).send({ mensaje: 'Colaborador no encontrado' });
      }

      if (resultado.resultado === 'tarifa_no_encontrada') {
        return respuesta.status(404).send({ mensaje: 'Tarifa vigente no encontrada' });
      }

      if (resultado.resultado === 'sin_cupo') {
        return respuesta.status(409).send({ mensaje: 'No hay cupos disponibles' });
      }

      return respuesta.status(201).send(resultado.servicio);
    } catch (error) {
      if (esConflictoPlacaActiva(error)) {
        return respuesta.status(409).send({
          mensaje: 'La placa ya tiene un servicio activo',
        });
      }

      throw error;
    }
  });

  app.post<{ Params: { id: string } }>(
    '/servicios/:id/salida',
    { preHandler: [autenticar, autorizarRoles(...rolesOperativos)] },
    async (solicitud, respuesta) => {
      if (!/^\d+$/.test(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de servicio inválido' });
      }

      const datos = validarSalidaConPago(
        solicitud.body,
        solicitud.user.id_colaborador,
      );

      if (!datos) {
        return respuesta.status(400).send({ mensaje: 'Datos de pago inválidos' });
      }

      try {
        const resultado = await registrarSalidaConPago(
          solicitud.params.id,
          datos,
        );

        if (resultado.resultado === 'servicio_no_encontrado') {
          return respuesta.status(404).send({ mensaje: 'Servicio no encontrado' });
        }

        if (resultado.resultado === 'servicio_finalizado') {
          return respuesta.status(409).send({ mensaje: 'El servicio ya está finalizado' });
        }

        if (resultado.resultado === 'caja_no_encontrada') {
          return respuesta.status(404).send({ mensaje: 'Caja no encontrada' });
        }

        if (resultado.resultado === 'caja_no_abierta') {
          return respuesta.status(409).send({ mensaje: 'La caja no está abierta' });
        }

        if (resultado.resultado === 'caja_no_corresponde_colaborador') {
          return respuesta.status(409).send({
            mensaje: 'La caja no corresponde al colaborador que realiza el cobro',
          });
        }

        if (resultado.resultado === 'colaborador_no_encontrado') {
          return respuesta.status(404).send({ mensaje: 'Colaborador no encontrado' });
        }

        if (resultado.resultado === 'colaborador_inactivo') {
          return respuesta.status(409).send({ mensaje: 'El colaborador está inactivo' });
        }

        return respuesta.status(201).send(resultado.recibo);
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === '23505'
        ) {
          return respuesta.status(409).send({
            mensaje: 'El servicio ya tiene un pago registrado',
          });
        }

        throw error;
      }
    },
  );
};
