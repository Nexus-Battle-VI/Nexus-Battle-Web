import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
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
  isSkillUsedMessage,
  isSnapshotMessage,
  type BasicAttackResolvedMessage,
  type CommandRejectedMessage,
  type SkillUsedMessage,
} from './types'

/**
 * CONTRATO CON BYTES REALES DE COMBAT (HU-19, Task #414/#415).
 *
 * `combat-skill-wire.fixture.json` NO esta escrito a mano: son los mensajes exactos que el servidor
 * real de Combat (MongoDB real, Nest real, secuencia HU-24 guionizada) envio a DOS clientes `ws`
 * reales en una prueba de extremo a extremo de habilidades (`test/db/skills.e2e.spec.ts`). Aqui se
 * pasan por las guardas, el reductor y la pantalla de Web tal cual llegaron por el cable. Asi un
 * cambio de forma en Combat que Web no entienda se detecta en esta prueba, no en produccion.
 *
 * NO es una prueba con navegadores reales ni contra el sistema desplegado: eso es el procedimiento
 * manual de aceptacion (Task #416).
 */
interface Capture {
  readonly roomId: string
  readonly clienteA: readonly string[]
  readonly clienteB: readonly string[]
}

interface WireFixture {
  readonly principal: Capture
  readonly degradada: Capture
}

const wire = JSON.parse(
  readFileSync(path.resolve(__dirname, 'combat-skill-wire.fixture.json'), 'utf8'),
) as WireFixture

const parse = (raws: readonly string[]): Record<string, unknown>[] =>
  raws.map((raw) => JSON.parse(raw) as Record<string, unknown>)

const ofType = (raws: readonly string[], type: string): Record<string, unknown>[] =>
  parse(raws).filter((message) => message.type === type)

const toActions = (raws: readonly string[]): BattleAction[] =>
  parse(raws).flatMap((message): BattleAction[] => {
    if (isSnapshotMessage(message)) {
      return [{ type: 'snapshot', message }]
    }

    return isBattleEventMessage(message) ? [{ type: 'event', message }] : []
  })

const reduce = (raws: readonly string[]): BattleClientState =>
  toActions(raws).reduce(battleReducer, initialBattleState)

const skillsOf = (raws: readonly string[]): SkillUsedMessage[] =>
  parse(raws).flatMap((message) => (isSkillUsedMessage(message) ? [message] : []))

const attacksOf = (raws: readonly string[]): BasicAttackResolvedMessage[] =>
  parse(raws).flatMap((message) => (isBasicAttackResolvedMessage(message) ? [message] : []))

const rejectionsOf = (raws: readonly string[]): CommandRejectedMessage[] =>
  parse(raws).flatMap((message) => (isCommandRejectedMessage(message) ? [message] : []))

const { principal, degradada } = wire

