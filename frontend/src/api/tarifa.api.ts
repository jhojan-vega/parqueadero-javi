import { requestApi } from './http'
import type { CrearTarifaInput, Tarifa } from '../modules/tarifa/tarifa.types'
export const tarifas = (token: string): Promise<Tarifa[]> => requestApi<Tarifa[]>('/tarifas', { token })
export const tarifasVigentes = (token: string): Promise<Tarifa[]> => requestApi<Tarifa[]>('/tarifas/vigentes', { token })
export const crearTarifa = (token: string, data: CrearTarifaInput): Promise<Tarifa> => requestApi<Tarifa>('/tarifas', { method: 'POST', token, body: data })
