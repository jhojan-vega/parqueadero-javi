import { VehicleTypeIcon } from './VehicleTypeIndicator'
import type { TipoVehiculo } from '../modules/servicios/servicio.types'

interface MetricCardProps { label: string; icon: string; occupied: number; capacity: number; vehicleType?: TipoVehiculo }
export function MetricCard({ label, icon, occupied, capacity, vehicleType }: MetricCardProps) {
  const available = capacity - occupied; const percentage = Math.round((occupied / capacity) * 100)
  return <article className="metric-card"><div className={`metric-icon${vehicleType ? ` vehicle-type-icon vehicle-type-icon--${vehicleType.toLowerCase()}` : ''}`} aria-hidden="true">{vehicleType ? <VehicleTypeIcon type={vehicleType} /> : icon}</div><div className="metric-content"><span>{label}</span><strong>{available} <em>libres</em></strong><small>{occupied} ocupados de {capacity}</small><div className="progress-row"><div className="progress-track"><span style={{ width: `${percentage}%` }} /></div><b>{percentage}%</b></div></div></article>
}