describe('mensajes REALES de Combat (HU-19) — las guardas de Web los entienden todos', () => {
  it('el fixture trae lo esperado: dos clientes, una habilidad y su repeticion, rechazos, ataques y una segunda habilidad', () => {
    expect(skillsOf(principal.clienteA).map((event) => event.commandId)).toEqual([
      'a-1',
      'a-1',
      'a-6',
    ])
    expect(skillsOf(principal.clienteB).map((event) => event.commandId)).toEqual(['a-1', 'a-6'])
    expect(rejectionsOf(principal.clienteA).map((message) => message.code)).toEqual([
      'SKILL_ON_COOLDOWN',
      'UNSUPPORTED_SKILL_EFFECT',
      'UNKNOWN_SKILL',
    ])
    expect(attacksOf(degradada.clienteA).map((event) => event.commandId)).toEqual(['a-1', 'b-1'])
  })

  it('cada mensaje de batalla real se reconoce: ninguno se ignoraria por forma', () => {
    const all = [
      ...principal.clienteA,
      ...principal.clienteB,
      ...degradada.clienteA,
      ...degradada.clienteB,
    ]

    for (const message of parse(all)) {
      switch (message.type) {
        case 'battleStarted':
        case 'basicAttackResolved':
        case 'skillUsed':
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
          expect(isBattleEventMessage(message)).toBe(false)
      }
    }
  })

  it('battleStarted real trae el Poder 10 / 10 y las habilidades de cada participante, con su estado real', () => {
    const [started] = ofType(principal.clienteA, 'battleStarted')
    const { combatants } = (
      started as {
        battle: {
          combatants: {
            power: unknown
            skills: { name: string; status: string; cooldownRemaining: number }[]
          }[]
        }
      }
    ).battle

    for (const combatant of combatants) {
      expect(combatant.power).toEqual({ current: 10, max: 10 })
      expect(combatant.skills.map((skill) => [skill.name, skill.status])).toEqual([
        ['Golpe con escudo', 'READY'],
        ['Golpe de tormenta', 'READY'],
        ['Mano de piedra', 'UNSUPPORTED'],
      ])
    }
  })

  it('la habilidad real: Poder 10 -> 8, recarga de 1 turno, bono de Ataque +2, dano 4, Vida 44 -> 40 y el turno pasa al rival en el mismo evento', () => {
    const [first] = skillsOf(principal.clienteA)

    expect(first).toMatchObject({
      seq: 2,
      commandId: 'a-1',
      actor: { teamLabel: 'A', seat: 0 },
      target: { teamLabel: 'B', seat: 0 },
      skill: { name: 'Golpe con escudo', powerCost: { mode: 'FIXED', amount: 2 }, chargeTurns: 1 },
      power: { before: 10, after: 8 },
      cooldown: { remainingTurns: 1 },
      bonus: { attack: 2, damage: 0 },
      resolution: { attackValue: 17, defenseValue: 11, effective: true, appliedDamage: 4 },
      targetHealth: { before: 44, after: 40 },
    })
    expect(first?.battle.turnsCompleted).toBe(1)
    expect(first?.battle.currentTurn.teamLabel).toBe('B')
  })

  it('el `battle` posterior a la habilidad trae el Poder gastado y la habilidad en recarga (Web no lo calcula)', () => {
    const [first] = skillsOf(principal.clienteA)
    const ana = first?.battle.combatants?.find((c) => c.teamLabel === 'A')

    expect(ana?.power).toEqual({ current: 8, max: 10 })
    expect(ana?.skills?.find((skill) => skill.name === 'Golpe con escudo')).toMatchObject({
      status: 'RECHARGING',
      cooldownRemaining: 1,
    })
  })

  it('al abrirse el turno propio el Poder regenera (8 -> 10) y la recarga sigue hasta cerrar ese turno', () => {
    const [afterRival] = attacksOf(principal.clienteA)
    const ana = afterRival?.battle.combatants?.find((c) => c.teamLabel === 'A')

    expect(ana?.power).toEqual({ current: 10, max: 10 })
    expect(ana?.skills?.[0]).toMatchObject({ status: 'RECHARGING', cooldownRemaining: 1 })
  })

  it('AMBOS clientes recibieron LOS MISMOS bytes de cada resultado, y la repeticion idempotente solo llego al remitente', () => {
    const bytes = (raws: readonly string[]): string[] =>
      raws.filter((raw) => raw.includes('"skillUsed"'))

    const a = bytes(principal.clienteA)
    const b = bytes(principal.clienteB)

    expect(a).toHaveLength(3)
    expect(b).toHaveLength(2)
    expect(a[1]).toBe(a[0])
    expect([a[0], a[2]]).toEqual(b)
  })

  it('los rechazos reales son de la habilidad (`command: "useSkill"`), con `commandId` y codigo estable, y solo al remitente', () => {
    const rejections = rejectionsOf(principal.clienteA)

    expect(rejections).toEqual([
      {
        type: 'command.rejected',
        command: 'useSkill',
        commandId: 'a-2',
        code: 'SKILL_ON_COOLDOWN',
      },
      {
        type: 'command.rejected',
        command: 'useSkill',
        commandId: 'a-3',
        code: 'UNSUPPORTED_SKILL_EFFECT',
      },
      {
        type: 'command.rejected',
        command: 'useSkill',
        commandId: 'a-4',
        code: 'UNKNOWN_SKILL',
      },
    ])
    expect(rejectionsOf(principal.clienteB)).toEqual([])
  })

  it('un efecto no soportado NO expone el motivo interno en el cable', () => {
    const raw = principal.clienteA.find((text) => text.includes('UNSUPPORTED_SKILL_EFFECT')) ?? ''

    expect(Object.keys(JSON.parse(raw) as object).sort()).toEqual([
      'code',
      'command',
      'commandId',
      'type',
    ])
  })

  it('Poder insuficiente real: un ataque basico con `degradedFrom`, Poder y recarga intactos', () => {
    const [, degraded] = attacksOf(degradada.clienteA)

    expect(degraded).toMatchObject({
      commandId: 'b-1',
      attacker: { teamLabel: 'B', seat: 0 },
      degradedFrom: {
        command: 'useSkill',
        abilityId: '2e97537a-675c-461a-b902-4fcf369083a8',
        reason: 'INSUFFICIENT_POWER',
      },
      resolution: { attackValue: 15, effective: true },
    })

    const bruno = degraded?.battle.combatants?.find((c) => c.teamLabel === 'B')

    expect(bruno?.power).toEqual({ current: 1, max: 1 })
    expect(bruno?.skills?.[0]).toMatchObject({ status: 'READY', cooldownRemaining: 0 })
  })

  it('el Poder de un heroe pertenece a su participante: el maximo de B (1) no es el de A (10)', () => {
    const [started] = ofType(degradada.clienteA, 'battleStarted')
    const { combatants } = (
      started as { battle: { combatants: { teamLabel: string; power: unknown }[] } }
    ).battle

    expect(combatants.map((c) => [c.teamLabel, c.power])).toEqual([
      ['A', { current: 10, max: 10 }],
      ['B', { current: 1, max: 1 }],
    ])
  })

  it('ningun mensaje real lleva semilla, indices, estadisticas, efectos crudos ni el motivo interno', () => {
    const raw = [...principal.clienteA, ...principal.clienteB, ...degradada.clienteA].join('\n')

    expect(raw).not.toMatch(
      /seed|semilla|mt19937|activeEffects|jwt|ticket|maxHealth|"defense"|"damage"\s*:\s*\{|"effects"|"raw"/iu,
    )
  })
})

describe('mensajes REALES de Combat (HU-19) — el reductor de Web termina donde Combat dijo', () => {
  it('con los bytes del cliente A en orden: Poder, recarga, Vida, turno y ultima habilidad son los del ultimo evento', () => {
    const state = reduce(principal.clienteA)
    const events = skillsOf(principal.clienteA)
    const last = events[events.length - 1]

    expect(state.lastSeq).toBe(6)
    expect(state.battle).toEqual(last?.battle)
    expect(state.lastSkill?.commandId).toBe('a-6')
    expect(state.lastSkill?.power).toEqual({ before: 10, after: 8 })
    expect(state.battle?.combatants?.map((c) => c.power)).toEqual([
      { current: 8, max: 10 },
      { current: 10, max: 10 },
    ])
  })

  it('la repeticion idempotente real (mismo seq, mismos bytes) se ignora: no se cobra el Poder dos veces', () => {
    const replayIndex = principal.clienteA.findIndex(
      (raw, index) => raw.includes('"skillUsed"') && index > 5,
    )
    const withReplay = reduce(principal.clienteA)
    const withoutReplay = reduce(principal.clienteA.filter((_raw, index) => index !== replayIndex))

    expect(replayIndex).toBe(6)
    expect(withReplay).toEqual(withoutReplay)
  })

  it('ambos clientes terminan en el MISMO estado (mismo Poder, misma recarga, misma Vida, mismo turno)', () => {
    const a = reduce(principal.clienteA)
    const b = reduce(principal.clienteB)

    expect(a.battle).toEqual(b.battle)
    expect(a.lastSeq).toBe(b.lastSeq)
    expect(a.lastSkill).toEqual(b.lastSkill)
    expect(a.lastAttack).toEqual(b.lastAttack)
  })

  it('un salto real de seq (se omite la primera habilidad) NO se aplica y pide resume', () => {
    const sinLaPrimera = [
      principal.clienteA[1]!,
      principal.clienteA[3]!,
      ...principal.clienteA.filter((raw) => raw.includes('"seq":3') || raw.includes('"seq":6')),
    ]
    const state = reduce(sinLaPrimera)

    expect(state.needsResync).toBe(true)
    expect(state.lastSeq).toBe(1)
    expect(state.battle?.combatants?.map((c) => c.power?.current)).toEqual([10, 10])
  })

  it('el ataque basico degradado real conserva `degradedFrom` en el estado', () => {
    const state = reduce(degradada.clienteA)

    expect(state.lastAttack?.commandId).toBe('b-1')
    expect(state.lastAttack?.degradedFrom).toMatchObject({ reason: 'INSUFFICIENT_POWER' })
    expect(state.lastSkill).toBeNull()
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
    vi.fn().mockResolvedValue(jsonResponse(200, { id: principal.roomId, status: 'IN_BATTLE' })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('mensajes REALES de Combat (HU-19) — la pantalla de batalla los pinta', () => {
  const montar = (subject: string, roomId: string) => {
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
      { route: `/play/rooms/${roomId}/battle` },
    )

    return sockets
  }

  const replay = async (
    subject: string,
    capture: Capture,
    raws: readonly string[],
  ): Promise<FakeSocket> => {
    const sockets = montar(subject, capture.roomId)

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

    return socket
  }

  const resultado = (): HTMLElement =>
    screen.getByRole('status', { name: 'Resultado de la última acción' })

  it('jugador A al final: un medidor de Poder por heroe (8/10 y 10/10), la habilidad en recarga y el resultado de la ultima habilidad', async () => {
    await replay('sujeto-a', principal, principal.clienteA)

    // Es el turno del rival (B): sin acciones para A.
    expect(await screen.findByText('Turno de nombre-de-sujeto-b')).toBeInTheDocument()
    expect(screen.getAllByTestId('power-meter')).toHaveLength(2)
    expect(screen.getAllByRole('meter', { name: /^Poder de / })).toHaveLength(2)
    expect(screen.getByRole('meter', { name: 'Poder de Jugador' })).toHaveAttribute(
      'aria-valuenow',
      '8',
    )
    expect(screen.getByRole('meter', { name: 'Poder de nombre-de-sujeto-b' })).toHaveAttribute(
      'aria-valuenow',
      '10',
    )
    expect(resultado()).toHaveTextContent('Jugador usó Golpe con escudo contra nombre-de-sujeto-b')
    expect(resultado()).toHaveTextContent('Daño normal 100 %')
    expect(resultado()).toHaveTextContent('Poder 10 → 8')
    expect(resultado()).toHaveTextContent('Recarga 1 turno')
    expect(screen.queryByRole('button', { name: /^Usar / })).not.toBeInTheDocument()
  })

  it('jugador B ve el MISMO resultado y, en SU turno, sus propias habilidades con el estado que Combat publico', async () => {
    await replay('sujeto-b', principal, principal.clienteB)

    expect(await screen.findByText('Tu turno')).toBeInTheDocument()
    expect(resultado()).toHaveTextContent('Jugador usó Golpe con escudo contra nombre-de-sujeto-b')
    expect(screen.getByRole('heading', { name: 'Habilidades' })).toBeInTheDocument()
    // Las habilidades de B no estan en recarga: la recarga de A es de A.
    expect(screen.getByRole('button', { name: 'Usar Golpe con escudo' })).toHaveAttribute(
      'aria-disabled',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Usar Mano de piedra' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('en el turno de A tras el ataque del rival: sus tres habilidades con costo, estado y recarga tal cual Combat', async () => {
    // Hasta el ataque del rival (seq 3): es de nuevo el turno de A, con Poder 10 y la habilidad en recarga.
    const hastaElAtaqueDelRival = principal.clienteA.slice(0, 8)

    await replay('sujeto-a', principal, hastaElAtaqueDelRival)

    expect(await screen.findByText('Tu turno')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Habilidades' })).toBeInTheDocument()

    const escudo = screen.getByRole('button', { name: 'Usar Golpe con escudo' })
    const tormenta = screen.getByRole('button', { name: 'Usar Golpe de tormenta' })
    const piedra = screen.getByRole('button', { name: 'Usar Mano de piedra' })

    expect(escudo).toHaveAttribute('aria-disabled', 'true')
    expect(tormenta).toHaveAttribute('aria-disabled', 'false')
    expect(piedra).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getAllByText(/Disponible en 1 turno/u).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/todavía no está disponible en combate/u).length).toBeGreaterThan(0)
    expect(screen.getByText('6 de Poder')).toBeInTheDocument()
  })

  it('el ataque degradado real: jugador B ve por que se uso un ataque basico y no se gasto la habilidad', async () => {
    await replay('sujeto-b', degradada, degradada.clienteB)

    expect(await screen.findByText('Turno de Jugador')).toBeInTheDocument()
    expect(resultado()).toHaveTextContent(
      'No había Poder suficiente para Golpe con escudo. Se ejecutó un ataque básico en su lugar',
    )
    expect(resultado()).toHaveTextContent('la habilidad no se gastó ni quedó en recarga.')
    expect(screen.getByRole('meter', { name: 'Poder de nombre-de-sujeto-b' })).toHaveAttribute(
      'aria-valuemax',
      '1',
    )
  })
})
