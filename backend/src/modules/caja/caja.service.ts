import type { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { buscarColaboradorPorId } from '../colaborador/colaborador.service';
import type {
  Caja,
  ResultadoAperturaCaja,
  ResultadoCierreCaja,
  ResultadoVerificacionCaja,
  VerificacionCaja,
} from './caja.types';

const columnasCaja = `
  id_caja,
  turno,
  fecha_hora_apertura,
  fecha_hora_cierre,
  recaudo_total,
  total_efectivo,
  total_nequi,
  efectivo_real,
  faltante_caja,
  sobrante_caja,
  id_colaborador,
  estado,
  novedades,
  id_administrador_regulariza,
  fecha_hora_regularizacion
`;

export const listarCajasAbiertas = async (): Promise<Caja[]> => {
  const resultado = await pool.query<Caja>(`
    SELECT ${columnasCaja}
    FROM caja
    WHERE estado = 'abierta'
    ORDER BY fecha_hora_apertura ASC, id_caja ASC;
  `);

  return resultado.rows;
};

export const buscarCajaPorId = async (id_caja: string): Promise<Caja | null> => {
  const resultado = await pool.query<Caja>(
    `
      SELECT ${columnasCaja}
      FROM caja
      WHERE id_caja = $1
      LIMIT 1;
    `,
    [id_caja],
  );

  return resultado.rows[0] ?? null;
};

export const abrirCaja = async (
  id_colaborador: string,
): Promise<ResultadoAperturaCaja> => {
  const colaborador = await buscarColaboradorPorId(id_colaborador);

  if (!colaborador) {
    return { resultado: 'colaborador_no_encontrado' };
  }

  if (colaborador.estado !== 'activo') {
    return { resultado: 'colaborador_inactivo' };
  }

  if (colaborador.rol !== 'Vigilante' && colaborador.rol !== 'Administrador') {
    return { resultado: 'rol_no_permitido' };
  }

  const resultado = await pool.query<Caja>(
    `
      INSERT INTO caja (turno, id_colaborador)
      SELECT
        CASE
          WHEN CURRENT_TIME >= TIME '06:00:00'
            AND CURRENT_TIME < TIME '13:00:00' THEN 'AM'
          WHEN CURRENT_TIME >= TIME '13:00:00'
            AND CURRENT_TIME < TIME '22:00:00' THEN 'PM'
        END,
        $1
      WHERE CURRENT_TIME >= TIME '06:00:00'
        AND CURRENT_TIME < TIME '22:00:00'
      RETURNING ${columnasCaja};
    `,
    [id_colaborador],
  );

  if (!resultado.rows[0]) {
    return { resultado: 'fuera_horario' };
  }

  return { resultado: 'abierta', caja: resultado.rows[0] };
};

export const verificarCaja = async (
  id_caja: string,
  efectivo_real: number,
): Promise<ResultadoVerificacionCaja> => {
  const resultado = await pool.query<
    VerificacionCaja & { estado: 'abierta' | 'cerrada' | 'pendiente' }
  >(
    `
      SELECT
        recaudo_total,
        total_efectivo,
        total_nequi,
        $1::INTEGER AS efectivo_real,
        GREATEST(total_efectivo - $1::INTEGER, 0) AS faltante_caja,
        GREATEST($1::INTEGER - total_efectivo, 0) AS sobrante_caja,
        estado
      FROM caja
      WHERE id_caja = $2;
    `,
    [efectivo_real, id_caja],
  );

  const verificacion = resultado.rows[0];

  if (!verificacion) {
    return { resultado: 'no_encontrada' };
  }

  if (verificacion.estado !== 'abierta') {
    return { resultado: 'no_abierta' };
  }

  const { estado: _estado, ...datosVerificacion } = verificacion;
  return { resultado: 'verificada', verificacion: datosVerificacion };
};

const revertir = async (cliente: PoolClient): Promise<void> => {
  await cliente.query('ROLLBACK');
};

export const cerrarCaja = async (
  id_caja: string,
  efectivo_real: number,
): Promise<ResultadoCierreCaja> => {
  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    const caja = await cliente.query<{ estado: 'abierta' | 'cerrada' | 'pendiente' }>(
      `
        SELECT estado
        FROM caja
        WHERE id_caja = $1
        FOR UPDATE;
      `,
      [id_caja],
    );

    const cajaActual = caja.rows[0];

    if (!cajaActual) {
      await revertir(cliente);
      return { resultado: 'no_encontrada' };
    }

    if (cajaActual.estado !== 'abierta') {
      await revertir(cliente);
      return { resultado: 'no_abierta' };
    }

    const cierre = await cliente.query<Caja>(
      `
        UPDATE caja
        SET efectivo_real = $1, estado = 'cerrada'
        WHERE id_caja = $2
        RETURNING ${columnasCaja};
      `,
      [efectivo_real, id_caja],
    );

    await cliente.query('COMMIT');
    return { resultado: 'cerrada', caja: cierre.rows[0]! };
  } catch (error) {
    await revertir(cliente);
    throw error;
  } finally {
    cliente.release();
  }
};
