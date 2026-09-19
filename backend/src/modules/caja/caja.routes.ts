import type { FastifyInstance } from 'fastify';
import {
  abrirCaja,
  buscarCajaPorId,
  cerrarCaja,
  listarCajasAbiertas,
  verificarCaja,
} from './caja.service';

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const esIdValido = (valor: unknown): boolean =>
  (typeof valor === 'string' && /^\d+$/.test(valor)) ||
  (typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0);

const validarAperturaCaja = (cuerpo: unknown): string | null => {
  if (
    !esObjeto(cuerpo) ||
    Object.keys(cuerpo).length !== 1 ||
    !('id_colaborador' in cuerpo) ||
    !esIdValido(cuerpo.id_colaborador)
  ) {
    return null;
  }

  return String(cuerpo.id_colaborador);
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

export const rutasCaja = async (app: FastifyInstance): Promise<void> => {
  app.get('/cajas/abiertas', async () => listarCajasAbiertas());

  app.get<{ Params: { id: string } }>(
    '/cajas/:id',
    async (solicitud, respuesta) => {
      if (!/^\d+$/.test(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de caja inválido' });
      }

      const caja = await buscarCajaPorId(solicitud.params.id);

      if (!caja) {
        return respuesta.status(404).send({ mensaje: 'Caja no encontrada' });
      }

      return caja;
    },
  );

  app.post('/cajas/apertura', async (solicitud, respuesta) => {
    const id_colaborador = validarAperturaCaja(solicitud.body);

    if (!id_colaborador) {
      return respuesta.status(400).send({ mensaje: 'Datos de apertura inválidos' });
    }

    try {
      const resultado = await abrirCaja(id_colaborador);

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

      if (resultado.resultado === 'fuera_horario') {
        return respuesta.status(409).send({
          mensaje: 'No es posible abrir caja fuera del horario operativo',
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
    async (solicitud, respuesta) => {
      if (!/^\d+$/.test(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de caja inválido' });
      }

      const efectivo_real = validarEfectivoReal(solicitud.body);

      if (efectivo_real === null) {
        return respuesta.status(400).send({ mensaje: 'Efectivo real inválido' });
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
    async (solicitud, respuesta) => {
      if (!/^\d+$/.test(solicitud.params.id)) {
        return respuesta.status(400).send({ mensaje: 'Id de caja inválido' });
      }

      const efectivo_real = validarEfectivoReal(solicitud.body);

      if (efectivo_real === null) {
        return respuesta.status(400).send({ mensaje: 'Efectivo real inválido' });
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
};
