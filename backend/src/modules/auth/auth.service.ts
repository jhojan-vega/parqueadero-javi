import { compare, hash } from 'bcryptjs';
import { createHash, randomInt } from 'crypto';
import { pool } from '../../config/database';
import type { Colaborador } from '../colaborador/colaborador.types';
import type {
  ColaboradorAutenticado,
  CredencialesLogin,
  ResultadoLogin,
} from './auth.types';

type ColaboradorConHash = Colaborador;
const hashCodigo = (codigo: string) => createHash('sha256').update(codigo).digest('hex');

export const iniciarSesion = async (
  credenciales: CredencialesLogin,
): Promise<ResultadoLogin> => {
  const resultado = await pool.query<ColaboradorConHash>(
    `
      SELECT
        id_colaborador,
        nombre,
        documento,
        usuario,
        correo,
        password_hash,
        requiere_cambio_contrasena,
        rol,
        estado
      FROM colaborador
      WHERE usuario = $1
      LIMIT 1;
    `,
    [credenciales.usuario],
  );

  const colaborador = resultado.rows[0];

  if (!colaborador) {
    return { resultado: 'credenciales_invalidas' };
  }

  const contrasenaCorrecta = await compare(
    credenciales.contrasena,
    colaborador.password_hash,
  );

  if (!contrasenaCorrecta) {
    return { resultado: 'credenciales_invalidas' };
  }

  if (colaborador.estado === 'inactivo') {
    return { resultado: 'inactivo' };
  }

  const colaboradorAutenticado: ColaboradorAutenticado = {
    id_colaborador: colaborador.id_colaborador,
    nombre: colaborador.nombre,
    usuario: colaborador.usuario,
    correo: colaborador.correo,
    rol: colaborador.rol,
    estado: colaborador.estado,
    requiere_cambio_contrasena: colaborador.requiere_cambio_contrasena,
  };

  return {
    resultado: 'autenticado',
    colaborador: colaboradorAutenticado,
  };
};

export const obtenerEstadoSeguridad = async (id_colaborador: string) => {
  const r = await pool.query<{ estado: 'activo' | 'inactivo'; requiere_cambio_contrasena: boolean }>('SELECT estado, requiere_cambio_contrasena FROM colaborador WHERE id_colaborador = $1', [id_colaborador]);
  return r.rows[0] ?? null;
};

export const cambiarContrasena = async (id: string, actual: string, nueva: string): Promise<boolean> => {
  const r = await pool.query<{ password_hash: string }>('SELECT password_hash FROM colaborador WHERE id_colaborador = $1', [id]);
  if (!r.rows[0] || !(await compare(actual, r.rows[0].password_hash))) return false;
  await pool.query('UPDATE colaborador SET password_hash = $1, requiere_cambio_contrasena = FALSE WHERE id_colaborador = $2', [await hash(nueva, 12), id]);
  return true;
};

export const solicitarRecuperacion = async (correo: string): Promise<{ codigo?: string; disponible: boolean }> => {
  const r = await pool.query<{ id_colaborador: string }>("SELECT id_colaborador FROM colaborador WHERE correo = $1 AND estado = 'activo' AND rol IN ('Administrador','Ingeniero')", [correo]);
  if (!r.rows[0]) return { disponible: false };
  const codigo = String(randomInt(100000, 1000000));
  await pool.query('UPDATE recuperacion_contrasena SET invalidado = TRUE WHERE id_colaborador = $1 AND utilizado = FALSE AND invalidado = FALSE', [r.rows[0].id_colaborador]);
  await pool.query("INSERT INTO recuperacion_contrasena(id_colaborador,codigo_hash,fecha_hora_expiracion) VALUES($1,$2,CURRENT_TIMESTAMP + INTERVAL '10 minutes')", [r.rows[0].id_colaborador, hashCodigo(codigo)]);
  return { codigo, disponible: true };
};

export const confirmarRecuperacion = async (correo: string, codigo: string, nueva: string): Promise<boolean> => {
  const c = await pool.connect();
  try { await c.query('BEGIN'); const u = await c.query<{ id_colaborador: string }>("SELECT id_colaborador FROM colaborador WHERE correo=$1 AND estado='activo' AND rol IN ('Administrador','Ingeniero') FOR SHARE", [correo]); if (!u.rows[0]) { await c.query('ROLLBACK'); return false; }
    const r = await c.query<{ id_recuperacion: string; codigo_hash: string; intentos: number; fecha_hora_expiracion: Date }>('SELECT * FROM recuperacion_contrasena WHERE id_colaborador=$1 AND utilizado=FALSE AND invalidado=FALSE ORDER BY fecha_hora_creacion DESC LIMIT 1 FOR UPDATE', [u.rows[0].id_colaborador]); const x=r.rows[0];
    if (!x || x.fecha_hora_expiracion < new Date() || x.codigo_hash !== hashCodigo(codigo)) { if (x) await c.query('UPDATE recuperacion_contrasena SET intentos=intentos+1, invalidado=(intentos+1)>=3 OR fecha_hora_expiracion<CURRENT_TIMESTAMP WHERE id_recuperacion=$1',[x.id_recuperacion]); await c.query('COMMIT'); return false; }
    await c.query('UPDATE colaborador SET password_hash=$1, requiere_cambio_contrasena=FALSE WHERE id_colaborador=$2',[await hash(nueva,12),u.rows[0].id_colaborador]); await c.query('UPDATE recuperacion_contrasena SET utilizado=TRUE WHERE id_recuperacion=$1',[x.id_recuperacion]); await c.query('COMMIT'); return true;
  } catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
};

export const restablecerContrasena = async (id: string, temporal: string, solicitante: 'Administrador' | 'Ingeniero'): Promise<{ rol?: string; permitido?: boolean }> => {
  const r=await pool.query<{ rol: string }>('SELECT rol FROM colaborador WHERE id_colaborador=$1',[id]); if(!r.rows[0]) return {};
  const permitido = (solicitante === 'Administrador' && r.rows[0].rol === 'Vigilante') || (solicitante === 'Ingeniero' && r.rows[0].rol !== 'Ingeniero');
  if (!permitido) return { ...r.rows[0], permitido: false };
  await pool.query('UPDATE colaborador SET password_hash=$1, requiere_cambio_contrasena=TRUE WHERE id_colaborador=$2',[await hash(temporal,12),id]); return { ...r.rows[0], permitido: true };
};
