import { useState, type FormEvent } from 'react'
import { confirmarRecuperacion, solicitarRecuperacion } from '../api/auth.api'
import { ApiError } from '../api/http'
import { ParkingChaviLogo } from '../components/ParkingChaviLogo'

interface RecoveryPageProps { onBack: () => void }

const messageForError = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 401) return 'El código es incorrecto o ya venció.'
  if (error instanceof ApiError && error.status === 503) return 'La recuperación por correo no está disponible actualmente.'
  return 'No fue posible completar la solicitud. Inténtelo nuevamente.'
}

export function RecoveryPage({ onBack }: RecoveryPageProps) {
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [phase, setPhase] = useState<'request' | 'confirm'>('request')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const requestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!correo.trim()) { setError('Ingrese el correo registrado.'); return }
    setLoading(true); setError(''); setMessage('')
    try {
      const response = await solicitarRecuperacion(correo.trim())
      setMessage(response.mensaje)
      setPhase('confirm')
    } catch (requestError) { setError(messageForError(requestError)) } finally { setLoading(false) }
  }

  const confirmCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(codigo)) { setError('Ingrese el código de 6 dígitos.'); return }
    if (nueva.length < 4) { setError('La nueva contraseña debe tener al menos 4 caracteres.'); return }
    if (nueva !== confirmacion) { setError('Las contraseñas nuevas no coinciden.'); return }
    setLoading(true); setError(''); setMessage('')
    try {
      const response = await confirmarRecuperacion(correo.trim(), codigo, nueva, confirmacion)
      setMessage(response.mensaje)
    } catch (confirmError) { setError(messageForError(confirmError)) } finally { setLoading(false) }
  }

  return <main className="auth-screen compact-auth-screen"><section className="auth-brand-panel"><ParkingChaviLogo /></section><section className="auth-form-panel"><div className="auth-flow"><form className="auth-card" onSubmit={phase === 'request' ? requestCode : confirmCode} noValidate>
    <span className="auth-eyebrow">RECUPERACIÓN DE ACCESO</span><h2>Restablecer contraseña</h2>
    <p>Administradores e Ingenieros pueden recuperar su acceso mediante correo y código de seguridad.</p>
    <p className="auth-note">Si su cuenta es Vigilante, solicite al Administrador el restablecimiento de su contraseña.</p>
    <label>Correo registrado<input type="email" autoComplete="email" value={correo} disabled={phase === 'confirm'} onChange={(event) => setCorreo(event.target.value)} /></label>
    {phase === 'confirm' && <><label>Código de 6 dígitos<input inputMode="numeric" autoComplete="one-time-code" value={codigo} onChange={(event) => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label><label>Nueva contraseña<input type="password" autoComplete="new-password" value={nueva} onChange={(event) => setNueva(event.target.value)} /></label><label>Confirmar nueva contraseña<input type="password" autoComplete="new-password" value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} /></label></>}
    {error && <p className="form-message error" role="alert">{error}</p>}{message && <p className="form-message success" role="status">{message}</p>}
    <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Procesando…' : phase === 'request' ? 'SOLICITAR CÓDIGO' : 'ACTUALIZAR CONTRASEÑA'}</button>
    <button className="text-action" type="button" onClick={onBack}>Volver al inicio de sesión</button>
  </form></div></section></main>
}
