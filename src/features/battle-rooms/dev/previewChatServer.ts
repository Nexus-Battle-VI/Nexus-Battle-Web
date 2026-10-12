import type { SocketFactory, TicketProvider } from '../realtime'

/**
 * Servidor de chat FALSO de las vistas previas de desarrollo (HU-13): habla el
 * protocolo del contrato (`docs/contracts/hu-13-chat-v1.md`) sin salir del
 * navegador. Lo usan `ChatPanelDevPreview` y, desde EN-031, el chat de la
 * vista previa de batalla. Solo existe con `import.meta.env.DEV`.
 */
type Reply = (frame: Record<string, unknown>, delayMs?: number) => void
export type Script = (frame: Record<string, unknown>, reply: Reply) => void

/** Servidor falso: recibe lo que el cliente envia y responde segun el guion. */
export class ScriptedSocket extends EventTarget {
  readyState = 0
  readonly url: string
  private readonly script: Script

  constructor(url: string, script: Script) {
    super()
    this.url = url
    this.script = script

    setTimeout(() => {
      this.readyState = 1
      this.dispatchEvent(new Event('open'))
    }, 150)
  }

  send(data: string): void {
    const frame = JSON.parse(data) as Record<string, unknown>

    this.script(frame, (reply, delayMs = 0) => {
      setTimeout(() => {
        if (this.readyState === 1) {
          this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(reply) }))
        }
      }, delayMs)
    })
  }

  close(): void {
    this.readyState = 3
    this.dispatchEvent(new CloseEvent('close', { code: 1000 }))
  }
}

export const ROOM_ID = '11111111-1111-4111-8111-111111111111'
const PREVIEW_TICKET = 'ticket-de-vista-previa'

/** Estables entre renders (el panel abre una conexion por cada identidad de estas funciones). */
export const previewTicket: TicketProvider = () => Promise.resolve(PREVIEW_TICKET)
export const previewHasSession = (): boolean => true

export const wire = (
  seq: number,
  senderName: string,
  text: string,
  minutesAgo: number,
  commandId = `srv-${String(seq)}`,
  room = false,
): Record<string, unknown> => ({
  messageId: `m-${String(seq)}`,
  channel: room ? 'room' : 'lobby',
  ...(room ? { roomId: ROOM_ID } : {}),
  seq,
  commandId,
  sender: { displayName: senderName },
  text,
  sentAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
})

/** Guion del lobby: interactivo. */
export const lobbyScript = (): Script => {
  let seq = 3

  return (frame, reply) => {
    if (frame.type === 'auth') {
      reply({ type: 'auth.ok' }, 60)
    } else if (frame.type === 'chat.subscribe') {
      reply(
        {
          type: 'chat.subscribed',
          channel: 'lobby',
          upTo: 3,
          truncated: false,
          messages: [
            wire(1, 'Richard', '¿Alguien para un 1 vs 1?', 6),
            wire(2, 'Invitada', 'Yo entro, creo la sala ahora.', 5),
            wire(3, 'Mateo', 'Guerrero Tanque contra Mago de Fuego, ¿quién se anima?', 2),
          ],
        },
        80,
      )
    } else if (frame.type === 'chat.send') {
      const text = String(frame.text)
      const commandId = String(frame.commandId)

      if (text.toLowerCase().includes('demasiado')) {
        reply(
          {
            type: 'command.rejected',
            command: 'chat.send',
            commandId,
            code: 'RATE_LIMITED',
            retryAfterMs: 4200,
          },
          200,
        )

        return
      }

      seq += 1
      reply(
        {
          type: 'chat.message',
          messageId: `m-${String(seq)}`,
          channel: 'lobby',
          seq,
          commandId,
          sender: { displayName: 'Tú (vista previa)' },
          text,
          sentAt: new Date().toISOString(),
        },
        300,
      )
      reply(
        { type: 'chat.accepted', commandId, seq, messageId: `m-${String(seq)}`, duplicate: false },
        340,
      )
    }
  }
}

/** EN-031: el mismo servidor falso del lobby, para el chat de la vista previa de batalla. */
export const createPreviewChatSocketFactory = (): SocketFactory => {
  const script = lobbyScript()

  return (url) => new ScriptedSocket(url, script) as unknown as WebSocket
}
