import { useEffect, useId, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { SocketFactory, TicketProvider } from './realtime'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import type { ChatMessage } from './chatProtocol'
import type { ChatChannel } from './chatProtocol'
import { CHAT_MAX_LENGTH_HINT, describeChatFailure, describeClosedReason } from './chatDescriptions'
import { useChat } from './useChat'

export interface ChatPanelProps {
  readonly channel: ChatChannel
  readonly title: string
  readonly description?: string
  /**
   * Solo para pruebas y vistas previas (estables entre renders): sustituyen el
   * WebSocket real, el ticket de un solo uso y la comprobacion de que hay sesion.
   */
  readonly socketFactory?: SocketFactory
  readonly ticketProvider?: TicketProvider
  readonly hasSession?: () => boolean
}

const formatTime = (iso: string): string => {
  const date = new Date(iso)

  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

interface MessageRowProps {
  readonly message: ChatMessage
  readonly mine: boolean
}

/**
 * Un mensaje. El texto se pinta SIEMPRE como un nodo de texto de React: nunca
 * como HTML. Combat lo entrega tal cual lo escribio la persona (no lo escapa),
 * asi que esta es la unica barrera contra que un mensaje inyecte marcado.
 */
const MessageRow = ({ message, mine }: MessageRowProps): React.JSX.Element => (
  <li className="flex flex-col gap-0.5 rounded-md px-2 py-1">
    <div className="flex items-baseline gap-2">
      <span className="text-sm font-medium text-ink">
        {message.senderName}
        {mine && <span className="ml-1 text-xs font-normal text-muted">(tú)</span>}
      </span>
      <time dateTime={message.sentAt} className="text-xs text-muted">
        {formatTime(message.sentAt)}
      </time>
    </div>
    <p className="whitespace-pre-wrap break-words text-sm text-ink">{message.text}</p>
  </li>
)

/**
 * Chat de un contexto de Jugar Online (HU-13, RF-13): el lobby (la vista
 * general) o una sala. Presenta y captura; Combat es la autoridad de quien
 * puede leer y escribir, de la longitud y de la frecuencia.
 */
export const ChatPanel = ({
  channel,
  title,
  description,
  socketFactory,
  ticketProvider,
  hasSession,
}: ChatPanelProps): React.JSX.Element => {
  const chat = useChat(channel, {
    ...(socketFactory === undefined ? {} : { socketFactory }),
    ...(ticketProvider === undefined ? {} : { ticketProvider }),
    ...(hasSession === undefined ? {} : { hasSession }),
  })
  const { state, connection } = chat
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const listRef = useRef<HTMLOListElement>(null)

  // Ver siempre lo ultimo: al llegar un mensaje la lista baja sola.
  const total = state.messages.length + state.pending.length

  useEffect(() => {
    const list = listRef.current

    if (list !== null) {
      list.scrollTop = list.scrollHeight
    }
  }, [total])

  const closed = state.closedReason !== null
  const canWrite = connection !== 'disabled' && !closed
  const canSubmit = canWrite && draft.trim().length > 0

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    if (chat.send(draft) === 'sent') {
      setDraft('')
    }
  }

  return (
    <Card title={title} {...(description === undefined ? {} : { description })}>
      <div className="flex flex-col gap-3">
        {connection === 'disabled' && (
          <p role="status" className="text-xs text-muted">
            Inicia sesión para usar el chat.
          </p>
        )}
        {(connection === 'connecting' || connection === 'reconnecting') && (
          <p role="status" className="text-xs text-muted">
            {connection === 'connecting' ? 'Conectando al chat…' : 'Reconectando al chat…'}
          </p>
        )}
        {state.closedReason !== null && (
          <p role="alert" className="text-xs text-danger">
            {describeClosedReason(state.closedReason)}
          </p>
        )}

        <ol
          ref={listRef}
          role="log"
          aria-label={`Mensajes de ${title.toLowerCase()}`}
          aria-live="polite"
          aria-relevant="additions"
          className="flex h-64 flex-col gap-1 overflow-y-auto rounded-md border border-border bg-surface p-2"
        >
          {state.truncated && (
            <li className="px-2 py-1 text-xs text-muted">
              Hay mensajes anteriores que no se muestran.
            </li>
          )}
          {state.messages.length === 0 && state.pending.length === 0 && connection === 'open' && (
            <li className="px-2 py-1 text-xs text-muted">Todavía no hay mensajes.</li>
          )}
          {state.messages.map((message) => (
            <MessageRow
              key={message.messageId}
              message={message}
              mine={state.mine.has(message.commandId)}
            />
          ))}
          {state.pending.map((item) => (
            <li
              key={item.commandId}
              className="flex flex-col gap-1 rounded-md px-2 py-1 opacity-80"
            >
              <p className="whitespace-pre-wrap break-words text-sm text-ink">{item.text}</p>
              {item.status === 'sending' ? (
                <span className="text-xs text-muted">Enviando…</span>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span role="alert" className="text-xs text-danger">
                    {item.failure === null
                      ? 'No se pudo enviar el mensaje.'
                      : describeChatFailure(item.failure)}
                  </span>
                  <Button
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() => {
                      chat.retry(item.commandId)
                    }}
                  >
                    Reintentar
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() => {
                      chat.dismiss(item.commandId)
                    }}
                  >
                    Descartar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            Mensaje
          </label>
          <input
            id={inputId}
            type="text"
            value={draft}
            maxLength={CHAT_MAX_LENGTH_HINT}
            autoComplete="off"
            disabled={!canWrite}
            placeholder="Escribe un mensaje"
            onChange={(event) => {
              setDraft(event.target.value)
            }}
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button type="submit" disabled={!canSubmit}>
            Enviar
          </Button>
        </form>
      </div>
    </Card>
  )
}
