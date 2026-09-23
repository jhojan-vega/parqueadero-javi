import { requestApi } from './http'
import type { ActualizarColaboradorInput, ColaboradorResumen, CrearColaboradorInput, EstadoColaborador } from '../modules/colaboradores/colaborador.types'

const withToken = (token: string) => ({ token })

export const listarColaboradores = (token: string): Promise<ColaboradorResumen[]> =>
  requestApi<ColaboradorResumen[]>('/colaboradores', withToken(token))

export const obtenerColaborador = (token: string, id: string): Promise<ColaboradorResumen> =>
  requestApi<ColaboradorResumen>(`/colaboradores/${id}`, withToken(token))

export const crearColaborador = (token: string, datos: CrearColaboradorInput): Promise<ColaboradorResumen> =>
  requestApi<ColaboradorResumen>('/colaboradores', { method: 'POST', token, body: datos })

export const actualizarColaborador = (token: string, id: string, datos: ActualizarColaboradorInput): Promise<ColaboradorResumen> =>
  requestApi<ColaboradorResumen>(`/colaboradores/${id}`, { method: 'PUT', token, body: datos })

export const cambiarEstadoColaborador = (token: string, id: string, estado: EstadoColaborador): Promise<ColaboradorResumen> =>
  requestApi<ColaboradorResumen>(`/colaboradores/${id}/estado`, { method: 'PATCH', token, body: { estado } })

export const restablecerContrasena = (token: string, id: string, contrasenaTemporal: string, confirmacion: string): Promise<{ mensaje: string }> =>
  requestApi<{ mensaje: string }>(`/auth/restablecer/${id}`, {
    method: 'POST',
    token,
    body: {
      contrasena_temporal: contrasenaTemporal,
      confirmacion_contrasena_temporal: confirmacion,
    },
  })
