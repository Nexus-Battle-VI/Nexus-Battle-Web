import { currentAccessToken } from '@/shared/session'

/**
 * Cliente HTTP del producto.
 *
 * Una sola puerta de salida hacia los servicios. Concentra el manejo de
 * errores, de modo que ninguna feature interprete por su cuenta un codigo de
 * estado ni construya una URL a mano.
 *
 * La aplicacion **no conoce la topologia de los servicios**: habla siempre con
 * el mismo origen bajo `/api`, y es el proxy inverso quien enruta. Esa
 * indireccion es lo que permite que la demo corra en una sola maquina y la
 * arquitectura objetivo detras de un balanceador sin cambiar el frontend.
 */
export class HttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }

  /** Un error del cliente es responsabilidad de la peticion, no del servicio. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  /** Falta el testimonio o ya no es valido: hay que volver a iniciar sesion. */
  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /** El testimonio es valido pero no autoriza esta operacion. */
  get isForbidden(): boolean {
    return this.status === 403
  }
}

export interface HttpClientOptions {
  readonly baseUrl?: string
  readonly fetchImpl?: typeof fetch
  /**
   * Origen del testimonio que acompana a cada peticion.
   *
   * Se inyecta en lugar de leerse de un modulo global para que las pruebas
   * puedan ejercitar la cabecera sin montar una sesion completa.
   */
  readonly tokenProvider?: () => string | null
}

export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  readonly body?: unknown
  readonly signal?: AbortSignal
}

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()

  if (text.length === 0) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const messageFrom = (body: unknown, fallback: string): string => {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body

    if (typeof message === 'string') {
      return message
    }

    if (Array.isArray(message)) {
      return message.filter((item) => typeof item === 'string').join(', ')
    }
  }

  return fallback
}

export class HttpClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch | undefined
  private readonly tokenProvider: () => string | null

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '/api'
    this.fetchImpl = options.fetchImpl
    this.tokenProvider = options.tokenProvider ?? ((): string | null => null)
  }

  /**
   * `fetch` se resuelve en cada peticion, no en el constructor.
   *
   * Capturarlo al construir congelaria la implementacion disponible en ese
   * instante, lo que rompe cualquier sustitucion posterior: un polyfill
   * cargado mas tarde, o el doble que instala una prueba sobre un cliente que
   * ya existia como singleton.
   *
   * El Fetch Standard define `fetch` como metodo del Window / Worker. Llamarlo
   * desligado (`const f = globalThis.fetch; f(...)`) lanza Illegal invocation
   * en el navegador. El impl inyectado en pruebas no tiene esa restriccion.
   */
  private get fetcher(): typeof fetch {
    if (this.fetchImpl !== undefined) {
      return this.fetchImpl
    }

    return (input, init) => globalThis.fetch(input, init)
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET'
    const hasBody = options.body !== undefined

    // `exactOptionalPropertyTypes` prohibe asignar `undefined` de forma
    // explicita a una propiedad opcional: el init se compone por partes.
    const init: RequestInit = { method }
    const headers: Record<string, string> = {}

    if (hasBody) {
      if (options.body instanceof FormData) {
        // El navegador pone el boundary. Forzar application/json romperia el
        // multipart del registro (avatar).
        init.body = options.body
      } else {
        headers['content-type'] = 'application/json'
        init.body = JSON.stringify(options.body)
      }
    }

    // El testimonio se resuelve en CADA peticion, no al construir el cliente:
    // la sesion se establece despues de que exista el cliente, y un token
    // capturado al arrancar seria siempre `null`.
    const token = this.tokenProvider()

    if (token !== null) {
      headers.authorization = `Bearer ${token}`
    }

    if (Object.keys(headers).length > 0) {
      init.headers = headers
    }

    if (options.signal !== undefined) {
      init.signal = options.signal
    }

    const response = await this.fetcher(`${this.baseUrl}${path}`, init)

    const body = await parseBody(response)

    if (!response.ok) {
      throw new HttpError(
        response.status,
        messageFrom(body, `La peticion a ${path} fallo con estado ${String(response.status)}.`),
        body,
      )
    }

    return body as T
  }

  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, signal === undefined ? {} : { signal })
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body })
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' })
  }
}

export const httpClient = new HttpClient({ tokenProvider: () => currentAccessToken() })
