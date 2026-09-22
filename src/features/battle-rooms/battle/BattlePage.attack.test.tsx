import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import type { SocketFactory, TicketProvider } from '../realtime'
import { BattlePage } from './BattlePage'
import {
  ANA,
  attackRejected,
  basicAttackResolved,
  battle,
  BRUNO,
  combatBattle,
  MISS,
  ROOM_ID,
  snapshot,
} from './fixtures'

class FakeSocket extends EventTarget {
  readonly url: string
  readonly sent: string[] = []

  constructor(url: string) {
    super()
    this.url = url
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.dispatchEvent(new Event('close'))
  }

  open(): void {
    this.dispatchEvent(new Event('open'))
  }

  message(data: unknown): void {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }))
  }

  attacks(): Record<string, unknown>[] {
    return this.sent
      .map((raw) => JSON.parse(raw) as Record<string, unknown>)
      .filter((command) => command.type === 'attack')
  }
}

const ANA_ID = 'sujeto-ana'
const BRUNO_ID = 'sujeto-bruno'

const montar = (subject: string) => {
  const sockets: FakeSocket[] = []
  const socketFactory: SocketFactory = (url) => {
    const socket = new FakeSocket(url)
    sockets.push(socket)
    return socket as unknown as WebSocket
  }
  const ticketProvider = vi.fn<TicketProvider>(() => Promise.resolve('ticket-1'))
  let ids = 0
  const createCommandId = vi.fn(() => `cmd-${String((ids += 1))}`)

  useSession.setState({ subject, accessToken: 'jwt-vigente', expiresAt: Date.now() + 900_000 })
  renderWithProviders(
    <Routes>
      <Route
        path="/play/rooms/:roomId/battle"
        element={
          <BattlePage
            socketFactory={socketFactory}
            ticketProvider={ticketProvider}
            createCommandId={createCommandId}
          />
        }
      />
    </Routes>,
    { route: `/play/rooms/${ROOM_ID}/battle` },
  )

  return { sockets, createCommandId }
}

const connect = async (sockets: FakeSocket[]): Promise<FakeSocket> => {
  await waitFor(() => {
    expect(sockets).toHaveLength(1)
  })
  const socket = sockets[0]!

  act(() => {
    socket.open()
    socket.message({ type: 'auth.ok' })
  })
  return socket
}

const deliver = (socket: FakeSocket, ...messages: Record<string, unknown>[]): void => {
  act(() => {
    for (const message of messages) {
      socket.message(message)
    }
  })
}

const ready = (seq: number): Record<string, unknown> => ({
  type: 'resume.ok',
  roomId: ROOM_ID,
  seq,
})

/** Bruno (B/0) y Ana (A/0), 44/44; el turno es de Ana (posicion 1). */
const enBatalla = async (subject: string) => {
  const harness = montar(subject)
  const socket = await connect(harness.sockets)

  deliver(socket, snapshot(1, 'IN_BATTLE', combatBattle(1)), ready(1))

  return { ...harness, socket }
}

/** Resultado del ataque de Ana a Bruno: Bruno 44 -> 38 y el turno pasa a Bruno. */
const anaGolpea = (commandId: string): Record<string, unknown> =>
  basicAttackResolved({
    seq: 2,
    commandId,
    attacker: ANA,
    target: BRUNO,
    before: 44,
    after: 38,
    completedPosition: 1,
    view: combatBattle(2, [
      [38, 44],
      [44, 44],
    ]),
  })

const resultado = (): HTMLElement =>
  screen.getByRole('status', { name: 'Resultado de la última acción' })

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.useRealTimers()
})

