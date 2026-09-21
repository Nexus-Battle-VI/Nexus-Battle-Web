import { issueRealtimeTicket } from './battle/api'
import {
  defaultSocketFactory,
  openRealtimeConnection,
  type RealtimeConnection,
  type RealtimeConnectionState,
  type SocketFactory,
  type TicketProvider,
} from './realtime'

import { initialChatState, reduceChat, type ChatAction, type ChatState } from './chatState'
import {
  sendFrame,
  subscribeFrame,
  unsubscribeFrame,
  validateServerFrame,
  type ChatChannel,
} from './chatProtocol'

/**
 * Estado de la conexion del chat tal como lo ve la persona. `open` significa que
 * el canal esta CONFIRMADO (`chat.subscribed`), no solo que el socket se autentico.
 */
export type ChatConnection = 'connecting' | 'open' | 'reconnecting' | 'disabled'

export interface ChatSnapshot {
  readonly state: ChatState
  readonly connection: ChatConnection
}

export type SendOutcome = 'sent' | 'empty'

export interface ChatSessionOptions {
  readonly channel: ChatChannel
  /** UUID de un comando nuevo. Se inyecta: `crypto.randomUUID` no existe en todos los entornos de prueba. */
  readonly newCommandId: () => string
  /** Solo para pruebas y vistas previas: sustituye el WebSocket real. */
  readonly socketFactory?: SocketFactory
  /** Solo para pruebas y vistas previas: sustituye el `POST /v1/combat/realtime/tickets`. */
  readonly ticketProvider?: TicketProvider
  /** Solo para pruebas y vistas previas: sustituye la comprobacion de que hay sesion. */
  readonly hasSession?: () => boolean
}

/**
 * Sesion de chat de UN canal (HU-13, RF-13): posee el estado y el ciclo de vida de
 * la suscripcion. La conexion (ticket, `auth`, reconexion con espera exponencial)
 * NO es suya: es la conexion compartida de HU-17 (`openRealtimeConnection`), para
 * que exista UNA sola implementacion del protocolo de ADR-020.
 *
 * Es una clase sin React para poder probar el protocolo completo (suscribirse,
 * enviar, recuperar tras una caida) con un socket falso; `useChat` solo la conecta
 * a un componente.
 *
 * Flujo:
 * 1. La conexion compartida pide un ticket, abre el socket, envia `auth` y espera
 *    `auth.ok`. Solo entonces avisa (`onAuthenticated`): el chat nunca se suscribe
 *    antes.
 * 2. `chat.subscribe` con el `lastSeq` ya aplicado: tras una caida recupera solo
 *    lo que le falto.
 * 3. Al llegar `chat.subscribed`, reenvia lo pendiente con el MISMO `commandId`
 *    (el servidor deduplica: entrega sin duplicados).
 * 4. Un salto de `seq` (`resync`) repite `chat.subscribe`.
 *
 * Sin testimonio vigente, o tras tres rechazos `4401` seguidos, la conexion
 * compartida se detiene y el chat queda `disabled`.
 */
export class ChatSession {
  private snapshot: ChatSnapshot = { state: initialChatState, connection: 'connecting' }
  private readonly listeners = new Set<() => void>()
  private link: RealtimeConnection | null = null
  /** Envia por el socket autenticado vigente; `null` mientras no hay uno. */
  private transport: ((payload: unknown) => void) | null = null
  /** La suscripcion vigente esta confirmada: ya se puede escribir en el canal. */
  private subscribed = false
  /** Hay un `chat.subscribe` de resincronizacion en vuelo: no se repite. */
  private resyncing = false

  private readonly options: ChatSessionOptions

  constructor(options: ChatSessionOptions) {
    this.options = options
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
    if (this.link !== null) {
      return
    }

    const { socketFactory, ticketProvider, hasSession } = this.options

    this.link = openRealtimeConnection({
      socketFactory: socketFactory ?? defaultSocketFactory,
      ticketProvider: ticketProvider ?? issueRealtimeTicket,
      ...(hasSession === undefined ? {} : { hasSession }),
      onStateChange: (state) => {
        this.handleConnectionState(state)
      },
      onAuthenticated: (send) => {
        this.handleAuthenticated(send)
      },
      onMessage: (message) => {
        this.handleMessage(message)
      },
      onConnectionLost: () => {
        this.transport = null
        this.subscribed = false
      },
    })
  }

  stop(): void {
    const link = this.link

    if (link === null) {
      return
    }

    this.link = null

    // Salida ordenada: el servidor da de baja la suscripcion sin esperar al cierre.
    this.transport?.(unsubscribeFrame(this.options.channel))
    this.transport = null
    this.subscribed = false
    link.close()
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
    if (this.subscribed) {
      this.transport?.(sendFrame(this.options.channel, commandId, text))
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

  private handleConnectionState(state: RealtimeConnectionState): void {
    switch (state) {
      case 'connecting':
      case 'reconnecting':
        this.update(undefined, state)
        return
      case 'open':
        // Autenticado, pero el canal aun no esta confirmado: `open` llega con `chat.subscribed`.
        return
      case 'failed':
      case 'disabled':
        // Sin testimonio, o el servidor rechaza los tickets: no hay chat hasta volver a entrar.
        this.update(undefined, 'disabled')
    }
  }

  private handleAuthenticated(send: (payload: unknown) => void): void {
    this.transport = send
    this.subscribed = false
    this.resyncing = false
    send(subscribeFrame(this.options.channel, this.snapshot.state.lastSeq))
  }

  private handleMessage(message: unknown): void {
    const frame = validateServerFrame(message)

    if (frame === null) {
      // Un mensaje que no cumple el contrato se ignora: no rompe la conexion.
      return
    }

    this.dispatch({ type: 'frame', frame })

    if (frame.type === 'chat.subscribed') {
      this.subscribed = true
      this.resyncing = false
      this.update(undefined, 'open')
      this.flushPending()

      return
    }

    if (this.snapshot.state.resync && !this.resyncing) {
      this.resyncing = true
      this.transport?.(subscribeFrame(this.options.channel, this.snapshot.state.lastSeq))
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
