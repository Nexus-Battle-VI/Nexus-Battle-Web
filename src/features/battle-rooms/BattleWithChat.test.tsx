import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'

import type { TicketProvider } from './realtime'
import { recordingSocketFactory } from '@/test/fake-websocket'

import { BattleWithChat } from './BattleWithChat'

// La pantalla de batalla es de HU-17 y tiene sus propias pruebas: aqui solo importa
// que se compone con el chat de la sala. Un componente que devuelve texto no necesita JSX.
vi.mock('./battle/BattlePage', () => ({
  BattlePage: () => 'Pantalla de batalla',
}))

const ROOM = '11111111-1111-4111-8111-111111111111'

const ticketProvider: TicketProvider = () => Promise.resolve('ticket-de-prueba')
const hasSession = (): boolean => true

const montar = (path: string, routePath: string) => {
  const { factory, sockets } = recordingSocketFactory()

  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={routePath}
          element={<BattleWithChat chat={{ socketFactory: factory, ticketProvider, hasSession }} />}
        />
      </Routes>
    </MemoryRouter>,
  )

  return { sockets }
}

describe('BattleWithChat (HU-13 sobre la pantalla de batalla de HU-17)', () => {
  it('muestra la pantalla de batalla y, debajo, el chat de ESA sala', async () => {
    const { sockets } = montar(`/play/rooms/${ROOM}/battle`, '/play/rooms/:roomId/battle')

    expect(screen.getByText('Pantalla de batalla')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Chat de la sala' })).toBeInTheDocument()

    await waitFor(() => {
      expect(sockets).toHaveLength(1)
    })

    const socket = sockets[0]

    act(() => {
      socket?.open()
      socket?.message({ type: 'auth.ok' })
    })

    expect(socket?.frames()).toEqual([
      { type: 'auth', ticket: 'ticket-de-prueba' },
      { type: 'chat.subscribe', channel: 'room', roomId: ROOM },
    ])
  })

  it('sin roomId en la ruta no monta el chat (no hay sala de la que hablar)', () => {
    const { sockets } = montar('/batalla', '/batalla')

    expect(screen.getByText('Pantalla de batalla')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Chat de la sala' })).not.toBeInTheDocument()
    expect(sockets).toHaveLength(0)
  })
})
