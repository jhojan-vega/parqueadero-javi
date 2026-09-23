import type { AuthSession } from './auth.types'

const sessionKey = 'sigp.auth.session'

export const loadSession = (): AuthSession | null => {
  try {
    const stored = window.sessionStorage.getItem(sessionKey)
    if (!stored) return null

    const session = JSON.parse(stored) as AuthSession
    if (!session.token || !session.colaborador?.id_colaborador || !session.colaborador.rol) return null
    return session
  } catch {
    return null
  }
}

export const saveSession = (session: AuthSession): void => {
  window.sessionStorage.setItem(sessionKey, JSON.stringify(session))
}

export const clearSession = (): void => {
  window.sessionStorage.removeItem(sessionKey)
}
