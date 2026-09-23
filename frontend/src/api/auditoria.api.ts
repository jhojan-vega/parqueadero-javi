import { requestApi } from './http'
import type { AuditoriaHistorial, CrearAuditoriaInput, FiltrosAuditoria } from '../modules/auditoria/auditoria.types'

const queryString = (filters: FiltrosAuditoria): string => {
  const parameters = new URLSearchParams()
  if (filters.id_operador_auditado) parameters.set('id_operador_auditado', filters.id_operador_auditado)
  if (filters.id_administrador_auditor) parameters.set('id_administrador_auditor', filters.id_administrador_auditor)
  if (filters.fecha_desde) parameters.set('fecha_desde', filters.fecha_desde)
  if (filters.fecha_hasta) parameters.set('fecha_hasta', filters.fecha_hasta)
  const value = parameters.toString()
  return value ? `?${value}` : ''
}

export const crearAuditoria = (token: string, data: CrearAuditoriaInput): Promise<AuditoriaHistorial> =>
  requestApi<AuditoriaHistorial>('/auditorias', { method: 'POST', token, body: data })

export const historialAuditorias = (token: string, filters: FiltrosAuditoria = {}): Promise<AuditoriaHistorial[]> =>
  requestApi<AuditoriaHistorial[]>(`/auditorias${queryString(filters)}`, { token })

export const actualizarObservacionesAuditoria = (token: string, id: string, observaciones: string | null): Promise<AuditoriaHistorial> =>
  requestApi<AuditoriaHistorial>(`/auditorias/${id}/observaciones`, { method: 'PATCH', token, body: { observaciones } })
