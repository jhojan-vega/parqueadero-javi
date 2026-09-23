import { requestApi } from './http'
import type { CajaAbierta, CalculoSalida, DisponibilidadServicios, MedioPago, ReciboSalida, ServicioActivo, TipoVehiculo } from '../modules/servicios/servicio.types'

export const obtenerServiciosActivos = (token: string): Promise<ServicioActivo[]> => requestApi<ServicioActivo[]>('/servicios/activos', { token })
export const obtenerDisponibilidad = (token: string): Promise<DisponibilidadServicios> => requestApi<DisponibilidadServicios>('/servicios/disponibilidad', { token })
export const obtenerCajasAbiertas = (token: string): Promise<CajaAbierta[]> => requestApi<CajaAbierta[]>('/cajas/abiertas', { token })
export const registrarEntrada = (token: string, data: { tipo_vehiculo: TipoVehiculo; placa?: string; identificacion_usuario?: string; vehiculo_especial?: boolean }): Promise<ServicioActivo> => requestApi<ServicioActivo>('/servicios/entrada', { method: 'POST', token, body: data })
export const calcularSalida = (token: string, id: string): Promise<CalculoSalida> => requestApi<CalculoSalida>(`/servicios/${id}/salida-calculo`, { token })
export const registrarSalida = (token: string, id: string, idCaja: string, medioPago: MedioPago, referenciaNequi?: string): Promise<ReciboSalida> => requestApi<ReciboSalida>(`/servicios/${id}/salida`, { method: 'POST', token, body: { id_caja: idCaja, medio_pago: medioPago, ...(medioPago === 'Nequi' && referenciaNequi ? { referencia_nequi: referenciaNequi } : {}) } })
