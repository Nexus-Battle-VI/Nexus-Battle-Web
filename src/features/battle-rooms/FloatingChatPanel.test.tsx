import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { TicketProvider } from './realtime'
import { useSession } from '@/shared/session'
import { recordingSocketFactory, type FakeWebSocket } from '@/test/fake-websocket'

import { FloatingChatPanel } from './FloatingChatPanel'
import { LOBBY_CHANNEL } from './chatProtocol'

/**
 * Cierre final del remaster (Objetivo 1-2 del brief): el historial de
 * mensajes se quedaba con muy poco alto dentro del panel flotante -- causa
 * raiz: `Card` (`@/components/ui/Card.tsx`) envuelve sus `children` en un
 * `<div>` propio, sin ninguna clase de flex, que rompia la cadena
 * `flex-column -> flex-1` entre `.br-floating-chat-inner` y el verdadero
 * header/contenido de `ChatPanel.tsx` (ver `display: contents` en
 * `battle-rooms.css`). Estas pruebas NO miden pixeles (jsdom no calcula
 * layout real) -- verifican, de forma estructural, que el composer
 * (input + "Enviar") permanece SIEMPRE en el documento con muchos mensajes,
 * que el historial es la unica zona con scroll (`.br-chat-messages`,
 * `overflow-y: auto`), y que la correccion CSS real (`display: contents`)
 * sigue presente. El chat de la Sala de espera reutiliza EXACTAMENTE este
 * mismo `FloatingChatPanel`/`ChatPanel` (ver `BattleRoomLobbyPage.tsx`), asi
 * que esta misma prueba cubre el Objetivo 2 sin duplicar nada.
 */

const wire = (seq: number): Record<string, unknown> => ({
  messageId: `m-${String(seq)}`,
  channel: 'lobby',
  seq,
  commandId: `c-srv-${String(seq)}`,
  sender: { displayName: 'Beto' },
  text: `mensaje numero ${String(seq)}`,
  sentAt: '2026-09-20T12:00:00.000Z',
})

const subscribed = (messages: readonly Record<string, unknown>[], upTo: number) => ({
  type: 'chat.subscribed',
  channel: 'lobby',
  upTo,
  truncated: false,
  messages,
})

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

const abrirYConectar = async (messageCount: number): Promise<FakeWebSocket> => {
  const { factory, sockets } = recordingSocketFactory()

  render(
    <FloatingChatPanel
      channel={LOBBY_CHANNEL}
      title="Chat del lobby"
      description="Organiza partidas."
      socketFactory={factory}
      ticketProvider={ticketProvider}
    />,
  )

  await userEvent.click(screen.getByRole('button', { name: 'Chat del lobby' }))

  await waitFor(() => {
    expect(sockets).toHaveLength(1)
  })

  const socket = sockets[0]

  if (socket === undefined) {
    throw new Error('el panel no abrio ningun socket')
  }

  const messages = Array.from({ length: messageCount }, (_unused, index) => wire(index + 1))

  act(() => {
    socket.open()
    socket.message({ type: 'auth.ok' })
    socket.message(subscribed(messages, messageCount))
  })

  return socket
}

describe('FloatingChatPanel -- historial con scroll propio, composer siempre visible', () => {
  it('con muchos mensajes, el input y el boton "Enviar" siguen en el documento (nunca se quedan fuera de pantalla)', async () => {
    await abrirYConectar(80)

    expect(screen.getByRole('textbox', { name: 'Mensaje' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument()
    expect(screen.getByText('mensaje numero 80')).toBeInTheDocument()
  })

  it('el historial (role="log") es la unica zona marcada para scroll interno', async () => {
    await abrirYConectar(5)

    const historial = screen.getByRole('log')

    expect(historial).toHaveClass('br-chat-messages')
    expect(historial).toHaveClass('br-scrollbar')
  })

  it('el panel flotante sigue siendo de ancho fijo (nunca crece de ancho por el historial)', async () => {
    await abrirYConectar(3)

    expect(screen.getByRole('dialog')).toHaveClass('br-floating-chat-panel')
  })
})

describe('battle-rooms.css -- la correccion real (display: contents) sigue presente', () => {
  const css = readFileSync(path.join(__dirname, 'battle-rooms.css'), 'utf-8')

  it('.br-floating-chat-inner > div usa display: contents (quita la caja que Card.tsx inserta)', () => {
    const start = css.indexOf('.br-floating-chat-inner > div {')
    const end = css.indexOf('}', start)

    expect(start).toBeGreaterThan(-1)
    expect(css.slice(start, end)).toContain('display: contents')
  })

  it('.br-chat-messages conserva overflow-y: auto', () => {
    const start = css.indexOf('.br-chat-messages {')
    const end = css.indexOf('}', start)

    expect(start).toBeGreaterThan(-1)
    expect(css.slice(start, end)).toContain('overflow-y: auto')
  })
})
