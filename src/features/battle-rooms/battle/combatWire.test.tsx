import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import type { SocketFactory, TicketProvider } from '../realtime'
import { BattlePage } from './BattlePage'
import {
  battleReducer,
  initialBattleState,
  type BattleAction,
  type BattleClientState,
} from './battleReducer'
import {
  isBasicAttackResolvedMessage,
  isBattleEventMessage,
  isCommandRejectedMessage,
  isResumeOkMessage,
  isSnapshotMessage,
  type BasicAttackResolvedMessage,
  type CommandRejectedMessage,
} from './types'

/**
 * CONTRATO CON BYTES REALES DE COMBAT (HU-18, Task #412).
 *
 * `combat-wire.fixture.json` NO esta escrito a mano: son los mensajes exactos que el servidor real
 * de Combat (MongoDB real, Nest real, secuencia HU-24 guionizada) envio a DOS clientes `ws` reales
 * durante su prueba de extremo a extremo (`test/db/basic-attack.e2e.spec.ts`). Aqui se pasan por
 * las guardas, el reductor y la pantalla de Web tal cual llegaron por el cable. Asi un cambio de
 * forma en Combat que Web no entienda se detecta en esta prueba, no en produccion.
 *
 * NO es una prueba con navegadores reales: eso es el procedimiento manual del runbook de
 * Infrastructure (`docs/runbooks/hu-18-aceptacion-manual.md`).
 */
interface WireFixture {
  readonly roomId: string
  readonly clienteA: readonly string[]
  readonly clienteB: readonly string[]
}

const wire = JSON.parse(
  readFileSync(path.resolve(__dirname, 'combat-wire.fixture.json'), 'utf8'),
) as WireFixture

const parse = (raws: readonly string[]): Record<string, unknown>[] =>
  raws.map((raw) => JSON.parse(raw) as Record<string, unknown>)

const ofType = (raws: readonly string[], type: string): Record<string, unknown>[] =>
  parse(raws).filter((message) => message.type === type)

/** Lo que el reductor consume de la batalla: instantaneas y eventos, en el orden del cable. */
const toActions = (raws: readonly string[]): BattleAction[] =>
  parse(raws).flatMap((message): BattleAction[] => {
    if (isSnapshotMessage(message)) {
      return [{ type: 'snapshot', message }]
    }

    return isBattleEventMessage(message) ? [{ type: 'event', message }] : []
  })

const reduce = (raws: readonly string[]): BattleClientState =>
  toActions(raws).reduce(battleReducer, initialBattleState)

const attacksOf = (raws: readonly string[]): BasicAttackResolvedMessage[] =>
  parse(raws).flatMap((message) => (isBasicAttackResolvedMessage(message) ? [message] : []))

const rejectionsOf = (raws: readonly string[]): CommandRejectedMessage[] =>
  parse(raws).flatMap((message) => (isCommandRejectedMessage(message) ? [message] : []))

