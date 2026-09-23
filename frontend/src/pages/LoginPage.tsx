import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/http'
import { ParkingChaviLogo } from '../components/ParkingChaviLogo'

interface LoginPageProps {
  onLogin: (usuario: string, contrasena: string) => Promise<void>
  onRecovery: () => void
}

const messageForLoginError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Usuario o contraseña incorrectos.'
    if (error.status === 403) return 'Este usuario se encuentra inactivo.'
  }
  return 'No fue posible conectar con el sistema. Inténtelo nuevamente.'
}

export function LoginPage({ onLogin, onRecovery }: LoginPageProps) {
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!usuario.trim() || !contrasena) {
      setError('Ingrese su usuario y contraseña.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onLogin(usuario.trim(), contrasena)
    } catch (loginError) {
      setError(messageForLoginError(loginError))
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-screen">
    <section className="auth-brand-panel"><ParkingChaviLogo /></section>
    <section className="auth-form-panel">
      <form className="auth-card" onSubmit={submit} noValidate>
        <span className="auth-eyebrow">ACCESO SEGURO</span>
        <h2>Iniciar sesión</h2>
        <p>Ingrese sus credenciales para continuar en SIGP.</p>
        <label>Usuario<input autoComplete="username" value={usuario} onChange={(event) => setUsuario(event.target.value)} /></label>
        <label>Contraseña<div className="password-field"><input type={visible ? 'text' : 'password'} autoComplete="current-password" value={contrasena} onChange={(event) => setContrasena(event.target.value)} /><button type="button" onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button></div></label>
        {error && <p className="form-message error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Validando…' : 'INICIAR SESIÓN'}</button>
        <button className="text-action" type="button" onClick={onRecovery}>¿Olvidó su contraseña?</button>
      </form>
    </section>
  </main>
}