describe('BattlePage — HU-18: del clic al resultado, solo con lo que publica Combat', () => {
  it('en mi turno pinta la Vida de ambos y el boton «Ataque básico» con el unico rival ya elegido', async () => {
    await enBatalla(ANA_ID)

    expect(await screen.findByText('Tu turno')).toBeInTheDocument()
    expect(screen.getAllByRole('meter')).toHaveLength(2)
    expect(screen.getAllByText('44 / 44')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Ataque básico' })).toHaveAttribute(
      'aria-disabled',
      'false',
    )
    expect(screen.getByRole('radio', { name: /Bruno/u })).toBeChecked()
  })

  it('el clic envia la INTENCION (objetivo y commandId) y no toca la Vida ni el turno hasta que Combat responde', async () => {
    const { socket } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Ataque básico' }))

    expect(socket.attacks()).toEqual([
      { type: 'attack', commandId: 'cmd-1', roomId: ROOM_ID, target: { teamLabel: 'B', seat: 0 } },
    ])
    // Sin respuesta: la Vida y el turno siguen exactamente como los publico el servidor.
    expect(screen.getAllByText('44 / 44')).toHaveLength(2)
    expect(screen.getByText('Tu turno')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atacando…' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(resultado()).toBeEmptyDOMElement()
  })

  it('un doble clic envia UN solo comando', async () => {
    const { socket, createCommandId } = await enBatalla(ANA_ID)
    const boton = await screen.findByRole('button', { name: 'Ataque básico' })

    await userEvent.dblClick(boton)

    expect(socket.attacks()).toHaveLength(1)
    expect(createCommandId).toHaveBeenCalledTimes(1)
  })

  it('cuando llega basicAttackResolved: Vida actualizada, turno del rival, resultado anunciado y sin boton', async () => {
    const { socket } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Ataque básico' }))
    deliver(socket, anaGolpea('cmd-1'))

    expect(await screen.findByText('Turno de Bruno')).toBeInTheDocument()
    expect(screen.getByText('38 / 44')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Vida de Bruno' })).toHaveAttribute(
      'aria-valuenow',
      '38',
    )
    expect(
      within(resultado()).getByText('Ana atacó a Bruno: Golpe crítico (137 %)'),
    ).toBeInTheDocument()
    expect(resultado()).toHaveTextContent('Vida de Bruno: 44 → 38')
    expect(
      screen.queryByRole('button', { name: /Ataque básico|Atacando/u }),
    ).not.toBeInTheDocument()
  })

  it('un golpe que no supera la Defensa deja la Vida igual, avanza el turno y dice «sin efecto»', async () => {
    const { socket } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Ataque básico' }))
    deliver(
      socket,
      basicAttackResolved({
        seq: 2,
        commandId: 'cmd-1',
        attacker: ANA,
        target: BRUNO,
        resolution: MISS,
        before: 44,
        after: 44,
        completedPosition: 1,
        view: combatBattle(2),
      }),
    )

    expect(await screen.findByText('Turno de Bruno')).toBeInTheDocument()
    expect(screen.getAllByText('44 / 44')).toHaveLength(2)
    expect(resultado()).toHaveTextContent('Ana atacó a Bruno: sin efecto')
    expect(resultado()).toHaveTextContent('El Ataque (11) no superó la Defensa (11)')
  })

  it('el rival ve el MISMO resultado en su pantalla y el boton en SU turno', async () => {
    const { socket } = await enBatalla(BRUNO_ID)

    deliver(socket, anaGolpea('cmd-de-ana'))

    expect(await screen.findByText('Tu turno')).toBeInTheDocument()
    expect(screen.getByText('38 / 44')).toBeInTheDocument()
    expect(resultado()).toHaveTextContent('Ana atacó a Bruno: Golpe crítico (137 %)')
    expect(screen.getByRole('button', { name: 'Ataque básico' })).toHaveAttribute(
      'aria-disabled',
      'false',
    )
  })

  it('un rechazo del servidor (NOT_YOUR_TURN) se anuncia con alerta y la batalla sigue accesible', async () => {
    const { socket } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Ataque básico' }))
    deliver(socket, attackRejected('NOT_YOUR_TURN', 'cmd-1'))

    expect(await screen.findByRole('alert')).toHaveTextContent('No es tu turno')
    expect(screen.getAllByRole('meter')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Ataque básico' })).toHaveAttribute(
      'aria-disabled',
      'false',
    )
  })

  it('un rechazo de `resume` (NOT_A_PARTICIPANT) sigue reemplazando la pantalla (HU-17 intacta)', async () => {
    const harness = montar(ANA_ID)
    const socket = await connect(harness.sockets)

    deliver(socket, { type: 'command.rejected', code: 'NOT_A_PARTICIPANT' })

    expect(await screen.findByRole('alert')).toHaveTextContent('No participas en esta batalla.')
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
  })

  it('sin conexion lista no se ofrece atacar: el boton queda deshabilitado con la razon en texto', async () => {
    const { socket } = await enBatalla(ANA_ID)
    vi.useFakeTimers()

    act(() => {
      socket.close()
    })
    vi.useRealTimers()

    expect(await screen.findByText(/Reconectando en tiempo real/u)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ataque básico' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByText('Esperando la conexión con la batalla…')).toBeInTheDocument()
  })

  it('un ataque sin confirmar por un corte ofrece reintentar (mismo comando) y no se envia solo', async () => {
    const { socket, sockets } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Ataque básico' }))
    vi.useFakeTimers()
    act(() => {
      socket.close()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    vi.useRealTimers()

    await waitFor(() => {
      expect(sockets).toHaveLength(2)
    })
    const second = sockets[1]!

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo confirmar tu ataque')

    act(() => {
      second.open()
      second.message({ type: 'auth.ok' })
    })
    deliver(second, ready(1))

    expect(second.attacks()).toHaveLength(0)

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar ataque' }))

    expect(second.attacks()).toEqual([
      { type: 'attack', commandId: 'cmd-1', roomId: ROOM_ID, target: { teamLabel: 'B', seat: 0 } },
    ])
  })

  it('tras el corte, el `resume` entrega el resultado guardado: se cierra la duda y se pinta la Vida', async () => {
    const { socket, sockets } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Ataque básico' }))
    vi.useFakeTimers()
    act(() => {
      socket.close()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    vi.useRealTimers()
    await waitFor(() => {
      expect(sockets).toHaveLength(2)
    })
    const second = sockets[1]!

    act(() => {
      second.open()
      second.message({ type: 'auth.ok' })
    })
    deliver(second, anaGolpea('cmd-1'), ready(2))

    expect(await screen.findByText('38 / 44')).toBeInTheDocument()
    expect(screen.queryByText(/No se pudo confirmar tu ataque/u)).not.toBeInTheDocument()
    expect(resultado()).toHaveTextContent('Ana atacó a Bruno: Golpe crítico (137 %)')
    expect(second.attacks()).toHaveLength(0)
  })

  it('no hay Poder en la pantalla ni en el comando', async () => {
    const { socket } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Ataque básico' }))

    expect(document.body.textContent).not.toMatch(/poder/iu)
    expect(JSON.stringify(socket.attacks())).not.toMatch(/power|poder/iu)
  })

  it('una batalla iniciada antes de HU-18 (sin Vida) se ve, pero no admite ataque y lo explica', async () => {
    const harness = montar(ANA_ID)
    const socket = await connect(harness.sockets)

    // Como la publicaba Combat antes de HU-18: la misma vista, sin `combatants`.
    deliver(socket, snapshot(1, 'IN_BATTLE', battle(1)), ready(1))

    expect(await screen.findByText('Tu turno')).toBeInTheDocument()
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ataque básico' })).not.toBeInTheDocument()
    expect(screen.getByText(/antes de que existieran las acciones de combate/u)).toBeInTheDocument()
  })
})