describe('mensajes REALES de Combat — las guardas de Web los entienden todos', () => {
  it('el fixture trae lo esperado: dos clientes, un critico, su repeticion, 0 %, un fallo y rechazos', () => {
    expect(wire.clienteA.length).toBeGreaterThan(8)
    expect(wire.clienteB.length).toBeGreaterThan(8)
    expect(ofType(wire.clienteA, 'battleStarted')).toHaveLength(1)
    expect(attacksOf(wire.clienteA).map((event) => event.commandId)).toEqual([
      'cmd-critico',
      'cmd-critico',
      'cmd-cero',
      'cmd-fallo',
    ])
  })

  it('cada mensaje de batalla real se reconoce: ninguno se ignoraria por forma', () => {
    for (const message of [...parse(wire.clienteA), ...parse(wire.clienteB)]) {
      switch (message.type) {
        case 'battleStarted':
        case 'basicAttackResolved':
          expect(isBattleEventMessage(message)).toBe(true)
          break
        case 'snapshot':
          expect(isSnapshotMessage(message)).toBe(true)
          break
        case 'resume.ok':
          expect(isResumeOkMessage(message)).toBe(true)
          break
        case 'command.rejected':
          expect(isCommandRejectedMessage(message)).toBe(true)
          break
        default:
          // `auth.ok` y `battle-room.updated` no son de la batalla: Web no los interpreta aqui.
          expect(isBattleEventMessage(message)).toBe(false)
      }
    }
  })

  it('battleStarted real trae la Vida en `combatants`, en el mismo orden que la cola', () => {
    const [started] = ofType(wire.clienteA, 'battleStarted')
    const battle = (started as { battle: { turnOrder: unknown[]; combatants: unknown[] } }).battle

    expect(battle.combatants).toEqual([
      { teamLabel: 'A', seat: 0, health: { current: 44, max: 44 } },
      { teamLabel: 'B', seat: 0, health: { current: 44, max: 44 } },
    ])
    expect(battle.turnOrder).toHaveLength(battle.combatants.length)
  })

  it('el critico real: 137 %, dano aplicado 6, Vida 44 -> 38 y el turno pasa al rival en el mismo evento', () => {
    const [critico] = attacksOf(wire.clienteA)

    expect(critico).toMatchObject({
      seq: 2,
      commandId: 'cmd-critico',
      attacker: { teamLabel: 'A', seat: 0 },
      target: { teamLabel: 'B', seat: 0 },
      resolution: {
        attackValue: 15,
        defenseValue: 11,
        effective: true,
        effect: 'CRITICAL_DAMAGE',
        percent: 137,
        appliedDamage: 6,
      },
      targetHealth: { before: 44, after: 38 },
    })
    expect(critico?.battle.turnsCompleted).toBe(1)
    expect(critico?.battle.currentTurn.teamLabel).toBe('B')
    expect(critico?.battle.combatants?.[1]?.health).toEqual({ current: 38, max: 44 })
  })

  it('el efecto 0 % real trae `baseDamage: null` (no se tiro el dado) y la Vida no cambia', () => {
    const cero = attacksOf(wire.clienteA).find((event) => event.commandId === 'cmd-cero')

    expect(cero?.resolution).toMatchObject({
      effect: 'NO_DAMAGE',
      percent: 0,
      baseDamage: null,
      appliedDamage: 0,
    })
    expect(cero?.targetHealth).toEqual({ before: 44, after: 44 })
  })

  it('el golpe real que no supera la Defensa (11 contra 11): sin efecto ni porcentaje, y el turno SI avanza', () => {
    const fallo = attacksOf(wire.clienteA).find((event) => event.commandId === 'cmd-fallo')

    expect(fallo?.resolution).toEqual({
      attackValue: 11,
      defenseValue: 11,
      effective: false,
      effect: null,
      percent: null,
      baseDamage: null,
      calculatedDamage: 0,
      appliedDamage: 0,
    })
    expect(fallo?.battle.turnsCompleted).toBe(3)
  })

  it('AMBOS clientes recibieron LOS MISMOS bytes de cada resultado', () => {
    const bytes = (raws: readonly string[]): string[] =>
      raws.filter((raw) => raw.includes('"basicAttackResolved"'))

    const a = bytes(wire.clienteA)
    const b = bytes(wire.clienteB)

    // A ademas recibio la repeticion idempotente (mismos bytes que el original) y B no.
    expect(a).toHaveLength(4)
    expect(b).toHaveLength(3)
    expect(a[1]).toBe(a[0])
    expect([a[0], a[2], a[3]]).toEqual(b)
  })

  it('los rechazos reales son del ataque (`command: "attack"`), con `commandId` y codigo estable', () => {
    const rejections = [...rejectionsOf(wire.clienteA), ...rejectionsOf(wire.clienteB)]

    expect(rejections.map((message) => message.code)).toEqual(
      expect.arrayContaining([
        'NOT_YOUR_TURN',
        'INVALID_TARGET',
        'SAME_TEAM_TARGET',
        'MALFORMED_COMMAND',
        'INVALID_COMMAND_ID',
      ]),
    )

    for (const message of rejections) {
      expect(message.command).toBe('attack')
      expect(typeof message.commandId).toBe('string')
    }
  })

  it('ningun mensaje real lleva semilla, indices, estadisticas, efectos crudos ni Poder', () => {
    const raw = [...wire.clienteA, ...wire.clienteB].join('\n')

    expect(raw).not.toMatch(
      /seed|semilla|mt19937|activeEffects|power|poder|jwt|ticket|maxHealth|"defense"|"damage"/iu,
    )
  })
})

