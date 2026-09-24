import { useCallback, useEffect, useState } from 'react'
import { formatTurno } from '../utils/formatTurno'
import parkingHero from '../assets/parking-hero.png'
import parkingRobot from '../assets/parking-robot.png'
import { cajasAbiertas } from '../api/caja.api'
import { obtenerDisponibilidad, obtenerServiciosActivos } from '../api/servicios.api'
import { MetricCard } from '../components/MetricCard'
import { Plate } from '../components/Plate'
import { ReceiptCode } from '../components/ReceiptCode'
import { VehicleTypeIndicator } from '../components/VehicleTypeIndicator'
import type { DisponibilidadServicios, ServicioActivo } from '../modules/servicios/servicio.types'
import type { CajaAbiertaDetalle } from '../modules/caja/caja.types'
import type { UserRole } from '../types/ui'

interface DashboardPageProps {
  activeSection: string
  role: UserRole
  onNavigate: (section: string) => void
  token: string
  collaboratorId: string
  onServiceAction: (action: 'entry' | 'exit') => void
}

export function DashboardPage({ activeSection, role, onNavigate, token, collaboratorId, onServiceAction }: DashboardPageProps) {
  const [availability, setAvailability] = useState<DisponibilidadServicios | null>(null)
  const [services, setServices] = useState<ServicioActivo[]>([])
  const [cashBox, setCashBox] = useState<CajaAbiertaDetalle | null>(null)
  const load = useCallback(async () => {
    try {
      const [currentAvailability, active, openBoxes] = await Promise.all([obtenerDisponibilidad(token), obtenerServiciosActivos(token), cajasAbiertas(token)])
      setAvailability(currentAvailability); setServices(active); setCashBox(openBoxes.find((box) => box.id_colaborador === collaboratorId) ?? null)
    } catch { setAvailability(null); setServices([]); setCashBox(null) }
  }, [collaboratorId, token])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])
  if (activeSection !== 'Inicio') {
    return <section className="module-placeholder"><span>Bloque 1</span><h2>{activeSection}</h2><p>La navegación está preparada. Este módulo se desarrollará en los siguientes bloques de Frontend V1.</p><button type="button" onClick={() => onNavigate('Inicio')}>Volver a Inicio</button></section>
  }

  const availabilityItems = availability ? [{ label: 'Carros', icon: '▰', vehicleType: 'Carro' as const, occupied: availability.Carro.ocupados, capacity: availability.Carro.capacidad }, { label: 'Motos', icon: '◉', vehicleType: 'Moto' as const, occupied: availability.Moto.ocupados, capacity: availability.Moto.capacidad }, { label: 'Bicicletas', icon: '⌁', vehicleType: 'Bicicleta' as const, occupied: availability.Bicicleta.ocupados, capacity: availability.Bicicleta.capacidad }] : []
  const totalOccupied = availabilityItems.reduce((sum, item) => sum + item.occupied, 0)
  const totalCapacity = availabilityItems.reduce((sum, item) => sum + item.capacity, 0)
  const totalAvailable = totalCapacity - totalOccupied

  return <div className="dashboard-page">
    <section className="parking-hero" aria-label="PARKING CHAVi">
      <img src={parkingHero} alt="Parqueadero cubierto con vehículos estacionados" />
      <div className="hero-shade" />
      <img className="parking-robot" src={parkingRobot} alt="Asistente robot del parqueadero escaneando" />
      <span className="robot-scan" aria-hidden="true" />
      <div className="hero-copy"><span>PARKING CHAVi</span><h2>Software inteligente<br />a tu servicio</h2></div>
    </section>

    <section className="quick-actions" aria-label="Acciones principales">
      <button type="button" onClick={() => onServiceAction('entry')}><span className="action-ring action-entry">→</span><b>Registrar ingreso</b><small>Nuevo servicio</small></button>
      <button type="button" onClick={() => onServiceAction('exit')}><span className="action-ring action-exit">←</span><b>Registrar salida</b><small>Consultar y cobrar</small></button>
      <button className="secondary-action" type="button" onClick={() => onNavigate(role === 'Vigilante' ? 'Caja' : 'Cajas')}><span className="action-ring action-cash">$</span><b>{role === 'Vigilante' ? 'Mi Caja' : 'Ver cajas'}</b><small>Gestión de turnos</small></button>
    </section>

    <section className="availability-section" aria-labelledby="availability-title">
      <div className="section-heading"><div><span className="eyebrow">OPERACIÓN EN VIVO</span><h2 id="availability-title">Disponibilidad actual</h2></div></div>
      <div className="metrics-grid">
        {availabilityItems.map((item) => <MetricCard key={item.label} {...item} />)}
        <article className="metric-card metric-total"><div className="metric-icon" aria-hidden="true">≡</div><div className="metric-content"><span>Total general</span><strong>{totalAvailable} <em>libres</em></strong><small>{totalOccupied} ocupados de {totalCapacity}</small></div></article>
      </div>
    </section>

    <section className="dashboard-detail-grid">
      <article className="movements-card"><div className="card-title"><div><span className="eyebrow">SERVICIOS</span><h2>Servicios activos</h2></div><button type="button" onClick={() => onNavigate('Servicios')}>Ver servicios</button></div><div className="table-wrap"><table><thead><tr><th>Recibo</th><th>Tipo</th><th>Placa / ID</th><th>Entrada</th><th>Estado</th></tr></thead><tbody>{services.slice(0, 5).map((service) => <tr key={service.id_servicio}><td><ReceiptCode value={service.codigo_recibo} /></td><td><VehicleTypeIndicator type={service.tipo_vehiculo} compact /></td><td>{service.placa ? <Plate value={service.placa} /> : <span className="identifier">{service.identificacion_usuario}</span>}</td><td>{new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(new Date(service.fecha_hora_entrada))}</td><td><span className="status active-status">Activo</span></td></tr>)}{services.length === 0 && <tr><td colSpan={5}>No hay servicios activos.</td></tr>}</tbody></table></div></article>
      {role === 'Vigilante' ? <aside className="attention-card my-cash-dashboard"><span className="eyebrow">OPERACIÓN</span><h2>Mi Caja</h2>{cashBox ? <><div className="cash-dashboard-state"><span className="state-pill activo">Abierta</span><p>Caja #{cashBox.id_caja} · {formatTurno(cashBox.turno)}</p></div><div className="daily-summary"><span>Recaudo actual</span><strong>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cashBox.recaudo_total)}</strong><small>Efectivo {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cashBox.total_efectivo)} · Nequi {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cashBox.total_nequi)}</small></div><button type="button" onClick={() => onNavigate('Caja')}>Ver Mi Caja</button></> : <><div className="empty-state"><span>$</span><p>Sin Caja abierta</p><small>Abra su Caja antes de registrar cobros.</small></div><button type="button" onClick={() => onNavigate('Caja')}>Ir a Caja</button></>}</aside> : <aside className="attention-card"><span className="eyebrow">SUPERVISIÓN</span><h2>Atención / novedades</h2><div className="empty-state"><span>✓</span><p>Sin novedades pendientes</p><small>Los endpoints actuales no permiten identificar alertas pendientes de forma segura.</small></div></aside>}
    </section>
  </div>
}
