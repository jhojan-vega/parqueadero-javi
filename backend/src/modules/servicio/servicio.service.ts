import type { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { buscarColaboradorPorId } from '../colaborador/colaborador.service';
import type {
  CalculoSalidaServicio,
  CrearEntradaServicio,
  DisponibilidadServicios,
  ResultadoCalculoSalidaServicio,
  ResultadoEntradaServicio,
  Servicio,
  TipoVehiculoServicio,
} from './servicio.types';

const capacidades: Record<TipoVehiculoServicio, number> = {
  Carro: 70,
  Moto: 100,
  Bicicleta: 100,
};

const columnasServicio = `
  id_servicio,
  codigo_recibo,
  placa,
  identificacion_usuario,
  tipo_vehiculo,
  vehiculo_especial,
  fecha_hora_entrada,
  fecha_hora_salida,
  tiempo_total,
  estado,
  valor_calculado,
  id_tarifa,
  id_colaborador_entrada,
  id_colaborador_salida
`;

interface ConteoServicios {
  tipo_vehiculo: TipoVehiculoServicio;
  ocupados: number;
}

const contarServiciosActivos = async (
  cliente: PoolClient,
  tipo_vehiculo: TipoVehiculoServicio,
): Promise<number> => {
  const resultado = await cliente.query<{ ocupados: number }>(
    `
      SELECT COUNT(*)::INTEGER AS ocupados
      FROM servicio
      WHERE tipo_vehiculo = $1 AND estado = 'activo';
    `,
    [tipo_vehiculo],
  );

  return resultado.rows[0]!.ocupados;
};

export const listarServiciosActivos = async (): Promise<Servicio[]> => {
  const resultado = await pool.query<Servicio>(`
    SELECT ${columnasServicio}
    FROM servicio
    WHERE estado = 'activo'
    ORDER BY fecha_hora_entrada ASC, id_servicio ASC;
  `);

  return resultado.rows;
};

export const obtenerDisponibilidadServicios = async (): Promise<DisponibilidadServicios> => {
  const resultado = await pool.query<ConteoServicios>(`
    SELECT tipo_vehiculo, COUNT(*)::INTEGER AS ocupados
    FROM servicio
    WHERE estado = 'activo'
    GROUP BY tipo_vehiculo;
  `);

  const ocupados: Record<TipoVehiculoServicio, number> = {
    Carro: 0,
    Moto: 0,
    Bicicleta: 0,
  };

  for (const fila of resultado.rows) {
    ocupados[fila.tipo_vehiculo] = fila.ocupados;
  }

  return {
    Carro: {
      capacidad: capacidades.Carro,
      ocupados: ocupados.Carro,
      disponibles: capacidades.Carro - ocupados.Carro,
    },
    Moto: {
      capacidad: capacidades.Moto,
      ocupados: ocupados.Moto,
      disponibles: capacidades.Moto - ocupados.Moto,
    },
    Bicicleta: {
      capacidad: capacidades.Bicicleta,
      ocupados: ocupados.Bicicleta,
      disponibles: capacidades.Bicicleta - ocupados.Bicicleta,
    },
  };
};

export const registrarEntradaServicio = async (
  datos: CrearEntradaServicio,
): Promise<ResultadoEntradaServicio> => {
  const colaborador = await buscarColaboradorPorId(datos.id_colaborador_entrada);

  if (!colaborador) {
    return { resultado: 'colaborador_no_encontrado' };
  }

  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');
    await cliente.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      datos.tipo_vehiculo,
    ]);

    const ocupados = await contarServiciosActivos(cliente, datos.tipo_vehiculo);

    if (ocupados >= capacidades[datos.tipo_vehiculo]) {
      await cliente.query('ROLLBACK');
      return { resultado: 'sin_cupo' };
    }

    const tarifa = await cliente.query<{ id_tarifa: string }>(
      `
        SELECT id_tarifa
        FROM tarifa
        WHERE tipo_vehiculo = $1
          AND fecha_hora_inicio <= CURRENT_TIMESTAMP
        ORDER BY fecha_hora_inicio DESC, id_tarifa DESC
        LIMIT 1;
      `,
      [datos.tipo_vehiculo],
    );

    if (!tarifa.rows[0]) {
      await cliente.query('ROLLBACK');
      return { resultado: 'tarifa_no_encontrada' };
    }

    const servicio = await cliente.query<Servicio>(
      `
        INSERT INTO servicio (
          placa,
          identificacion_usuario,
          tipo_vehiculo,
          vehiculo_especial,
          id_tarifa,
          id_colaborador_entrada
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING ${columnasServicio};
      `,
      [
        datos.tipo_vehiculo === 'Bicicleta' ? null : datos.placa,
        datos.tipo_vehiculo === 'Bicicleta'
          ? datos.identificacion_usuario
          : null,
        datos.tipo_vehiculo,
        datos.tipo_vehiculo === 'Bicicleta'
          ? false
          : (datos.vehiculo_especial ?? false),
        tarifa.rows[0].id_tarifa,
        datos.id_colaborador_entrada,
      ],
    );

    await cliente.query('COMMIT');
    return { resultado: 'registrado', servicio: servicio.rows[0]! };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};

export const calcularSalidaServicio = async (
  id_servicio: string,
): Promise<ResultadoCalculoSalidaServicio> => {
  const resultado = await pool.query<CalculoSalidaServicio & { estado: string }>(
    `
      WITH servicio_consultado AS (
        SELECT servicio.*, CURRENT_TIMESTAMP::TIMESTAMP AS fecha_hora_salida_calculada
        FROM servicio
        WHERE id_servicio = $1
      )
      SELECT
        id_servicio,
        codigo_recibo,
        placa,
        identificacion_usuario,
        tipo_vehiculo,
        fecha_hora_entrada,
        fecha_hora_salida_calculada,
        CEIL(
          EXTRACT(
            EPOCH FROM (fecha_hora_salida_calculada - fecha_hora_entrada)
          ) / 60
        )::INTEGER AS tiempo_total_minutos,
        CASE
          WHEN tipo_vehiculo = 'Bicicleta' THEN calcular_tarifa_bicicleta(
            fecha_hora_entrada,
            fecha_hora_salida_calculada,
            id_tarifa
          )
          ELSE calcular_tarifa_servicio(
            fecha_hora_entrada,
            fecha_hora_salida_calculada,
            id_tarifa
          )
        END AS valor_calculado,
        id_tarifa,
        estado
      FROM servicio_consultado;
    `,
    [id_servicio],
  );

  const calculo = resultado.rows[0];

  if (!calculo) {
    return { resultado: 'no_encontrado' };
  }

  if (calculo.estado === 'finalizado') {
    return { resultado: 'finalizado' };
  }

  const { estado: _estado, ...datosCalculo } = calculo;
  return { resultado: 'calculado', calculo: datosCalculo };
};
