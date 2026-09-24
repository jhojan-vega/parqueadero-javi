import type { TipoVehiculo } from '../modules/servicios/servicio.types'

const labels: Record<TipoVehiculo, string> = {
  Carro: 'Carro',
  Moto: 'Moto',
  Bicicleta: 'Bicicleta',
}

interface VehicleTypeIndicatorProps {
  type: TipoVehiculo
  compact?: boolean
  label?: string
}

export function VehicleTypeIcon({ type }: { type: TipoVehiculo }) {
  if (type === 'Carro') {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 28l4-11h26l4 11v10H7V28Z" /><path d="M14 17l4-6h12l4 6" /><circle cx="14" cy="38" r="4" /><circle cx="34" cy="38" r="4" /><path d="M7 28h34M17 25h14" /></svg>
  }

  if (type === 'Moto') {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="13" cy="35" r="6" /><circle cx="36" cy="35" r="6" /><path d="M13 35l9-13h8l6 13M22 22l-5 0m13 0 5-5M22 22l7 13H17l5-13m7-5h6" /></svg>
  }

  return <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="12" cy="35" r="7" /><circle cx="37" cy="35" r="7" /><path d="M12 35l10-17 8 17H12m10-17h8l7 17M22 18l-4-5m4 5 5 0m-9-5h-5" /></svg>
}

export function VehicleTypeIndicator({ type, compact = false, label }: VehicleTypeIndicatorProps) {
  return <span className={`vehicle-type-indicator vehicle-type-indicator--${type.toLowerCase()}${compact ? ' vehicle-type-indicator--compact' : ''}`}><span className="vehicle-type-icon"><VehicleTypeIcon type={type} /></span><span>{label ?? labels[type]}</span></span>
}
