import { useContext } from 'react'
import { AuthContext } from './auth.context'
import type { AuthContextValue } from './auth.context'

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider.')
  return context
}
