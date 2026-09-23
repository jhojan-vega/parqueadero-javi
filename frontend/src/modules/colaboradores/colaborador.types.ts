import type { UserRole } from '../../types/ui'

export type EstadoColaborador = 'activo' | 'inactivo'
export type RolAdministrable = Exclude<UserRole, 'Ingeniero'>

export interface ColaboradorResumen {
  id_colaborador: string
  nombre: string
  documento: string
  usuario: string
  correo: string | null
  rol: UserRole
  estado: EstadoColaborador
}

export interface CrearColaboradorInput {
  nombre: string
  documento: string
  usuario: string
  correo: string | null
  contrasena: string
  rol: RolAdministrable
  estado: EstadoColaborador
}

export interface ActualizarColaboradorInput {
  nombre: string
  documento: string
  usuario: string
  correo: string | null
  rol: RolAdministrable
}

export const etiquetaRol = (rol: UserRole): string =>
  rol === 'Ingeniero' ? 'Superadministrador' : rol
