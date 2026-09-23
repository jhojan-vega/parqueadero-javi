import { requestApi } from './http'
import type { CajaAbiertaDetalle, CajaHistorial, FiltrosCaja, ResumenFaltantes, VerificacionCaja } from '../modules/caja/caja.types'

export const cajasAbiertas = (token: string): Promise<CajaAbiertaDetalle[]> => requestApi<CajaAbiertaDetalle[]>('/cajas/abiertas', { token })
export const abrirCaja = (token: string): Promise<CajaAbiertaDetalle> => requestApi<CajaAbiertaDetalle>('/cajas/apertura', { method: 'POST', token, body: {} })
export const verificarCaja = (token: string, id: string, efectivoReal: number): Promise<VerificacionCaja> => requestApi<VerificacionCaja>(`/cajas/${id}/verificar`, { method: 'POST', token, body: { efectivo_real: efectivoReal } })
export const cerrarCaja = (token: string, id: string, efectivoReal: number): Promise<CajaAbiertaDetalle> => requestApi<CajaAbiertaDetalle>(`/cajas/${id}/cierre`, { method: 'POST', token, body: { efectivo_real: efectivoReal } })

const queryString = (filters: FiltrosCaja): string => {
  const parameters = new URLSearchParams()
  if (filters.id_colaborador) parameters.set('id_colaborador', filters.id_colaborador)
  if (filters.fecha_desde) parameters.set('fecha_desde', filters.fecha_desde)
  if (filters.fecha_hasta) parameters.set('fecha_hasta', filters.fecha_hasta)
  const query = parameters.toString()
  return query ? `?${query}` : ''
}

export const historialCajas = (token: string, filters: FiltrosCaja = {}): Promise<CajaHistorial[]> =>
  requestApi<CajaHistorial[]>(`/cajas/historial${queryString(filters)}`, { token })

export const resumenFaltantes = (token: string, filters: FiltrosCaja = {}): Promise<ResumenFaltantes[]> =>
  requestApi<ResumenFaltantes[]>(`/cajas/resumen-faltantes${queryString(filters)}`, { token })

export const obtenerCaja = (token: string, id: string): Promise<CajaAbiertaDetalle> =>
  requestApi<CajaAbiertaDetalle>(`/cajas/${id}`, { token })

export const actualizarNovedadesCaja = (token: string, id: string, novedades: string | null): Promise<CajaAbiertaDetalle> =>
  requestApi<CajaAbiertaDetalle>(`/cajas/${id}/novedades`, { method: 'PATCH', token, body: { novedades } })
