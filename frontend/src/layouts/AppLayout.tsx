import type { ReactNode } from 'react'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import type { AuthenticatedUser } from '../auth/auth.types'

interface AppLayoutProps { children: ReactNode; session: AuthenticatedUser; activeSection: string; onNavigate: (section: string) => void; onChangePassword: () => void; onLogout: () => void }
export function AppLayout({ children, session, activeSection, onNavigate, onChangePassword, onLogout }: AppLayoutProps) { return <div className="app-shell"><Sidebar role={session.rol} activeSection={activeSection} onNavigate={onNavigate} /><div className="app-content"><Header title={activeSection} session={session} onChangePassword={onChangePassword} onLogout={onLogout} /><main>{children}</main></div></div> }