describe('mensajes REALES de Combat — el reductor de Web termina donde Combat dijo', () => {
  it('con los bytes del cliente A en orden: Vida, turno y ultimo ataque son los del ultimo evento', () => {
    const state = reduce(wire.clienteA)
    const events = attacksOf(wire.clienteA)
    const last = events[events.length - 1]

    expect(state.lastSeq).toBe(4)
    expect(state.battle).toEqual(last?.battle)
    expect(state.battle?.combatants?.map((entry) => entry.health)).toEqual([
      { current: 44, max: 44 },
      { current: 38, max: 44 },
    ])
    expect(state.lastAttack?.commandId).toBe('cmd-fallo')
  })

  it('la repeticion idempotente real (mismo seq, mismos bytes) se ignora: la Vida no se resta dos veces', () => {
    const withReplay = reduce(wire.clienteA)
    const withoutReplay = reduce(wire.clienteA.filter((_raw, index) => index !== 6))

    expect(withReplay).toEqual(withoutReplay)
  })

  it('ambos clientes terminan en el MISMO estado (misma Vida, mismo turno, mismo seq)', () => {
    const a = reduce(wire.clienteA)
    const b = reduce(wire.clienteB)

    expect(a.battle).toEqual(b.battle)
    expect(a.lastSeq).toBe(b.lastSeq)
    expect(a.lastAttack).toEqual(b.lastAttack)
  })

  it('un salto real de seq (se omite el critico) NO se aplica y pide resume', () => {
    const messages = parse(wire.clienteA)
    const withoutCritico = [
      messages.find((message) => message.type === 'snapshot'),
      messages.find((message) => message.type === 'battleStarted'),
      ...messages.filter(
        (message) => message.type === 'basicAttackResolved' && message.commandId !== 'cmd-critico',
      ),
    ].map((message) => JSON.stringify(message))
    const state = reduce(withoutCritico)

    expect(state.needsResync).toBe(true)
    expect(state.lastSeq).toBe(1)
    expect(state.battle?.combatants?.map((entry) => entry.health?.current)).toEqual([44, 44])
  })
})

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

  /** Entrega los BYTES tal cual llegaron por el cable (sin volver a serializar). */
  raw(data: string): void {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(jsonResponse(200, { id: wire.roomId, status: 'IN_BATTLE' })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('mensajes REALES de Combat — la pantalla de batalla los pinta', () => {
  const montar = (subject: string) => {
    const sockets: FakeSocket[] = []
    const socketFactory: SocketFactory = (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket as unknown as WebSocket
    }
    const ticketProvider = vi.fn<TicketProvider>(() => Promise.resolve('ticket-1'))

    useSession.setState({ subject, accessToken: 'jwt-vigente', expiresAt: Date.now() + 900_000 })
    renderWithProviders(
      <Routes>
        <Route
          path="/play/rooms/:roomId/battle"
          element={<BattlePage socketFactory={socketFactory} ticketProvider={ticketProvider} />}
        />
      </Routes>,
      { route: `/play/rooms/${wire.roomId}/battle` },
    )

    return sockets
  }

  const replay = async (subject: string, raws: readonly string[]): Promise<void> => {
    const sockets = montar(subject)

    await waitFor(() => {
      expect(sockets).toHaveLength(1)
    })
    const socket = sockets[0]!

    act(() => {
      socket.open()
    })

    for (const raw of raws) {
      act(() => {
        socket.raw(raw)
      })
    }
  }

  it('jugador A (equipo A): al final Vida 44 / 44 y 38 / 44, turno del rival y el ultimo golpe sin superar la Defensa', async () => {
    await replay('sujeto-a', wire.clienteA)

    expect(await screen.findByText('Turno de nombre-de-sujeto-b')).toBeInTheDocument()
    expect(screen.getAllByRole('meter')).toHaveLength(2)
    expect(screen.getByText('38 / 44')).toBeInTheDocument()
    expect(screen.getByText('44 / 44')).toBeInTheDocument()

    const resultado = screen.getByRole('status', { name: 'Resultado de la última acción' })

    expect(resultado).toHaveTextContent('pero no superó su Defensa')
    expect(resultado).toHaveTextContent('Ataque 11 vs Defensa 11')
    // No es su turno: sin boton de ataque.
    expect(screen.queryByRole('button', { name: 'Ataque básico' })).not.toBeInTheDocument()
  })

  it('jugador B (equipo B): ve el mismo resultado y Vida, y es SU turno: ofrece «Ataque básico» contra A', async () => {
    await replay('sujeto-b', wire.clienteB)

    expect(await screen.findByText('Tu turno')).toBeInTheDocument()
    expect(screen.getByText('38 / 44')).toBeInTheDocument()

    const resultado = screen.getByRole('status', { name: 'Resultado de la última acción' })

    expect(resultado).toHaveTextContent('pero no superó su Defensa')

    const boton = screen.getByRole('button', { name: 'Ataque básico' })

    // Con el unico rival (A) con Vida ya elegido y la conexion lista, el boton esta habilitado.
    expect(boton).toHaveAttribute('aria-disabled', 'false')
    expect(
      within(screen.getByRole('group', { name: 'Objetivo del ataque' })).getAllByRole('radio'),
    ).toHaveLength(1)
  })

  it('a mitad del recorrido (tras el critico) la pantalla ya muestra el resultado y la Vida 38 / 44', async () => {
    const hastaElCritico = wire.clienteA.slice(0, 6)

    await replay('sujeto-a', hastaElCritico)

    expect(await screen.findByText('38 / 44')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Resultado de la última acción' })).toHaveTextContent(
      'Golpe crítico 137 %',
    )
    expect(screen.getByRole('status', { name: 'Resultado de la última acción' })).toHaveTextContent(
      'nombre-de-sujeto-b: 44 → 38',
    )
  })
})
