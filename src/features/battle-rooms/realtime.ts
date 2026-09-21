import { HttpError } from '@/lib/http'
import { API_BASE_URL } from '@/lib/apiBase'
import { currentAccessToken } from '@/shared/session'

/**
 * Construccion de la URL del WebSocket nativo de Combat (ADR-020,
 * `Nexus-Battle-Infrastructure`). El Caddy del entorno expone
 * `/api/v1/combat*` como wildcard hacia el servicio de Combat, asi que
 * `/api/v1/combat/realtime` ya queda cubierto sin cambios de infraestructura
 * — mismo prefijo `API_BASE_URL` que usa `httpClient` para HTTP, solo que
 * aqui el esquema es `ws`/`wss` en vez de `http`/`https`.
 */
export const buildRealtimeUrl = (origin: string = globalThis.location.origin): string => {
  const url = new URL(origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `${API_BASE_URL}/v1/combat/realtime`
  url.search = ''
  url.hash = ''
  return url.toString()
}

/**
 * Fabrica del socket. Se inyecta (mismo patron que `HttpClientOptions.fetchImpl`
 * en `lib/http.ts`) para que las pruebas puedan sustituir el WebSocket real
 * por un doble sin depender de una conexion de red.
 */
export type SocketFactory = (url: string) => WebSocket

export const defaultSocketFactory: SocketFactory = (url) => new WebSocket(url)

/** Forma minima de los mensajes que el servidor emite (ver protocolo del ADR-020). */
export interface RealtimeServerMessage {
  readonly type: string
  readonly roomId?: string
  readonly status?: string
  readonly version?: number
  readonly seq?: number
  readonly code?: string
}

export const parseRealtimeMessage = (raw: unknown): RealtimeServerMessage | null => {
  if (typeof raw !== 'string') {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      typeof parsed.type === 'string'
    ) {
      return parsed as RealtimeServerMessage
    }

    return null
  } catch {
    // Un mensaje que no es JSON valido se ignora: no rompe la conexion.
    return null
  }
}

/** Estado de la conexion en tiempo real, tal como lo ve la interfaz. */
export type RealtimeConnectionState = 'connecting' | 'open' | 'reconnecting' | 'failed' | 'disabled'

/** Ticket de un solo uso para abrir el WebSocket (ADR-020): `POST /v1/combat/realtime/tickets`. */
export type TicketProvider = () => Promise<string>

export interface RealtimeConnectionOptions {
  readonly socketFactory: SocketFactory
  readonly ticketProvider: TicketProvider
  /** Se invoca en cada conexion YA AUTENTICADA (`auth.ok`), con una funcion para enviar comandos. */
  readonly onAuthenticated: (send: (payload: unknown) => void) => void
  /** Mensaje ya parseado (el objeto completo; los consumidores lo validan con sus guardas de tipo). */
  readonly onMessage: (message: RealtimeServerMessage) => void
  readonly onStateChange: (state: RealtimeConnectionState) => void
  /** Se invoca al perder la conexion ya autenticada (para dejar de considerar el estado sincronizado). */
  readonly onConnectionLost?: () => void
  /**
   * Solo para pruebas y vistas previas: sustituye la comprobacion de que hay sesion
   * (por defecto, un testimonio vigente en el almacen de sesion). Debe ser estable
   * entre llamadas.
   */
  readonly hasSession?: () => boolean
}

export interface RealtimeConnection {
  readonly close: () => void
}

/** Hay un testimonio vigente con el que pedir un ticket. */
const hasActiveSession = (): boolean => currentAccessToken() !== null

const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 10_000
/** Cierre del servidor por falta de ticket valido (ADR-020). */
const CLOSE_UNAUTHENTICATED = 4401
/** Intentos consecutivos rechazados con 4401 antes de darse por vencido. */
const MAX_AUTH_FAILURES = 3

/**
 * Conexion en tiempo real con Combat (ADR-020), compartida por el lobby y la
 * batalla para que exista UNA sola implementacion del protocolo:
 *
 *   ticket (HTTP, JWT en la cabecera) -> WebSocket SIN credenciales en la URL ->
 *   primer mensaje `{"type":"auth","ticket"}` -> `auth.ok` -> el consumidor envia
 *   `subscribe` o `resume`.
 *
 * El JWT NUNCA viaja por el socket. Cada (re)conexion pide un ticket NUEVO (un
 * ticket es de un solo uso y caduca a los 30 s). Reconexion con backoff
 * exponencial acotado (1 s, 2 s, 4 s... hasta 10 s); tres rechazos `4401`
 * consecutivos detienen los intentos (`failed`) en lugar de reintentar sin fin.
 * Limpieza completa (temporizador + socket) al cerrar.
 */
export const openRealtimeConnection = (options: RealtimeConnectionOptions): RealtimeConnection => {
  let cancelled = false
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  let authFailures = 0
  const isCancelled = (): boolean => cancelled

  const scheduleReconnect = (): void => {
    if (cancelled) {
      return
    }

    options.onStateChange('reconnecting')
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS)

    attempt += 1
    reconnectTimer = setTimeout(() => {
      void connect()
    }, delay)
  }

  const connect = async (): Promise<void> => {
    if (cancelled) {
      return
    }

    if (!(options.hasSession ?? hasActiveSession)()) {
      // Sin testimonio vigente no se puede pedir un ticket: se deja de intentar.
      options.onStateChange('disabled')
      return
    }

    options.onStateChange(attempt === 0 ? 'connecting' : 'reconnecting')

    let ticket: string

    try {
      ticket = await options.ticketProvider()
    } catch (error: unknown) {
      if (error instanceof HttpError && error.isUnauthorized) {
        options.onStateChange('disabled')
        return
      }

      scheduleReconnect()
      return
    }

    // Pudo cerrarse mientras se esperaba el ticket (`cancelled` cambia por la
    // clausura de `close()`): se consulta por funcion para que el analisis de
    // flujo no lo de por inmutable.
    if (isCancelled()) {
      return
    }

    const ws = options.socketFactory(buildRealtimeUrl())
    let authenticated = false

    socket = ws

    ws.addEventListener('open', () => {
      if (!cancelled) {
        ws.send(JSON.stringify({ type: 'auth', ticket }))
      }
    })

    ws.addEventListener('message', (event: MessageEvent) => {
      if (cancelled) {
        return
      }

      const message = parseRealtimeMessage(event.data)

      if (message === null) {
        return
      }

      if (message.type === 'auth.ok') {
        authenticated = true
        authFailures = 0
        attempt = 0
        options.onStateChange('open')
        options.onAuthenticated((payload) => {
          ws.send(JSON.stringify(payload))
        })
        return
      }

      options.onMessage(message)
    })

    ws.addEventListener('close', (event: Event) => {
      socket = null

      if (cancelled) {
        return
      }

      if (authenticated) {
        options.onConnectionLost?.()
      } else if ((event as CloseEvent).code === CLOSE_UNAUTHENTICATED) {
        authFailures += 1

        if (authFailures >= MAX_AUTH_FAILURES) {
          options.onStateChange('failed')
          return
        }
      }

      scheduleReconnect()
    })

    ws.addEventListener('error', () => {
      // El `close` que sigue a un `error` ya dispara la reconexion; aqui solo
      // se evita dejar el socket a medio abrir.
      ws.close()
    })
  }

  void connect()

  return {
    close: () => {
      cancelled = true

      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer)
      }

      socket?.close()
    },
  }
}
