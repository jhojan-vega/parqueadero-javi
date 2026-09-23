import { requestApi } from './http'
import type { LoginResponse } from '../auth/auth.types'

export const login = (usuario: string, contrasena: string): Promise<LoginResponse> =>
  requestApi<LoginResponse>('/auth/login', { method: 'POST', body: { usuario, contrasena } })

export const cambiarContrasena = (
  token: string,
  contrasenaActual: string,
  nuevaContrasena: string,
  confirmacionNuevaContrasena: string,
): Promise<{ mensaje: string }> =>
  requestApi<{ mensaje: string }>('/auth/cambiar-contrasena', {
    method: 'PATCH',
    token,
    body: {
      contrasena_actual: contrasenaActual,
      nueva_contrasena: nuevaContrasena,
      confirmacion_nueva_contrasena: confirmacionNuevaContrasena,
    },
  })

export const solicitarRecuperacion = (correo: string): Promise<{ mensaje: string }> =>
  requestApi<{ mensaje: string }>('/auth/recuperacion/solicitar', { method: 'POST', body: { correo } })

export const confirmarRecuperacion = (
  correo: string,
  codigo: string,
  nuevaContrasena: string,
  confirmacionNuevaContrasena: string,
): Promise<{ mensaje: string }> =>
  requestApi<{ mensaje: string }>('/auth/recuperacion/confirmar', {
    method: 'POST',
    body: {
      correo,
      codigo,
      nueva_contrasena: nuevaContrasena,
      confirmacion_nueva_contrasena: confirmacionNuevaContrasena,
    },
  })
