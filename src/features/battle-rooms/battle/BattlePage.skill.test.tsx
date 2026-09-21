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
  BRUNO,
  combatBattle,
  degradedAttackResolved,
  MISS,
  recharging,
  ROOM_ID,
  SHIELD_STRIKE,
  skillBattle,
  skillRejected,
  skillUsed,
  snapshot,
  withSkills,
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

  commands(type: string): Record<string, unknown>[] {
    return this.sent
      .map((raw) => JSON.parse(raw) as Record<string, unknown>)
      .filter((command) => command.type === type)
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

/** Bruno (B/0) y Ana (A/0) con Poder 10/10 y Golpe con escudo; el turno es de Ana (posicion 1). */
const enBatalla = async (subject: string, turnsCompleted = 1) => {
  const harness = montar(subject)
  const socket = await connect(harness.sockets)

  deliver(socket, snapshot(1, 'IN_BATTLE', skillBattle(turnsCompleted)), ready(1))

  return { ...harness, socket }
}

/** Ana usa Golpe con escudo: Poder 10 -> 8, Golpe con escudo en recarga, Bruno 44 -> 38, turno de Bruno. */
const anaUsaEscudo = (commandId: string): Record<string, unknown> =>
  skillUsed({
    seq: 2,
    commandId,
    actor: ANA,
    target: BRUNO,
    power: { before: 10, after: 8 },
    bonus: { attack: 2, damage: 0 },
    before: 44,
    after: 38,
    completedPosition: 1,
    view: skillBattle(
      2,
      [
        [38, 44],
        [44, 44],
      ],
      [
        { power: [10, 10], skills: [SHIELD_STRIKE] },
        { power: [8, 10], skills: [recharging(SHIELD_STRIKE)] },
      ],
    ),
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

describe('BattlePage — HU-19: del clic de la habilidad al resultado, solo con lo que publica Combat', () => {
  it('en mi turno pinta el Poder de ambos y las habilidades de MI heroe con su costo y estado', async () => {
    await enBatalla(ANA_ID)

    expect(await screen.findByText('Tu turno')).toBeInTheDocument()
    expect(screen.getAllByRole('meter', { name: /^Poder de / })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Usar Golpe con escudo' })).toHaveAttribute(
      'aria-disabled',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Usar Mano de piedra' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByText('2 de Poder')).toBeInTheDocument()
  })

  it('el clic envia la INTENCION (habilidad, objetivo y commandId) y no toca Poder, Vida ni turno hasta que Combat responde', async () => {
    const { socket } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Usar Golpe con escudo' }))

    expect(socket.commands('useSkill')).toEqual([
      {
        type: 'useSkill',
        commandId: 'cmd-1',
        roomId: ROOM_ID,
        abilityId: SHIELD_STRIKE.abilityId,
        target: { teamLabel: 'B', seat: 0 },
      },
    ])
    expect(socket.commands('attack')).toEqual([])
    expect(screen.getByRole('button', { name: 'Usando…' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('meter', { name: 'Poder de Ana' })).toHaveAttribute(
      'aria-valuenow',
      '10',
    )
    expect(screen.getByText('Tu turno')).toBeInTheDocument()
    expect(screen.getAllByText('44 / 44')).toHaveLength(2)
  })

  it('con la habilidad pendiente ni el ataque basico ni otro clic envian nada mas', async () => {
    const { socket } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Usar Golpe con escudo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Usando…' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ataque básico' }))

    expect(socket.commands('useSkill')).toHaveLength(1)
    expect(socket.commands('attack')).toHaveLength(0)
  })

  it('cuando llega skillUsed: Poder gastado, habilidad en recarga, Vida, turno del rival y resultado anunciado', async () => {
    const { socket } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Usar Golpe con escudo' }))
    deliver(socket, anaUsaEscudo('cmd-1'))

    expect(await screen.findByText('Turno de Bruno')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Poder de Ana' })).toHaveAttribute(
      'aria-valuenow',
      '8',
    )
    expect(screen.getByText('38 / 44')).toBeInTheDocument()
    expect(resultado()).toHaveTextContent('Ana usó Golpe con escudo contra Bruno')
    expect(resultado()).toHaveTextContent('Poder de Ana: 10 → 8.')
    expect(resultado()).toHaveTextContent('Bono de Ataque de la habilidad: +2.')
    // Ya no es mi turno: ni boton de habilidad ni de ataque, ni «Usando…» colgado.
    expect(screen.queryByRole('button', { name: /^Usar |Usando/u })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ataque básico' })).not.toBeInTheDocument()
  })

  it('el rival ve el MISMO resultado y, en SU turno, sus propias habilidades (la recarga de Ana es de Ana)', async () => {
    const { socket } = await enBatalla(BRUNO_ID)

    deliver(socket, anaUsaEscudo('cmd-de-ana'))

    expect(await screen.findByText('Tu turno')).toBeInTheDocument()
    expect(resultado()).toHaveTextContent('Ana usó Golpe con escudo contra Bruno')
    expect(screen.getByRole('meter', { name: 'Poder de Ana' })).toHaveAttribute(
      'aria-valuenow',
      '8',
    )
    // Las habilidades de Bruno estan disponibles: el `battle` de Combat trae la recarga solo en Ana.
    const escudoDeBruno = screen.getByRole('button', { name: 'Usar Golpe con escudo' })

    expect(escudoDeBruno).toHaveAttribute('aria-disabled', 'false')
  })

  it('Poder insuficiente: Combat la degrada a un ataque basico; NO hay error, se explica y la habilidad no se gasta', async () => {
    const { socket } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Usar Golpe con escudo' }))
    deliver(
      socket,
      degradedAttackResolved({
        seq: 2,
        commandId: 'cmd-1',
        abilityId: SHIELD_STRIKE.abilityId,
        attacker: ANA,
        target: BRUNO,
        resolution: MISS,
        before: 44,
        after: 44,
        completedPosition: 1,
        view: withSkills(skillBattle(2), [
          { power: [10, 10], skills: [SHIELD_STRIKE] },
          { power: [0, 10], skills: [SHIELD_STRIKE] },
        ]),
      }),
    )

    expect(await screen.findByText('Turno de Bruno')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(resultado()).toHaveTextContent(
      'Ana no tenía Poder suficiente para Golpe con escudo: se usó un ataque básico',
    )
    expect(resultado()).toHaveTextContent('La habilidad no se gastó ni quedó en recarga.')
    expect(screen.getByRole('meter', { name: 'Poder de Ana' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
  })

  it('un rechazo (SKILL_ON_COOLDOWN) se anuncia con texto propio, no cambia nada y «Entendido» lo cierra', async () => {
    const { socket } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Usar Golpe con escudo' }))
    deliver(socket, skillRejected('SKILL_ON_COOLDOWN', 'cmd-1'))

    const alerta = await screen.findByRole('alert')

    expect(alerta).toHaveTextContent('Esa habilidad sigue en recarga. Tu turno no se consumió.')
    expect(screen.getByText('Tu turno')).toBeInTheDocument()
    expect(screen.getAllByText('44 / 44')).toHaveLength(2)

    await userEvent.click(within(alerta).getByRole('button', { name: 'Entendido' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('COMMAND_CONFLICT: «Reintentar habilidad» reenvia el MISMO commandId y no crea otra accion', async () => {
    const { socket, createCommandId } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Usar Golpe con escudo' }))
    deliver(socket, skillRejected('COMMAND_CONFLICT', 'cmd-1'))

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar habilidad' }))

    expect(socket.commands('useSkill').map((command) => command.commandId)).toEqual([
      'cmd-1',
      'cmd-1',
    ])
    expect(createCommandId).toHaveBeenCalledTimes(1)
  })

  it('el mismo skillUsed entregado dos veces no cobra el Poder dos veces', async () => {
    const { socket } = await enBatalla(ANA_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Usar Golpe con escudo' }))
    deliver(socket, anaUsaEscudo('cmd-1'), anaUsaEscudo('cmd-1'))

    expect(await screen.findByText('Turno de Bruno')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Poder de Ana' })).toHaveAttribute(
      'aria-valuenow',
      '8',
    )
  })

  it('una batalla anterior a HU-19 (sin Poder ni habilidades) sigue mostrando solo el ataque basico', async () => {
    const harness = montar(ANA_ID)
    const socket = await connect(harness.sockets)

    // `combatBattle` trae solo Vida: la forma de un Combat anterior a HU-19.
    deliver(socket, snapshot(1, 'IN_BATTLE', combatBattle(1)), ready(1))

    expect(await screen.findByRole('button', { name: 'Ataque básico' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Habilidades' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('power-meter')).not.toBeInTheDocument()
  })
})
