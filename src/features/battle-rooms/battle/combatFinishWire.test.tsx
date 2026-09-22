import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import type { SocketFactory, TicketProvider } from '../realtime'
import { BattlePage } from './BattlePage'
import { BattleResultView } from './BattleResultView'
import {
  battleReducer,
  initialBattleState,
  type BattleAction,
  type BattleClientState,
} from './battleReducer'
import {
  isBattleEventMessage,
  isCommandRejectedMessage,
  isResumeOkMessage,
  isSnapshotMessage,
  type BattleEventMessage,
  type BattleResult,
} from './types'

/**
 * CONTRATO CON BYTES REALES DE COMBAT (HU-21, Task #419).
 *
 * `combat-finish-wire.fixture.json` NO esta escrito a mano: son los mensajes exactos que el
 * servidor real de Combat (MongoDB real, Nest real, reloj controlado) envio a DOS clientes `ws`
 * reales en su prueba de extremo a extremo. Aqui se pasan por las guardas, el reductor y la
 * pantalla tal cual llegaron por el cable.
 */
interface WireScenario {
  readonly roomId: string
  readonly clienteA: readonly string[]
  readonly clienteB: readonly string[]
}

const fixture = JSON.parse(
  readFileSync(path.resolve(__dirname, 'combat-finish-wire.fixture.json'), 'utf8'),
) as { readonly escenarios: Readonly<Record<string, WireScenario>> }

const scenario = (name: string): WireScenario => {
  const found = fixture.escenarios[name]

  if (found === undefined) {
    throw new Error(`El fixture no trae el escenario ${name}`)
  }

  return found
}

const parse = (raws: readonly string[]): Record<string, unknown>[] =>
  raws.map((raw) => JSON.parse(raw) as Record<string, unknown>)

const toActions = (raws: readonly string[]): BattleAction[] =>
  parse(raws).flatMap((message): BattleAction[] => {
    if (isSnapshotMessage(message)) {
      return [{ type: 'snapshot', message }]
    }

    if (isBattleEventMessage(message)) {
      return [{ type: 'event', message: message as unknown as BattleEventMessage }]
    }

    if (isResumeOkMessage(message)) {
      return [{ type: 'synced' }]
    }

    return []
  })

const reduce = (raws: readonly string[]): BattleClientState =>
  toActions(raws).reduce(battleReducer, initialBattleState)

const resultOf = (raws: readonly string[]): BattleResult | null => reduce(raws).result

const battleFinishedRaws = (raws: readonly string[]): string[] =>
  raws.filter((raw) => (JSON.parse(raw) as { type: string }).type === 'battleFinished')

describe('combat-finish-wire — los bytes reales pasan las guardas', () => {
  it('cada mensaje del cable es un tipo conocido y valido', () => {
    const knownNonBattle = new Set(['auth.ok', 'battle-room.updated'])

    for (const [name, wire] of Object.entries(fixture.escenarios)) {
      for (const raw of [...wire.clienteA, ...wire.clienteB]) {
        const message = JSON.parse(raw) as Record<string, unknown>
        const accepted =
          isSnapshotMessage(message) ||
          isBattleEventMessage(message) ||
          isResumeOkMessage(message) ||
          isCommandRejectedMessage(message) ||
          knownNonBattle.has(String(message.type))

        expect({ name, type: message.type, accepted }).toEqual({
          name,
          type: message.type,
          accepted: true,
        })
      }
    }
  })
})

