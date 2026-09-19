import { compare } from 'bcryptjs';
import { pool } from '../../config/database';
import type { Colaborador } from '../colaborador/colaborador.types';
import type {
  ColaboradorAutenticado,
  CredencialesLogin,
  ResultadoLogin,
} from './auth.types';

type ColaboradorConHash = Colaborador;

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
  };

  return {
    resultado: 'autenticado',
    colaborador: colaboradorAutenticado,
  };
};
