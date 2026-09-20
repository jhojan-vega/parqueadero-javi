import { pool } from '../../config/database';
import { hash } from 'bcryptjs';
import type {
  ActualizarColaborador,
  Colaborador,
  CrearColaborador,
  EstadoColaborador,
} from './colaborador.types';

type ColaboradorConsulta = Omit<
  Colaborador,
  'password_hash' | 'requiere_cambio_contrasena'
>;

export const listarColaboradores = async (): Promise<ColaboradorConsulta[]> => {
  const resultado = await pool.query<ColaboradorConsulta>(`
    SELECT
      id_colaborador,
      nombre,
      documento,
      usuario,
      correo,
      rol,
      estado
    FROM colaborador
    ORDER BY id_colaborador;
  `);

  return resultado.rows;
};

export const buscarColaboradorPorId = async (
  id_colaborador: string,
): Promise<ColaboradorConsulta | null> => {
  const resultado = await pool.query<ColaboradorConsulta>(
    `
      SELECT
        id_colaborador,
        nombre,
        documento,
        usuario,
        correo,
        rol,
        estado
      FROM colaborador
      WHERE id_colaborador = $1
      LIMIT 1;
    `,
    [id_colaborador],
  );

  return resultado.rows[0] ?? null;
};

export const crearColaborador = async (
  datos: CrearColaborador,
): Promise<ColaboradorConsulta> => {
  const passwordHash = await hash(datos.contrasena, 12);
  const resultado = await pool.query<ColaboradorConsulta>(
    `
      INSERT INTO colaborador (
        nombre,
        documento,
        usuario,
        correo,
        password_hash,
        rol,
        estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id_colaborador,
        nombre,
        documento,
        usuario,
        correo,
        rol,
        estado;
    `,
    [
      datos.nombre,
      datos.documento,
      datos.usuario,
      datos.correo ?? null,
      passwordHash,
      datos.rol,
      datos.estado ?? 'activo',
    ],
  );

  return resultado.rows[0]!;
};

export const actualizarColaborador = async (
  id_colaborador: string,
  datos: ActualizarColaborador,
): Promise<ColaboradorConsulta | null> => {
  const asignaciones: string[] = [];
  const valores: Array<string | null> = [];

  if (datos.nombre !== undefined) {
    valores.push(datos.nombre);
    asignaciones.push(`nombre = $${valores.length}`);
  }

  if (datos.documento !== undefined) {
    valores.push(datos.documento);
    asignaciones.push(`documento = $${valores.length}`);
  }

  if (datos.usuario !== undefined) {
    valores.push(datos.usuario);
    asignaciones.push(`usuario = $${valores.length}`);
  }

  if (datos.correo !== undefined) {
    valores.push(datos.correo);
    asignaciones.push(`correo = $${valores.length}`);
  }

  if (datos.rol !== undefined) {
    valores.push(datos.rol);
    asignaciones.push(`rol = $${valores.length}`);
  }

  if (asignaciones.length === 0) {
    return null;
  }

  valores.push(id_colaborador);
  const resultado = await pool.query<ColaboradorConsulta>(
    `
      UPDATE colaborador
      SET ${asignaciones.join(', ')}
      WHERE id_colaborador = $${valores.length}
      RETURNING
        id_colaborador,
        nombre,
        documento,
        usuario,
        correo,
        rol,
        estado;
    `,
    valores,
  );

  return resultado.rows[0] ?? null;
};

export const cambiarEstadoColaborador = async (
  id_colaborador: string,
  estado: EstadoColaborador,
): Promise<ColaboradorConsulta | null> => {
  const resultado = await pool.query<ColaboradorConsulta>(
    `
      UPDATE colaborador
      SET estado = $1
      WHERE id_colaborador = $2
      RETURNING
        id_colaborador,
        nombre,
        documento,
        usuario,
        correo,
        rol,
        estado;
    `,
    [estado, id_colaborador],
  );

  return resultado.rows[0] ?? null;
};
