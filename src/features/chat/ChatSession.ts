import { defaultSocketFactory, type SocketFactory } from '@/features/battle-rooms/realtime'

import { initialChatState, reduceChat, type ChatAction, type ChatState } from './chatState'
import {
  authFrame,
  parseServerFrame,
  sendFrame,
  subscribeFrame,
  unsubscribeFrame,
  type ChatChannel,
} from './protocol'

export type ChatConnection = 'connecting' | 'open' | 'reconnecting' | 'disabled'

export interface ChatSnapshot {
  readonly state: ChatState
  readonly connection: ChatConnection
}

export type SendOutcome = 'sent' | 'empty'

export interface ChatSessionOptions {
  readonly channel: ChatChannel
  readonly url: string
  /** Testimonio vigente, o `null` si no hay sesion. Se pide en CADA conexion. */
  readonly getToken: () => string | null
  /** UUID de un comando nuevo. Se inyecta: `crypto.randomUUID` no existe en todos los entornos de prueba. */
  readonly newCommandId: () => string
  readonly socketFactory?: SocketFactory
}

const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 10_000

/** Cierre del servidor por falta de autenticacion (ADR-020): reintentar con el mismo testimonio no sirve. */
const CLOSE_UNAUTHENTICATED = 4401

/**
 * Sesion de chat de UN canal (HU-13, RF-13): posee el socket, el estado y la
 * reconexion. Es una clase sin React para poder probar el protocolo completo
 * (autenticar, suscribirse, enviar, recuperar tras una caida) con un socket
 * falso; `useChat` solo la conecta a un componente.
 *
 * Flujo:
 * 1. Al abrir el socket envia `auth`. **Espera `auth.ok`** antes de suscribirse:
 *    no depende de que el servidor ordene mensajes enviados seguidos (Combat lo
 *    hace desde HU-13, pero un cliente correcto no lo supone).
 * 2. `chat.subscribe` con el `lastSeq` ya aplicado: tras una caida recupera solo
 *    lo que le falto.
 * 3. Al llegar `chat.subscribed`, reenvia lo pendiente con el MISMO `commandId`
 *    (el servidor deduplica: entrega sin duplicados).
 * 4. Un salto de `seq` (`resync`) repite `chat.subscribe`.
 *
 * Reconexion con espera exponencial acotada (1 s, 2 s, ... 10 s), igual que
 * `useBattleRoomRealtime`. Sin testimonio vigente no se conecta (`disabled`).
 */
export class ChatSession {
  private snapshot: ChatSnapshot = { state: initialChatState, connection: 'connecting' }
  private readonly listeners = new Set<() => void>()
  private readonly socketFactory: SocketFactory
  private socket: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private attempt = 0
  private stopped = true
  /** La suscripcion vigente esta confirmada: ya se puede escribir en el canal. */
  private subscribed = false
  /** Hay un `chat.subscribe` de resincronizacion en vuelo: no se repite. */
  private resyncing = false

  private readonly options: ChatSessionOptions

  constructor(options: ChatSessionOptions) {
    this.options = options
    this.socketFactory = options.socketFactory ?? defaultSocketFactory
  }

  /** Para `useSyncExternalStore`. */
  readonly getSnapshot = (): ChatSnapshot => this.snapshot

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  start(): void {
    if (!this.stopped) {
      return
    }

    this.stopped = false
    this.connect()
  }

  stop(): void {
    this.stopped = true

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    const socket = this.socket

    this.socket = null
    this.subscribed = false

    if (socket !== null) {
      // Salida ordenada: el servidor da de baja la suscripcion sin esperar al cierre.
      if (socket.readyState === 1) {
        socket.send(unsubscribeFrame(this.options.channel))
      }

      socket.close()
    }
  }

