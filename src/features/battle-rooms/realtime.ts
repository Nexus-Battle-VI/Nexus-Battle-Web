import { API_BASE_URL } from '@/lib/apiBase'

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
