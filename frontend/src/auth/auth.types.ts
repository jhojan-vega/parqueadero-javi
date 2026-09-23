import type { UserRole } from '../types/ui'

export interface AuthenticatedUser {
  id_colaborador: string
  nombre: string
  usuario: string
  correo: string | null
  rol: UserRole
  estado: 'activo' | 'inactivo'
  requiere_cambio_contrasena: boolean
}

export interface AuthSession {
  token: string
  colaborador: AuthenticatedUser
}

export interface LoginResponse extends AuthSession {}
