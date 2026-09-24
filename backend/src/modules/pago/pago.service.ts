import type { PoolClient } from 'pg';
import { pool } from '../../config/database';
import type {
  MedioPago,
  RegistrarSalidaServicio,
  ResultadoSalidaConPago,
} from './pago.types';

interface ServicioBloqueado {
  id_servicio: string;
  codigo_recibo: string;
  placa: string | null;
  identificacion_usuario: string | null;
  tipo_vehiculo: 'Carro' | 'Moto' | 'Bicicleta';
  fecha_hora_entrada: Date;
  id_tarifa: string;
  estado: 'activo' | 'finalizado';
}

interface CajaBloqueada {
  id_caja: string;
  turno: 'AM' | 'PM' | 'T1' | 'T2' | 'T3';
  id_colaborador: string;
  estado: 'abierta' | 'cerrada' | 'pendiente';
}

interface ColaboradorOperador {
  id_colaborador: string;
  estado: 'activo' | 'inactivo';
}

interface CalculoFinal {
  tiempo_total: number;
  valor_calculado: number;
}

interface PagoCreado {
  id_pago: string;
}

interface ServicioFinalizado {
  fecha_hora_salida: Date;
}

const revertir = async (cliente: PoolClient): Promise<void> => {
  await cliente.query('ROLLBACK');
};

export const registrarSalidaConPago = async (
  id_servicio: string,
  datos: RegistrarSalidaServicio,
): Promise<ResultadoSalidaConPago> => {
  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    const servicio = await cliente.query<ServicioBloqueado>(
      `
        SELECT
          id_servicio,
          codigo_recibo,
          placa,
          identificacion_usuario,
          tipo_vehiculo,
          fecha_hora_entrada,
          id_tarifa,
          estado
        FROM servicio
        WHERE id_servicio = $1
        FOR UPDATE;
      `,
      [id_servicio],
    );

    const servicioActual = servicio.rows[0];

    if (!servicioActual) {
      await revertir(cliente);
      return { resultado: 'servicio_no_encontrado' };
    }

    if (servicioActual.estado === 'finalizado') {
      await revertir(cliente);
      return { resultado: 'servicio_finalizado' };
    }

    const caja = await cliente.query<CajaBloqueada>(
      `
        SELECT id_caja, turno, id_colaborador, estado
        FROM caja
        WHERE id_caja = $1
        FOR UPDATE;
      `,
      [datos.id_caja],
    );

    const cajaActual = caja.rows[0];

    if (!cajaActual) {
      await revertir(cliente);
      return { resultado: 'caja_no_encontrada' };
    }

    if (cajaActual.estado !== 'abierta') {
      await revertir(cliente);
      return { resultado: 'caja_no_abierta' };
    }

    if (cajaActual.id_colaborador !== datos.id_colaborador) {
      await revertir(cliente);
      return { resultado: 'caja_no_corresponde_colaborador' };
    }

    const colaborador = await cliente.query<ColaboradorOperador>(
      `
        SELECT id_colaborador, estado
        FROM colaborador
        WHERE id_colaborador = $1
        FOR SHARE;
      `,
      [datos.id_colaborador],
    );

    const colaboradorActual = colaborador.rows[0];

    if (!colaboradorActual) {
      await revertir(cliente);
      return { resultado: 'colaborador_no_encontrado' };
    }

    if (colaboradorActual.estado !== 'activo') {
      await revertir(cliente);
      return { resultado: 'colaborador_inactivo' };
    }

    const calculo = await cliente.query<CalculoFinal>(
      `
        SELECT
          CEIL(
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP::TIMESTAMP - fecha_hora_entrada)) / 60
          )::INTEGER AS tiempo_total,
          CASE
            WHEN tipo_vehiculo = 'Bicicleta' THEN calcular_tarifa_bicicleta(
              fecha_hora_entrada,
              CURRENT_TIMESTAMP::TIMESTAMP,
              id_tarifa
            )
            ELSE calcular_tarifa_servicio(
              fecha_hora_entrada,
              CURRENT_TIMESTAMP::TIMESTAMP,
              id_tarifa
            )
          END AS valor_calculado
        FROM servicio
        WHERE id_servicio = $1;
      `,
      [id_servicio],
    );

    const calculoFinal = calculo.rows[0]!;

    const pago = await cliente.query<PagoCreado>(
      `
        INSERT INTO pago (
          id_servicio,
          id_caja,
          valor_pagado,
          medio_pago,
          referencia_nequi,
          id_colaborador
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id_pago;
      `,
      [
        id_servicio,
        datos.id_caja,
        calculoFinal.valor_calculado,
        datos.medio_pago,
        datos.medio_pago === 'Nequi' ? (datos.referencia_nequi ?? null) : null,
        datos.id_colaborador,
      ],
    );

    const servicioFinalizado = await cliente.query<ServicioFinalizado>(
      `
        UPDATE servicio
        SET
          fecha_hora_salida = CURRENT_TIMESTAMP::TIMESTAMP,
          tiempo_total = $1,
          estado = 'finalizado',
          valor_calculado = $2,
          id_colaborador_salida = $3
        WHERE id_servicio = $4
        RETURNING fecha_hora_salida;
      `,
      [
        calculoFinal.tiempo_total,
        calculoFinal.valor_calculado,
        datos.id_colaborador,
        id_servicio,
      ],
    );

    await cliente.query(
      `
        UPDATE caja
        SET
          total_efectivo = total_efectivo +
            CASE WHEN $2::VARCHAR = 'Efectivo' THEN $1 ELSE 0 END,
          total_nequi = total_nequi +
            CASE WHEN $2::VARCHAR = 'Nequi' THEN $1 ELSE 0 END,
          recaudo_total =
            (total_efectivo + CASE WHEN $2::VARCHAR = 'Efectivo' THEN $1 ELSE 0 END) +
            (total_nequi + CASE WHEN $2::VARCHAR = 'Nequi' THEN $1 ELSE 0 END)
        WHERE id_caja = $3;
      `,
      [calculoFinal.valor_calculado, datos.medio_pago, datos.id_caja],
    );

    await cliente.query('COMMIT');

    return {
      resultado: 'completada',
      recibo: {
        id_servicio: servicioActual.id_servicio,
        codigo_recibo: servicioActual.codigo_recibo,
        placa: servicioActual.placa,
        identificacion_usuario: servicioActual.identificacion_usuario,
        tipo_vehiculo: servicioActual.tipo_vehiculo,
        fecha_hora_entrada: servicioActual.fecha_hora_entrada,
        fecha_hora_salida: servicioFinalizado.rows[0]!.fecha_hora_salida,
        tiempo_total: calculoFinal.tiempo_total,
        valor_calculado: calculoFinal.valor_calculado,
        valor_pagado: calculoFinal.valor_calculado,
        medio_pago: datos.medio_pago,
        id_pago: pago.rows[0]!.id_pago,
        id_caja: cajaActual.id_caja,
        turno: cajaActual.turno,
        id_colaborador_salida: datos.id_colaborador,
      },
    };
  } catch (error) {
    await revertir(cliente);
    throw error;
  } finally {
    cliente.release();
  }
};
