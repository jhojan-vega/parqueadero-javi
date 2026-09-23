import { createContext } from 'react'
import type { AuthSession } from './auth.types'

export interface AuthContextValue {
  session: AuthSession | null
  iniciarSesion: (usuario: string, contrasena: string) => Promise<void>
  cerrarSesion: () => void
  cambiarContrasena: (actual: string, nueva: string, confirmacion: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
