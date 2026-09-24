export type EstadoCaja = 'abierta' | 'cerrada' | 'pendiente'
export type TurnoCaja = 'AM' | 'PM' | 'T1' | 'T2' | 'T3'

export interface CajaAbiertaDetalle {
  id_caja: string
  turno: TurnoCaja
  fecha_hora_apertura: string
  fecha_hora_cierre: string | null
  recaudo_total: number
  total_efectivo: number
  total_nequi: number
  efectivo_real: number | null
  faltante_caja: number
  sobrante_caja: number
  id_colaborador: string
  estado: EstadoCaja
  novedades?: string | null
  id_administrador_regulariza?: string | null
  fecha_hora_regularizacion?: string | null
}

export interface VerificacionCaja { recaudo_total: number; total_efectivo: number; total_nequi: number; efectivo_real: number; faltante_caja: number; sobrante_caja: number }

export interface CajaHistorial extends CajaAbiertaDetalle {
  nombre_colaborador: string
}

export interface ResumenFaltantes {
  id_colaborador: string
  nombre: string
  cantidad_cajas_con_faltante: number
  total_faltantes: number
}

export interface FiltrosCaja {
  id_colaborador?: string
  fecha_desde?: string
  fecha_hasta?: string
}
