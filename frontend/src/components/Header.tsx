import { useEffect, useState } from 'react'
import type { AuthenticatedUser } from '../auth/auth.types'

interface HeaderProps { title: string; session: AuthenticatedUser; onChangePassword: () => void; onLogout: () => void }
const formatDate = (date: Date) => new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
const formatTime = (date: Date) => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date)

export function Header({ title, session, onChangePassword, onLogout }: HeaderProps) {
  const [now, setNow] = useState(() => new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const roleLabel = session.rol === 'Ingeniero' ? 'Superadministrador' : session.rol
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer) }, [])
  return <header className="header">
    <button className="menu-toggle" type="button" aria-label="Abrir navegación">☰</button>
    <div className="header-context"><span className="home-mark" aria-hidden="true">⌂</span><h1>{title}</h1></div><div className="header-spacer" />
    <div className="header-date">{formatDate(now)}</div><time className="header-time" dateTime={now.toISOString()}>{formatTime(now)}</time>
    <div className="account-menu"><button className="account-button" type="button" aria-label="Menú de cuenta" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span className="avatar" aria-hidden="true">●</span><span className="account-copy"><strong>{session.nombre}</strong><small>{roleLabel}</small></span><span className="chevron" aria-hidden="true">⌄</span></button>{menuOpen && <div className="account-dropdown"><button type="button" onClick={() => { setMenuOpen(false); onChangePassword() }}>Cambiar contraseña</button><button type="button" onClick={onLogout}>Cerrar sesión</button></div>}</div>
  </header>
}
