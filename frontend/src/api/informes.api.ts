import { requestApi } from './http'
export const consultarInformes = (token: string, desde: string, hasta: string) => requestApi<any>(`/informes?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`, { token })
