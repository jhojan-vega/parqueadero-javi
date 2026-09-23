import { navigationByRole } from '../data/dashboardDemo'
import type { UserRole } from '../types/ui'

interface SidebarProps { role: UserRole; activeSection: string; onNavigate: (section: string) => void }

export function Sidebar({ role, activeSection, onNavigate }: SidebarProps) {
  return <aside className="sidebar">
    <div className="brand" aria-label="PARKING CHAVi SIGP">
      <div className="brand-car" aria-hidden="true">▱</div><div><span className="brand-overline">PARKING</span><strong>CHAVi</strong></div>
      <span className="brand-sigp">SIGP</span><small>Sistema Inteligente<br />de Gestión de Parqueaderos</small>
    </div>
    <nav className="main-nav" aria-label="Navegación principal">
      {navigationByRole[role].map((item) => <button className={activeSection === item.label ? 'nav-item active' : 'nav-item'} key={item.label} type="button" onClick={() => onNavigate(item.label)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
    </nav>
    <div className="sidebar-footer"><span>Rionegro, Antioquia</span></div>
  </aside>
}
