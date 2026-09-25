import type { NavigationItem, UserRole } from '../types/ui'

export const navigationByRole: Record<UserRole, NavigationItem[]> = {
  Vigilante: [{ label: 'Inicio', icon: '⌂' }, { label: 'Servicios', icon: '▣' }, { label: 'Caja', icon: '$' }],
  Administrador: [{ label: 'Inicio', icon: '⌂' }, { label: 'Servicios', icon: '▣' }, { label: 'Cajas', icon: '$' }, { label: 'Auditoría', icon: '✓' }, { label: 'Tarifas', icon: '◇' }, { label: 'Colaboradores', icon: '♙' }, { label: 'Informes', icon: '▤' }],
  Ingeniero: [{ label: 'Inicio', icon: '⌂' }, { label: 'Servicios', icon: '▣' }, { label: 'Cajas', icon: '$' }, { label: 'Auditoría', icon: '✓' }, { label: 'Tarifas', icon: '◇' }, { label: 'Colaboradores', icon: '♙' }, { label: 'Informes', icon: '▤' }],
}

export const availabilityDemo = [
  { label: 'Carros', icon: '▰', occupied: 32, capacity: 70 },
  { label: 'Motos', icon: '◉', occupied: 45, capacity: 100 },
  { label: 'Bicicletas', icon: '⌁', occupied: 18, capacity: 100 },
]

export const movementsDemo = [
  { receipt: 'C-000123', type: 'Carro', plate: 'xyz123', entry: '03:10 PM', status: 'Activo' },
  { receipt: 'M-000456', type: 'Moto', plate: 'abc12d', entry: '02:55 PM', status: 'Activo' },
  { receipt: 'B-000789', type: 'Bicicleta', plate: 'ID: 314567890', entry: '01:20 PM', status: 'Finalizado' },
]
