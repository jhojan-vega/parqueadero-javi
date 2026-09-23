const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api'
let unauthorizedHandler: (() => void) | null = null

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  public readonly status: number

  constructor(
    status: number,
    message: string,
  ) {
    super(message)
    this.status = status
  }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown
  token?: string
}

export const requestApi = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { body, token, ...init } = options
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null) as { mensaje?: string; message?: string } | T | null

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'mensaje' in payload && typeof payload.mensaje === 'string'
      ? payload.mensaje
      : payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'No fue posible completar la solicitud.'
    if (response.status === 401 && /token inv[aá]lido|usuario no autorizado/i.test(message)) unauthorizedHandler?.()
    throw new ApiError(response.status, message)
  }

  return payload as T
}