describe('combat-finish-wire — reductor con bytes reales', () => {
  it('eliminacion: un solo `battleFinished`, con el resultado y los mismos bytes para ambos', () => {
    const wire = scenario('eliminacion')
    const stateA = reduce(wire.clienteA)
    const stateB = reduce(wire.clienteB)

    expect(stateA.roomStatus).toBe('FINISHED')
    expect(stateA.result).toMatchObject({
      reason: 'ELIMINATION',
      outcome: 'WIN',
      winnerTeamLabel: 'A',
    })
    expect(stateA.lastAttack).not.toBeNull()
    expect(stateB.result).toEqual(stateA.result)

    const finalA = battleFinishedRaws(wire.clienteA)
    const finalB = battleFinishedRaws(wire.clienteB)

    expect(finalA).toHaveLength(1)
    expect(finalA).toEqual(finalB)

    const events = parse(wire.clienteA).filter((message) => isBattleEventMessage(message))
    const action = events.find((message) => message.type === 'basicAttackResolved')
    const final = events.find((message) => message.type === 'battleFinished')

    expect(Number(final?.seq)).toBe(Number(action?.seq) + 1)
  })

  it('turno vencido: queda el aviso y la batalla sigue', () => {
    const state = reduce(scenario('turnoVencido').clienteA)

    expect(state.roomStatus).toBe('IN_BATTLE')
    expect(state.result).toBeNull()
    expect(state.lastTurnTimeout?.timedOut).toEqual({ teamLabel: 'A', seat: 0 })
  })

  it('desconexion: gana el rival y el desconectado no recibe resultado', () => {
    const wire = scenario('desconexion')
    const stateB = reduce(wire.clienteB)

    expect(stateB.result).toMatchObject({
      reason: 'DISCONNECTION',
      winnerTeamLabel: 'B',
      disconnected: { teamLabel: 'A', seat: 0 },
    })
    expect(battleFinishedRaws(wire.clienteA)).toHaveLength(0)
  })

  it('6 minutos: NO_WINNER sin ganador', () => {
    expect(resultOf(scenario('sinGanador').clienteA)).toMatchObject({
      reason: 'TIME_LIMIT',
      outcome: 'NO_WINNER',
      winnerTeamLabel: null,
      tiebreak: null,
    })
  })

  it('6 minutos con el mismo porcentaje: gana la vida absoluta y el marcador llega tal cual', () => {
    const result = resultOf(scenario('tiempoAbsoluto').clienteA)

    expect(result).toMatchObject({
      reason: 'TIME_LIMIT',
      outcome: 'WIN',
      winnerTeamLabel: 'B',
      tiebreak: 'ABSOLUTE_LIFE',
    })
    expect(
      result?.teams.map((team) => `${String(team.remainingHealth)}/${String(team.maxHealth)}`),
    ).toEqual(['22/44', '25/50'])
  })

  it('refresh: el `snapshot` real trae el resultado', () => {
    const wire = scenario('refresh')
    const snapshot = parse(wire.clienteA).find((message) => message.type === 'snapshot')

    expect(snapshot?.status).toBe('FINISHED')
    expect(resultOf(wire.clienteA)).toMatchObject({ reason: 'ELIMINATION', winnerTeamLabel: 'A' })
  })
})

describe('combat-finish-wire — pantalla con bytes reales', () => {
  it('el resultado real se pinta desde las dos perspectivas', () => {
    const result = resultOf(scenario('eliminacion').clienteA)

    if (result === null) {
      throw new Error('El escenario no trae resultado')
    }

    const { unmount } = renderWithProviders(<BattleResultView result={result} subject="sujeto-a" />)

    expect(screen.getByRole('heading', { name: '¡Victoria!' })).toBeInTheDocument()
    unmount()

    renderWithProviders(<BattleResultView result={result} subject="sujeto-b" />)

    expect(screen.getByRole('heading', { name: 'Derrota' })).toBeInTheDocument()
  })

  it('el refresh real pinta la vista final en la pagina', async () => {
    const wire = scenario('refresh')
    const sockets: FakeSocket[] = []
    const socketFactory: SocketFactory = (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket as unknown as WebSocket
    }
    const ticketProvider = vi.fn<TicketProvider>(() => Promise.resolve('ticket-1'))

    useSession.setState({
      subject: 'sujeto-a',
      accessToken: 'jwt-vigente',
      expiresAt: Date.now() + 900_000,
    })

    renderWithProviders(
      <Routes>
        <Route
          path="/play/rooms/:roomId/battle"
          element={<BattlePage socketFactory={socketFactory} ticketProvider={ticketProvider} />}
        />
      </Routes>,
      { route: `/play/rooms/${wire.roomId}/battle` },
    )

    await waitFor(() => {
      expect(sockets).toHaveLength(1)
    })

    const socket = sockets[0]!

    act(() => {
      socket.open()
      for (const raw of wire.clienteA) {
        socket.messageRaw(raw)
      }
    })

    expect(screen.getByRole('heading', { name: '¡Victoria!' })).toBeInTheDocument()
  })
})

class FakeSocket extends EventTarget {
  readonly url: string

  constructor(url: string) {
    super()
    this.url = url
  }

  send(): void {
    // El cliente no envia nada relevante en esta prueba.
  }

  close(): void {
    this.dispatchEvent(new Event('close'))
  }

  open(): void {
    this.dispatchEvent(new Event('open'))
  }

  messageRaw(raw: string): void {
    this.dispatchEvent(new MessageEvent('message', { data: raw }))
  }
}

beforeEach(() => {
  useSession.setState({
    subject: 'sujeto-a',
    accessToken: 'jwt-vigente',
    expiresAt: Date.now() + 900_000,
  })
})

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})
