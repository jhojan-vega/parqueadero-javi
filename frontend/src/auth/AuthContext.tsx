import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { cambiarContrasena as cambiarContrasenaApi, login as loginApi } from '../api/auth.api'
import { ApiError, setUnauthorizedHandler } from '../api/http'
import { clearSession, loadSession, saveSession } from './session'
import type { AuthSession } from './auth.types'
import { AuthContext } from './auth.context'
import type { AuthContextValue } from './auth.context'

const esRechazoDeToken = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 401 && /token inv[aá]lido|usuario no autorizado/i.test(error.message)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession())

  const cerrarSesion = (): void => {
    clearSession()
    setSession(null)
  }

  useEffect(() => {
    setUnauthorizedHandler(cerrarSesion)
    return () => setUnauthorizedHandler(null)
  })

  const value = useMemo<AuthContextValue>(() => ({
    session,
    iniciarSesion: async (usuario, contrasena) => {
      const nuevaSesion = await loginApi(usuario, contrasena)
      saveSession(nuevaSesion)
      setSession(nuevaSesion)
    },
    cerrarSesion,
    cambiarContrasena: async (actual, nueva, confirmacion) => {
      if (!session) throw new ApiError(401, 'La sesión ha finalizado.')
      try {
        await cambiarContrasenaApi(session.token, actual, nueva, confirmacion)
        const actualizada: AuthSession = {
          ...session,
          colaborador: { ...session.colaborador, requiere_cambio_contrasena: false },
        }
        saveSession(actualizada)
        setSession(actualizada)
      } catch (error) {
        if (esRechazoDeToken(error)) cerrarSesion()
        throw error
      }
    },
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
