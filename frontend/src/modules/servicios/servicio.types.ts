export type TipoVehiculo = 'Carro' | 'Moto' | 'Bicicleta'
export type MedioPago = 'Efectivo' | 'Nequi'

export interface ServicioActivo {
  id_servicio: string
  codigo_recibo: string
  placa: string | null
  identificacion_usuario: string | null
  tipo_vehiculo: TipoVehiculo
  vehiculo_especial: boolean
  fecha_hora_entrada: string
  estado: 'activo'
}

export interface DisponibilidadTipo { capacidad: number; ocupados: number; disponibles: number }
export interface DisponibilidadServicios { Carro: DisponibilidadTipo; Moto: DisponibilidadTipo; Bicicleta: DisponibilidadTipo }

export interface CalculoSalida { id_servicio: string; codigo_recibo: string; placa: string | null; identificacion_usuario: string | null; tipo_vehiculo: TipoVehiculo; fecha_hora_entrada: string; fecha_hora_salida_calculada: string; tiempo_total_minutos: number; valor_calculado: number; id_tarifa: string }
export interface CajaAbierta { id_caja: string; turno: 'AM' | 'PM' | 'T1' | 'T2' | 'T3'; id_colaborador: string; estado: 'abierta' }
export interface ReciboSalida { id_servicio: string; codigo_recibo: string; placa: string | null; identificacion_usuario: string | null; tipo_vehiculo: TipoVehiculo; fecha_hora_entrada: string; fecha_hora_salida: string; tiempo_total: number; valor_calculado: number; valor_pagado: number; medio_pago: MedioPago; id_pago: string; id_caja: string; turno: 'AM' | 'PM' | 'T1' | 'T2' | 'T3' }

export const textoServicio = (servicio: Pick<ServicioActivo | CalculoSalida | ReciboSalida, 'placa' | 'identificacion_usuario'>): string => servicio.placa ?? servicio.identificacion_usuario ?? 'Sin identificación'
