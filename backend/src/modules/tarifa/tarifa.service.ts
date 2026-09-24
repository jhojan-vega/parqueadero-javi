import { pool } from '../../config/database';
import type { CrearTarifa, Tarifa } from './tarifa.types';

const columnasTarifa = `
  id_tarifa,
  tipo_vehiculo,
  valor_inicial,
  minutos_iniciales,
  valor_fraccion,
  minutos_fraccion,
  valor_pernocta,
  valor_turno_am,
  valor_turno_pm,
  fecha_hora_inicio
`;

export const listarTarifas = async (): Promise<Tarifa[]> => {
  const resultado = await pool.query<Tarifa>(`
    SELECT ${columnasTarifa}
    FROM tarifa
    ORDER BY tipo_vehiculo, fecha_hora_inicio DESC, id_tarifa DESC;
  `);

  return resultado.rows;
};

export const listarTarifasVigentes = async (): Promise<Tarifa[]> => {
  const resultado = await pool.query<Tarifa>(`
    SELECT DISTINCT ON (tipo_vehiculo) ${columnasTarifa}
    FROM tarifa
    WHERE fecha_hora_inicio <= CURRENT_TIMESTAMP
    ORDER BY tipo_vehiculo, fecha_hora_inicio DESC, id_tarifa DESC;
  `);

  return resultado.rows;
};

export const buscarTarifaPorId = async (
  id_tarifa: string,
): Promise<Tarifa | null> => {
  const resultado = await pool.query<Tarifa>(
    `
      SELECT ${columnasTarifa}
      FROM tarifa
      WHERE id_tarifa = $1
      LIMIT 1;
    `,
    [id_tarifa],
  );

  return resultado.rows[0] ?? null;
};

export const crearTarifa = async (datos: CrearTarifa): Promise<Tarifa> => {
  const resultado = await pool.query<Tarifa>(
    `
      INSERT INTO tarifa (
        tipo_vehiculo,
        valor_inicial,
        minutos_iniciales,
        valor_fraccion,
        minutos_fraccion,
        valor_pernocta,
        valor_turno_am,
        valor_turno_pm,
        fecha_hora_inicio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${columnasTarifa};
    `,
    [
      datos.tipo_vehiculo,
      datos.valor_inicial,
      datos.minutos_iniciales,
      datos.valor_fraccion,
      datos.minutos_fraccion,
      null,
      null,
      null,
      datos.fecha_hora_inicio,
    ],
  );

  return resultado.rows[0]!;
};
