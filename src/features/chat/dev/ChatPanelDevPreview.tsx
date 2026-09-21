import { useMemo } from 'react'

import type { SocketFactory } from '@/features/battle-rooms/realtime'

import { ChatPanel } from '../ChatPanel'

/**
 * Vista previa de desarrollo del chat (HU-13).
 *
 * Existe por la misma razon que el resto de `__dev/*`: el chat real necesita
 * una sesion de Cognito y a Combat respondiendo por WebSocket, y el entorno
 * local no puede satisfacer ninguna de las dos sin levantar el stack completo.
 * Este preview monta el componente de PRODUCCION (`ChatPanel`) contra un
 * servidor FALSO que habla el protocolo del contrato
 * (`docs/contracts/hu-13-chat-v1.md`): autentica, entrega historial, acepta
 * mensajes, rechaza por frecuencia y expulsa de una sala.
 *
 * NO ES UNA PUERTA TRASERA: solo existe con `import.meta.env.DEV`, no llega a
 * ningun servicio y NO toca la sesion global: el testimonio de ejemplo se inyecta
 * solo en estos paneles. NO prueba el servidor: eso lo hacen las pruebas de Combat.
 *
 * Como probarlo a mano: escribe un mensaje (se acepta a los ~0,3 s); escribe
 * «demasiado» para ver el rechazo por frecuencia, con «Reintentar» y
 * «Descartar»; escribe `<b>hola</b>` para ver que el HTML se pinta como texto.
 */
type Reply = (frame: Record<string, unknown>, delayMs?: number) => void
type Script = (frame: Record<string, unknown>, reply: Reply) => void

/** Servidor falso: recibe lo que el cliente envia y responde segun el guion. */
class ScriptedSocket extends EventTarget {
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

const ROOM_ID = '11111111-1111-4111-8111-111111111111'
const PREVIEW_TOKEN = 'token-de-vista-previa'

/** Estable entre renders (el panel abre una conexion por cada identidad de esta funcion). */
const previewToken = (): string => PREVIEW_TOKEN

const wire = (
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
const lobbyScript = (): Script => {
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

/** Guion de una sala: al suscribirse entrega historial y poco despues la sala se cancela. */
const cancelledRoomScript = (): Script => (frame, reply) => {
  if (frame.type === 'auth') {
    reply({ type: 'auth.ok' }, 60)
  } else if (frame.type === 'chat.subscribe') {
    reply(
      {
        type: 'chat.subscribed',
        channel: 'room',
        roomId: ROOM_ID,
        upTo: 2,
        truncated: false,
        messages: [
          wire(1, 'Richard', 'Listo cuando quieran.', 4, 'srv-1', true),
          wire(2, 'Invitada', 'Un minuto, equipo mi héroe.', 3, 'srv-2', true),
        ],
      },
      80,
    )
    reply(
      { type: 'chat.unsubscribed', channel: 'room', roomId: ROOM_ID, reason: 'ROOM_NOT_ACTIVE' },
      1_800,
    )
  }
}

export const ChatPanelDevPreview = (): React.JSX.Element => {
  const lobbyFactory = useMemo<SocketFactory>(() => {
    const script = lobbyScript()

    return (url) => new ScriptedSocket(url, script) as unknown as WebSocket
  }, [])

  const roomFactory = useMemo<SocketFactory>(() => {
    const script = cancelledRoomScript()

    return (url) => new ScriptedSocket(url, script) as unknown as WebSocket
  }, [])

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Vista previa del chat (HU-13)</h1>
        <p className="mt-1 text-sm text-muted">
          Componente de producción contra un servidor falso que habla el protocolo del contrato.
          Escribe un mensaje; con «demasiado» ves el rechazo por frecuencia; con{' '}
          <code>&lt;b&gt;hola&lt;/b&gt;</code> ves que el HTML se pinta como texto.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChatPanel
          channel={{ kind: 'lobby' }}
          title="Chat del lobby"
          description="Organiza partidas con otros jugadores."
          socketFactory={lobbyFactory}
          getToken={previewToken}
        />
        <ChatPanel
          channel={{ kind: 'room', roomId: ROOM_ID }}
          title="Chat de la sala"
          description="Solo lo ven los participantes de esta sala. Aquí la sala se cancela a los 2 s."
          socketFactory={roomFactory}
          getToken={previewToken}
        />
      </div>
    </main>
  )
}
