export type RolColaborador =
  | 'Vigilante'
  | 'Administrador'
  | 'Ingeniero';

export type EstadoColaborador = 'activo' | 'inactivo';

export interface Colaborador {
  id_colaborador: string;
  nombre: string;
  documento: string;
  usuario: string;
  correo: string | null;
  password_hash: string;
  requiere_cambio_contrasena: boolean;
  rol: RolColaborador;
  estado: EstadoColaborador;
}

export interface CrearColaborador {
  nombre: string;
  documento: string;
  usuario: string;
  correo?: string | null;
  contrasena: string;
  rol: RolColaborador;
  estado?: EstadoColaborador;
}

export interface ActualizarColaborador {
  nombre?: string;
  documento?: string;
  usuario?: string;
  correo?: string | null;
  rol?: RolColaborador;
}
