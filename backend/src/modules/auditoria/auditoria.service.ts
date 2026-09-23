import type { PoolClient } from 'pg';
import { pool } from '../../config/database';
import type {
  Auditoria,
  AuditoriaHistorial,
  CrearAuditoria,
  FiltrosHistorialAuditorias,
  ResultadoActualizarObservacionesAuditoria,
  ResultadoCrearAuditoria,
} from './auditoria.types';

const columnasAuditoria = `
  id_auditoria,
  fecha_hora,
  id_administrador_auditor,
  id_operador_auditado,
  id_caja,
  carros_sistema,
  carros_fisico,
  motos_sistema,
  motos_fisico,
  bicicletas_sistema,
  bicicletas_fisico,
  observaciones
`;

const revertir = async (cliente: PoolClient): Promise<void> => {
  await cliente.query('ROLLBACK');
};

export const crearAuditoria = async (
  datos: CrearAuditoria,
): Promise<ResultadoCrearAuditoria> => {
  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    const administrador = await cliente.query<{
      rol: 'Vigilante' | 'Administrador' | 'Ingeniero';
      estado: 'activo' | 'inactivo';
    }>(
      `
        SELECT rol, estado
        FROM colaborador
        WHERE id_colaborador = $1
        FOR SHARE;
      `,
      [datos.id_administrador_auditor],
    );

    const administradorActual = administrador.rows[0];

    if (!administradorActual) {
      await revertir(cliente);
      return { resultado: 'administrador_no_encontrado' };
    }

    if (administradorActual.estado !== 'activo') {
      await revertir(cliente);
      return { resultado: 'administrador_inactivo' };
    }

    if (
      administradorActual.rol !== 'Administrador' &&
      administradorActual.rol !== 'Ingeniero'
    ) {
      await revertir(cliente);
      return { resultado: 'administrador_sin_rol' };
    }

    if (datos.id_operador_auditado) {
      const operador = await cliente.query(
        `
          SELECT id_colaborador
          FROM colaborador
          WHERE id_colaborador = $1
          FOR SHARE;
        `,
        [datos.id_operador_auditado],
      );

      if (!operador.rows[0]) {
        await revertir(cliente);
        return { resultado: 'operador_no_encontrado' };
      }
    }

    if (datos.id_caja) {
      const caja = await cliente.query<{ id_colaborador: string }>(
        `
          SELECT id_colaborador
          FROM caja
          WHERE id_caja = $1
          FOR SHARE;
        `,
        [datos.id_caja],
      );

      const cajaActual = caja.rows[0];

      if (!cajaActual) {
        await revertir(cliente);
        return { resultado: 'caja_no_encontrada' };
      }

      if (
        datos.id_operador_auditado &&
        cajaActual.id_colaborador !== datos.id_operador_auditado
      ) {
        await revertir(cliente);
        return { resultado: 'caja_no_corresponde_operador' };
      }
    }

    const auditoria = await cliente.query<AuditoriaHistorial>(
      `
        INSERT INTO auditoria (
          id_administrador_auditor,
          id_operador_auditado,
          id_caja,
          carros_sistema,
          carros_fisico,
          motos_sistema,
          motos_fisico,
          bicicletas_sistema,
          bicicletas_fisico,
          observaciones
        )
        SELECT
          $1,
          $2::BIGINT,
          $3::BIGINT,
          COUNT(*) FILTER (WHERE tipo_vehiculo = 'Carro')::INTEGER,
          $4,
          COUNT(*) FILTER (WHERE tipo_vehiculo = 'Moto')::INTEGER,
          $5,
          COUNT(*) FILTER (WHERE tipo_vehiculo = 'Bicicleta')::INTEGER,
          $6,
          $7
        FROM servicio
        WHERE estado = 'activo'
        RETURNING
          ${columnasAuditoria},
          carros_fisico - carros_sistema AS diferencia_carros,
          motos_fisico - motos_sistema AS diferencia_motos,
          bicicletas_fisico - bicicletas_sistema AS diferencia_bicicletas;
      `,
      [
        datos.id_administrador_auditor,
        datos.id_operador_auditado ?? null,
        datos.id_caja ?? null,
        datos.carros_fisico,
        datos.motos_fisico,
        datos.bicicletas_fisico,
        datos.observaciones ?? null,
      ],
    );

    await cliente.query('COMMIT');
    return { resultado: 'creada', auditoria: auditoria.rows[0]! };
  } catch (error) {
    await revertir(cliente);
    throw error;
  } finally {
    cliente.release();
  }
};

export const listarHistorialAuditorias = async (
  filtros: FiltrosHistorialAuditorias,
): Promise<AuditoriaHistorial[]> => {
  const condiciones: string[] = [];
  const valores: string[] = [];

  if (filtros.id_operador_auditado) {
    valores.push(filtros.id_operador_auditado);
    condiciones.push(`auditoria.id_operador_auditado = $${valores.length}`);
  }

  if (filtros.id_administrador_auditor) {
    valores.push(filtros.id_administrador_auditor);
    condiciones.push(`auditoria.id_administrador_auditor = $${valores.length}`);
  }

  if (filtros.fecha_desde) {
    valores.push(filtros.fecha_desde);
    condiciones.push(`auditoria.fecha_hora >= $${valores.length}::TIMESTAMP`);
  }

  if (filtros.fecha_hasta) {
    valores.push(filtros.fecha_hasta);
    condiciones.push(`auditoria.fecha_hora <= $${valores.length}::TIMESTAMP`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const resultado = await pool.query<AuditoriaHistorial>(
    `
      SELECT
        ${columnasAuditoria},
        carros_fisico - carros_sistema AS diferencia_carros,
        motos_fisico - motos_sistema AS diferencia_motos,
        bicicletas_fisico - bicicletas_sistema AS diferencia_bicicletas
      FROM auditoria
      ${where}
      ORDER BY fecha_hora DESC, id_auditoria DESC;
    `,
    valores,
  );

  return resultado.rows;
};

export const actualizarObservacionesAuditoria = async (
  id_auditoria: string,
  observaciones: string | null,
): Promise<ResultadoActualizarObservacionesAuditoria> => {
  const resultado = await pool.query<AuditoriaHistorial>(
    `
      UPDATE auditoria
      SET observaciones = $1
      WHERE id_auditoria = $2
      RETURNING
        ${columnasAuditoria},
        carros_fisico - carros_sistema AS diferencia_carros,
        motos_fisico - motos_sistema AS diferencia_motos,
        bicicletas_fisico - bicicletas_sistema AS diferencia_bicicletas;
    `,
    [observaciones, id_auditoria],
  );

  return resultado.rows[0]
    ? { resultado: 'actualizada', auditoria: resultado.rows[0] }
    : { resultado: 'no_encontrada' };
};
