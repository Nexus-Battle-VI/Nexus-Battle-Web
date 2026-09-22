import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { TicketProvider } from './realtime'
import { useSession } from '@/shared/session'
import { recordingSocketFactory, type FakeWebSocket } from '@/test/fake-websocket'

import { ChatPanel } from './ChatPanel'
import { LOBBY_CHANNEL, type ChatChannel } from './chatProtocol'

const ROOM = '11111111-1111-4111-8111-111111111111'

const wire = (seq: number, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  messageId: `m-${String(seq)}`,
  channel: 'lobby',
  seq,
  commandId: `c-srv-${String(seq)}`,
  sender: { displayName: 'Beto' },
  text: `mensaje ${String(seq)}`,
  sentAt: '2026-09-20T12:00:00.000Z',
  ...over,
})

const subscribed = (
  messages: Record<string, unknown>[],
  upTo: number,
  truncated = false,
): Record<string, unknown> => ({
  type: 'chat.subscribed',
  channel: 'lobby',
  upTo,
  truncated,
  messages,
})

/** Estable entre renders (una funcion nueva reabriria la conexion). El ticket real lo pide `issueRealtimeTicket`. */
const ticketProvider = vi.fn<TicketProvider>(() => Promise.resolve('ticket-de-prueba'))

beforeEach(() => {
  ticketProvider.mockClear()
  useSession.setState({
    subject: 'sujeto-ana',
    accessToken: 'jwt-vigente',
    expiresAt: Date.now() + 900_000,
  })
})

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

/**
 * Monta el panel y, por defecto, espera a que se cree el socket: el ticket se pide
 * de forma asincrona antes de abrirlo (conexion compartida de HU-17).
 */
const setup = async (
  channel: ChatChannel = LOBBY_CHANNEL,
  { expectSocket = true }: { readonly expectSocket?: boolean } = {},
) => {
  const { factory, sockets } = recordingSocketFactory()

  render(
    <ChatPanel
      channel={channel}
      title="Chat del lobby"
      description="Organiza partidas."
      socketFactory={factory}
      ticketProvider={ticketProvider}
    />,
  )

  if (expectSocket) {
    await waitFor(() => {
      expect(sockets).toHaveLength(1)
    })
  }

  return { sockets }
}

/** Abre el socket, autentica y confirma la suscripcion con el historial dado. */
const connect = (
  socket: FakeWebSocket | undefined,
  messages: Record<string, unknown>[] = [],
  upTo = 0,
  truncated = false,
): FakeWebSocket => {
  if (socket === undefined) {
    throw new Error('el panel no abrio ningun socket')
  }

  act(() => {
    socket.open()
    socket.message({ type: 'auth.ok' })
    socket.message(subscribed(messages, upTo, truncated))
  })

  return socket
}

