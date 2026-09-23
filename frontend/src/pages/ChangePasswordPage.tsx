import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/http'
import { ParkingChaviLogo } from '../components/ParkingChaviLogo'

interface ChangePasswordPageProps {
  required: boolean
  onSubmit: (actual: string, nueva: string, confirmacion: string) => Promise<void>
  onCancel?: () => void
}

const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 401) return 'La contraseña actual es incorrecta.'
  if (error instanceof ApiError && error.status === 400) return 'Verifique los datos ingresados.'
  return 'No fue posible actualizar la contraseña. Inténtelo nuevamente.'
}

export function ChangePasswordPage({ required, onSubmit, onCancel }: ChangePasswordPageProps) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!actual || nueva.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres.')
      return
    }
    if (nueva !== confirmacion) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSubmit(actual, nueva, confirmacion)
    } catch (changeError) {
      setError(errorMessage(changeError))
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-screen compact-auth-screen">
    <section className="auth-brand-panel"><ParkingChaviLogo /></section>
    <section className="auth-form-panel"><div className="auth-flow"><form className="auth-card" onSubmit={submit} noValidate>
      <span className="auth-eyebrow">SEGURIDAD DE LA CUENTA</span>
      <h2>Cambiar contraseña</h2>
      <p>{required ? 'Debe actualizar su contraseña temporal antes de continuar.' : 'Confirme su contraseña actual y establezca una nueva.'}</p>
      <label>Contraseña actual o temporal<div className="password-field"><input type={visible ? 'text' : 'password'} autoComplete="current-password" value={actual} onChange={(event) => setActual(event.target.value)} /><button type="button" onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button></div></label>
      <label>Nueva contraseña<input type={visible ? 'text' : 'password'} autoComplete="new-password" value={nueva} onChange={(event) => setNueva(event.target.value)} /></label>
      <label>Confirmar nueva contraseña<input type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} /></label>
      {error && <p className="form-message error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Actualizando…' : 'ACTUALIZAR CONTRASEÑA'}</button>
      {onCancel && <button className="text-action" type="button" onClick={onCancel}>Cancelar</button>}
    </form></div></section>
  </main>
}
