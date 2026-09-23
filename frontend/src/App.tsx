import { useState } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import { navigationByRole } from './data/dashboardDemo'
import { AppLayout } from './layouts/AppLayout'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { CashPage } from './pages/CashPage'
import { BoxesPage } from './pages/BoxesPage'
import { AuditPage } from './pages/AuditPage'
import { RatesPage } from './pages/RatesPage'
import { CollaboratorsPage } from './pages/CollaboratorsPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RecoveryPage } from './pages/RecoveryPage'
import { ServicesPage } from './pages/ServicesPage'
import './styles/sigp.css'

function AuthenticatedApplication() {
  const { session, iniciarSesion, cerrarSesion, cambiarContrasena } = useAuth()
  const [activeSection, setActiveSection] = useState('Inicio')
  const [showRecovery, setShowRecovery] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [serviceAction, setServiceAction] = useState<'entry' | 'exit' | null>(null)
  const loginFromStart = async (usuario: string, contrasena: string): Promise<void> => {
    setActiveSection('Inicio')
    setServiceAction(null)
    await iniciarSesion(usuario, contrasena)
  }
  const logoutToStart = (): void => {
    setActiveSection('Inicio')
    setServiceAction(null)
    setShowChangePassword(false)
    cerrarSesion()
  }

  if (!session) {
    return showRecovery
      ? <RecoveryPage onBack={() => setShowRecovery(false)} />
      : <LoginPage onLogin={loginFromStart} onRecovery={() => setShowRecovery(true)} />
  }

  if (session.colaborador.requiere_cambio_contrasena || showChangePassword) {
    return <ChangePasswordPage required={session.colaborador.requiere_cambio_contrasena} onSubmit={cambiarContrasena} onCancel={session.colaborador.requiere_cambio_contrasena ? undefined : () => setShowChangePassword(false)} />
  }

  const sectionAllowed = navigationByRole[session.colaborador.rol].some((item) => item.label === activeSection)
  const visibleSection = sectionAllowed ? activeSection : 'Inicio'
  const navigate = (section: string): void => {
    const allowed = navigationByRole[session.colaborador.rol].some((item) => item.label === section)
    setActiveSection(allowed ? section : 'Inicio')
  }
  return <AppLayout session={session.colaborador} activeSection={visibleSection} onNavigate={navigate} onChangePassword={() => setShowChangePassword(true)} onLogout={logoutToStart}>
    {visibleSection === 'Colaboradores'
      ? <CollaboratorsPage token={session.token} currentRole={session.colaborador.rol} />
      : visibleSection === 'Servicios'
        ? <ServicesPage token={session.token} collaboratorId={session.colaborador.id_colaborador} initialAction={serviceAction} onActionConsumed={() => setServiceAction(null)} onDataChanged={() => undefined} />
        : visibleSection === 'Caja'
          ? <CashPage token={session.token} operatorName={session.colaborador.nombre} onDataChanged={() => undefined} />
          : visibleSection === 'Cajas'
            ? <BoxesPage token={session.token} />
            : visibleSection === 'Auditoría'
              ? <AuditPage token={session.token} auditorName={session.colaborador.nombre} />
              : visibleSection === 'Tarifas'
                ? <RatesPage token={session.token} />
            : <DashboardPage activeSection={visibleSection} role={session.colaborador.rol} onNavigate={navigate} token={session.token} collaboratorId={session.colaborador.id_colaborador} onServiceAction={(action) => { setServiceAction(action); navigate('Servicios') }} />}
  </AppLayout>
}

function App() { return <AuthProvider><AuthenticatedApplication /></AuthProvider> }

export default App