describe('ChatPanel', () => {
  describe('conexion', () => {
    it('muestra «Conectando…» hasta que el canal esta confirmado', async () => {
      await setup()

      expect(screen.getByRole('status')).toHaveTextContent('Conectando al chat')
    })

    it('confirmado el canal, avisa de que aun no hay mensajes', async () => {
      const { sockets } = await setup()

      connect(sockets[0])

      expect(screen.queryByText(/Conectando/)).not.toBeInTheDocument()
      expect(screen.getByText('Todavía no hay mensajes.')).toBeInTheDocument()
    })

    it('sin sesion no abre ningun socket y lo explica', async () => {
      useSession.setState({ subject: null, accessToken: null, expiresAt: null })
      const { sockets } = await setup(LOBBY_CHANNEL, { expectSocket: false })

      expect(ticketProvider).not.toHaveBeenCalled()
      expect(sockets).toHaveLength(0)
      expect(screen.getByRole('status')).toHaveTextContent('Inicia sesión para usar el chat')
      expect(screen.getByRole('textbox', { name: 'Mensaje' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    })

    it('si se cae la conexion muestra «Reconectando…»', async () => {
      const { sockets } = await setup()
      const socket = connect(sockets[0])

      act(() => {
        socket.close(1006)
      })

      expect(screen.getByRole('status')).toHaveTextContent('Reconectando al chat')
    })

    it('al desmontar sale del canal y cierra el socket', async () => {
      const { factory, sockets } = recordingSocketFactory()
      const { unmount } = render(
        <ChatPanel
          channel={LOBBY_CHANNEL}
          title="Chat del lobby"
          socketFactory={factory}
          ticketProvider={ticketProvider}
        />,
      )

      await waitFor(() => {
        expect(sockets).toHaveLength(1)
      })

      const socket = connect(sockets[0])

      unmount()

      expect(socket.frames().at(-1)).toEqual({ type: 'chat.unsubscribe', channel: 'lobby' })
      expect(socket.closeCalls).toBe(1)
    })
  })

  describe('mensajes', () => {
    it('muestra el historial con remitente, hora y texto', async () => {
      const { sockets } = await setup()

      connect(sockets[0], [wire(1, { sender: { displayName: 'Ana' }, text: 'quien juega?' })], 1)

      const log = screen.getByRole('log')

      expect(within(log).getByText('Ana')).toBeInTheDocument()
      expect(within(log).getByText('quien juega?')).toBeInTheDocument()
      expect(log.querySelector('time')).toHaveAttribute('datetime', '2026-09-20T12:00:00.000Z')
    })

    it('un mensaje en vivo aparece sin recargar', async () => {
      const { sockets } = await setup()
      const socket = connect(sockets[0])

      act(() => {
        socket.message({ type: 'chat.message', ...wire(1, { text: 'en vivo' }) })
      })

      expect(within(screen.getByRole('log')).getByText('en vivo')).toBeInTheDocument()
    })

    it('el texto se pinta como TEXTO: el HTML de un mensaje no se interpreta', async () => {
      const { sockets } = await setup()
      const attack = '<img src=x onerror="alert(1)"><b>negrita</b>'
      const socket = connect(sockets[0])

      act(() => {
        socket.message({ type: 'chat.message', ...wire(1, { text: attack }) })
      })

      const log = screen.getByRole('log')

      expect(within(log).getByText(attack)).toBeInTheDocument()
      expect(log.querySelector('img')).toBeNull()
      expect(log.querySelector('b')).toBeNull()
    })

    it('avisa cuando habia mas mensajes de los que caben', async () => {
      const { sockets } = await setup()

      connect(sockets[0], [wire(9)], 9, true)

      expect(screen.getByText('Hay mensajes anteriores que no se muestran.')).toBeInTheDocument()
    })

    it('es un registro accesible que anuncia lo nuevo con cortesia', async () => {
      await setup()

      const log = screen.getByRole('log', { name: /mensajes de chat del lobby/i })

      expect(log).toHaveAttribute('aria-live', 'polite')
    })

    it('muestra mensajes de una sala con el mismo panel', async () => {
      const { sockets } = await setup({ kind: 'room', roomId: ROOM })
      const socket = connect(sockets[0])

      act(() => {
        socket.message({
          type: 'chat.subscribed',
          channel: 'room',
          roomId: ROOM,
          upTo: 1,
          truncated: false,
          messages: [wire(1, { channel: 'room', roomId: ROOM, text: 'listos?' })],
        })
      })

      expect(screen.getByText('listos?')).toBeInTheDocument()
      expect(socket.frames()[1]).toEqual({ type: 'chat.subscribe', channel: 'room', roomId: ROOM })
    })
  })

  describe('escribir', () => {
    it('el campo tiene su etiqueta y una pista de longitud de 500', async () => {
      await setup()

      const input = screen.getByRole('textbox', { name: 'Mensaje' })

      expect(input).toHaveAttribute('maxlength', '500')
      expect(input).toHaveAttribute('autocomplete', 'off')
    })

    it('«Enviar» esta deshabilitado con el campo vacio o solo con espacios', async () => {
      const user = userEvent.setup()
      const { sockets } = await setup()

      connect(sockets[0])

      const send = screen.getByRole('button', { name: 'Enviar' })

      expect(send).toBeDisabled()

      await user.type(screen.getByRole('textbox', { name: 'Mensaje' }), '    ')
      expect(send).toBeDisabled()

      await user.type(screen.getByRole('textbox', { name: 'Mensaje' }), 'hola')
      expect(send).toBeEnabled()
    })

    it('enviar manda el comando, vacia el campo y deja el mensaje «Enviando…»', async () => {
      const user = userEvent.setup()
      const { sockets } = await setup()
      const socket = connect(sockets[0])

      await user.type(screen.getByRole('textbox', { name: 'Mensaje' }), 'hola a todos')
      await user.click(screen.getByRole('button', { name: 'Enviar' }))

      const sent = socket.frames().at(-1)

      expect(sent).toMatchObject({ type: 'chat.send', channel: 'lobby', text: 'hola a todos' })
      expect(typeof sent?.commandId).toBe('string')
      expect(screen.getByRole('textbox', { name: 'Mensaje' })).toHaveValue('')
      expect(screen.getByText('Enviando…')).toBeInTheDocument()
    })

    it('Enter envia el mensaje', async () => {
      const user = userEvent.setup()
      const { sockets } = await setup()
      const socket = connect(sockets[0])

      await user.type(screen.getByRole('textbox', { name: 'Mensaje' }), 'con enter{Enter}')

      expect(socket.frames().at(-1)).toMatchObject({ type: 'chat.send', text: 'con enter' })
    })

    it('llega el mensaje propio: desaparece «Enviando…» y se marca «(tú)»', async () => {
      const user = userEvent.setup()
      const { sockets } = await setup()
      const socket = connect(sockets[0])

      await user.type(screen.getByRole('textbox', { name: 'Mensaje' }), 'hola')
      await user.click(screen.getByRole('button', { name: 'Enviar' }))

      const commandId = socket.frames().at(-1)?.commandId

      act(() => {
        socket.message({
          type: 'chat.message',
          ...wire(1, { commandId, sender: { displayName: 'Ana' }, text: 'hola' }),
        })
        socket.message({
          type: 'chat.accepted',
          commandId,
          seq: 1,
          messageId: 'm-1',
          duplicate: false,
        })
      })

      expect(screen.queryByText('Enviando…')).not.toBeInTheDocument()
      expect(within(screen.getByRole('log')).getByText('(tú)')).toBeInTheDocument()
      expect(within(screen.getByRole('log')).getAllByText('hola')).toHaveLength(1)
    })

    it('un mensaje de otra persona NO se marca como propio', async () => {
      const { sockets } = await setup()

      connect(sockets[0], [wire(1)], 1)

      expect(screen.queryByText('(tú)')).not.toBeInTheDocument()
    })
  })

  describe('rechazos del servidor', () => {
    const sendOne = async (socket: FakeWebSocket): Promise<string> => {
      const user = userEvent.setup()

      await user.type(screen.getByRole('textbox', { name: 'Mensaje' }), 'hola')
      await user.click(screen.getByRole('button', { name: 'Enviar' }))

      return String(socket.frames().at(-1)?.commandId)
    }

    it('exceso de frecuencia: explica cuanto esperar y ofrece reintentar o descartar', async () => {
      const { sockets } = await setup()
      const socket = connect(sockets[0])
      const commandId = await sendOne(socket)

      act(() => {
        socket.message({
          type: 'command.rejected',
          command: 'chat.send',
          commandId,
          code: 'RATE_LIMITED',
          retryAfterMs: 2500,
        })
      })

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Estás escribiendo demasiado rápido. Inténtalo de nuevo en 3 s.',
      )
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument()
    })

    it('reintentar reenvia el mismo comando', async () => {
      const user = userEvent.setup()
      const { sockets } = await setup()
      const socket = connect(sockets[0])
      const commandId = await sendOne(socket)

      act(() => {
        socket.message({
          type: 'command.rejected',
          command: 'chat.send',
          commandId,
          code: 'CHAT_UNAVAILABLE',
        })
      })
      await user.click(screen.getByRole('button', { name: 'Reintentar' }))

      const sends = socket.frames().filter((f) => f.type === 'chat.send')

      expect(sends).toHaveLength(2)
      expect(sends[1]).toEqual(sends[0])
    })

    it('descartar quita el mensaje fallido', async () => {
      const user = userEvent.setup()
      const { sockets } = await setup()
      const socket = connect(sockets[0])
      const commandId = await sendOne(socket)

      act(() => {
        socket.message({
          type: 'command.rejected',
          command: 'chat.send',
          commandId,
          code: 'EMPTY_MESSAGE',
        })
      })
      await user.click(screen.getByRole('button', { name: 'Descartar' }))

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByText('hola')).not.toBeInTheDocument()
    })

    it.each([
      ['MESSAGE_TOO_LONG', 'El mensaje supera los 500 caracteres.'],
      ['INVALID_CHARACTERS', 'El mensaje contiene caracteres que no se admiten.'],
      ['CHAT_UNAVAILABLE', 'El chat no está disponible en este momento. Inténtalo de nuevo.'],
      ['ALGO_NUEVO', 'No se pudo enviar el mensaje.'],
    ])('%s se explica en castellano', async (code, expected) => {
      const { sockets } = await setup()
      const socket = connect(sockets[0])
      const commandId = await sendOne(socket)

      act(() => {
        socket.message({
          type: 'command.rejected',
          command: 'chat.send',
          commandId,
          code,
          maxLength: 500,
        })
      })

      expect(screen.getByRole('alert')).toHaveTextContent(expected)
    })
  })

  describe('acceso al canal', () => {
    it('si el servidor expulsa (sale de la sala), lo explica y bloquea el campo', async () => {
      const { sockets } = await setup({ kind: 'room', roomId: ROOM })
      const socket = connect(sockets[0])

      act(() => {
        socket.message({
          type: 'chat.unsubscribed',
          channel: 'room',
          roomId: ROOM,
          reason: 'ROOM_NOT_ACTIVE',
        })
      })

      expect(screen.getByRole('alert')).toHaveTextContent('La sala ya no está activa')
      expect(screen.getByRole('textbox', { name: 'Mensaje' })).toBeDisabled()
    })

    it('si la suscripcion se rechaza porque no es participante, lo dice', async () => {
      const { sockets } = await setup({ kind: 'room', roomId: ROOM })
      const socket = sockets[0]

      act(() => {
        socket?.open()
        socket?.message({ type: 'auth.ok' })
        socket?.message({
          type: 'command.rejected',
          command: 'chat.subscribe',
          code: 'NOT_A_PARTICIPANT',
        })
      })

      expect(screen.getByRole('alert')).toHaveTextContent('No eres participante de esta sala')
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    })
  })

  it('el titulo y la descripcion se muestran', async () => {
    await setup()

    expect(screen.getByRole('heading', { name: 'Chat del lobby' })).toBeInTheDocument()
    expect(screen.getByText('Organiza partidas.')).toBeInTheDocument()
  })

  it('no filtra el testimonio ni el ticket a la interfaz ni a la URL', async () => {
    const { sockets } = await setup()

    connect(sockets[0])

    expect(document.body.textContent).not.toContain('jwt-vigente')
    expect(document.body.textContent).not.toContain('ticket-de-prueba')
    expect(sockets[0]?.url).not.toContain('jwt-vigente')
    expect(sockets[0]?.url).not.toContain('ticket-de-prueba')
  })

  it('HU-21: cuando la sala termina, el chat se cierra con un estado claro y sin reintentos', async () => {
    const { sockets } = await setup()

    connect(sockets[0])
    act(() => {
      sockets[0]?.message({
        type: 'chat.unsubscribed',
        channel: 'lobby',
        reason: 'ROOM_NOT_ACTIVE',
      })
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La sala ya no está activa: su chat está cerrado.',
    )
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })
})
