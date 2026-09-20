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
  requiere_cambio_contrasena: boolean;
}

export interface TokenAutenticacion {
  id_colaborador: string;
  rol: RolColaborador;
}

export interface CambiarContrasena { contrasena_actual: string; nueva_contrasena: string; confirmacion_nueva_contrasena: string; }

export type ResultadoLogin =
  | {
      resultado: 'autenticado';
      colaborador: ColaboradorAutenticado;
    }
  | { resultado: 'credenciales_invalidas' }
  | { resultado: 'inactivo' };