  /**
   * Escribe en el canal. El texto se recorta y un mensaje vacio no se envia
   * (evita un viaje inutil; la validacion AUTORITATIVA es la del servidor). Si
   * el canal aun no esta confirmado, el mensaje queda pendiente y sale en cuanto
   * lo este.
   */
  readonly send = (text: string): SendOutcome => {
    const trimmed = text.trim()

    if (trimmed.length === 0) {
      return 'empty'
    }

    const commandId = this.options.newCommandId()

    this.dispatch({ type: 'local.send', commandId, text: trimmed })
    this.transmit(commandId, trimmed)

    return 'sent'
  }

  /** Reintenta un mensaje fallido con el mismo `commandId`. */
  readonly retry = (commandId: string): void => {
    const item = this.snapshot.state.pending.find((p) => p.commandId === commandId)

    if (item?.status !== 'failed') {
      return
    }

    this.dispatch({ type: 'local.retry', commandId })
    this.transmit(commandId, item.text)
  }

  readonly dismiss = (commandId: string): void => {
    this.dispatch({ type: 'local.dismiss', commandId })
  }

  private transmit(commandId: string, text: string): void {
    if (this.subscribed && this.socket?.readyState === 1) {
      this.socket.send(sendFrame(this.options.channel, commandId, text))
    }
    // Si no: queda pendiente y `flushPending` lo envia al confirmarse la suscripcion.
  }

  private flushPending(): void {
    for (const item of this.snapshot.state.pending) {
      if (item.status === 'sending') {
        this.transmit(item.commandId, item.text)
      }
    }
  }

  private connect(): void {
    if (this.stopped) {
      return
    }

    const token = this.options.getToken()

    if (token === null) {
      // Sin testimonio vigente no se puede completar el primer mensaje del protocolo.
      this.update(undefined, 'disabled')

      return
    }

    this.update(undefined, this.attempt === 0 ? 'connecting' : 'reconnecting')
    this.subscribed = false
    this.resyncing = false

    const socket = this.socketFactory(this.options.url)

    this.socket = socket

    socket.addEventListener('open', () => {
      if (this.socket === socket) {
        socket.send(authFrame(token))
      }
    })

    socket.addEventListener('message', (event: MessageEvent) => {
      if (this.socket === socket) {
        this.handleFrame(socket, event.data)
      }
    })

    socket.addEventListener('close', (event: CloseEvent) => {
      if (this.socket !== socket) {
        return
      }

      this.socket = null
      this.subscribed = false

      if (this.stopped) {
        return
      }

      if (event.code === CLOSE_UNAUTHENTICATED) {
        this.update(undefined, 'disabled')

        return
      }

      this.update(undefined, 'reconnecting')

      const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.attempt, RECONNECT_MAX_MS)

      this.attempt += 1
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
      }, delay)
    })

    socket.addEventListener('error', () => {
      // El `close` que sigue a un `error` ya dispara la reconexion.
      socket.close()
    })
  }

  private handleFrame(socket: WebSocket, raw: unknown): void {
    const frame = parseServerFrame(raw)

    if (frame === null) {
      // Un mensaje que no cumple el contrato se ignora: no rompe la conexion.
      return
    }

    if (frame.type === 'auth.ok') {
      socket.send(subscribeFrame(this.options.channel, this.snapshot.state.lastSeq))

      return
    }

    this.dispatch({ type: 'frame', frame })

    if (frame.type === 'chat.subscribed') {
      this.subscribed = true
      this.resyncing = false
      this.attempt = 0
      this.update(undefined, 'open')
      this.flushPending()

      return
    }

    if (this.snapshot.state.resync && !this.resyncing) {
      this.resyncing = true
      socket.send(subscribeFrame(this.options.channel, this.snapshot.state.lastSeq))
    }
  }

  private dispatch(action: ChatAction): void {
    this.update(reduceChat(this.snapshot.state, action), undefined)
  }

  private update(state: ChatState | undefined, connection: ChatConnection | undefined): void {
    const next: ChatSnapshot = {
      state: state ?? this.snapshot.state,
      connection: connection ?? this.snapshot.connection,
    }

    if (next.state === this.snapshot.state && next.connection === this.snapshot.connection) {
      return
    }

    this.snapshot = next

    for (const listener of this.listeners) {
      listener()
    }
  }
}
