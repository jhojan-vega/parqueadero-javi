import type { EstadoColaborador, RolColaborador } from '../colaborador/colaborador.types';

export interface CredencialesLogin {
  usuario: string;
  contrasena: string;
}

export interface ColaboradorAutenticado {
  id_colaborador: string;
  nombre: string;
  usuario: string;
  correo: string | null;
  rol: RolColaborador;
  estado: EstadoColaborador;
}

export interface TokenAutenticacion {
  id_colaborador: string;
  rol: RolColaborador;
}

export type ResultadoLogin =
  | {
      resultado: 'autenticado';
      colaborador: ColaboradorAutenticado;
    }
  | { resultado: 'credenciales_invalidas' }
  | { resultado: 'inactivo' };
