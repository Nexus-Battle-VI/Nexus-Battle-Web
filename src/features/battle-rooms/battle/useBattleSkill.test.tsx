import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useSession } from '@/shared/session'
import type { SocketFactory, TicketProvider } from '../realtime'
import {
  ANA,
  attackRejected,
  basicAttackResolved,
  BRUNO,
  degradedAttackResolved,
  recharging,
  ROOM_ID,
  SHIELD_STRIKE,
  skillBattle,
  skillRejected,
  skillUsed,
  snapshot,
} from './fixtures'
import { useBattleRealtime } from './useBattleRealtime'

/** Doble minimo de `WebSocket`: suficiente para lo que la conexion usa. */
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

  /** Mensajes enviados por el cliente, ya parseados (sin el `auth`). */
  commands(): Record<string, unknown>[] {
    return this.sent.map((raw) => JSON.parse(raw) as Record<string, unknown>).slice(1)
  }

  skills(): Record<string, unknown>[] {
    return this.commands().filter((command) => command.type === 'useSkill')
  }

  attacks(): Record<string, unknown>[] {
    return this.commands().filter((command) => command.type === 'attack')
  }
}

const JWT = 'token-vigente'
const ABILITY = SHIELD_STRIKE.abilityId

const setup = () => {
  const sockets: FakeSocket[] = []
  const factory: SocketFactory = (url) => {
    const socket = new FakeSocket(url)
    sockets.push(socket)
    return socket as unknown as WebSocket
  }
  let issued = 0
  const tickets = vi.fn<TicketProvider>(() => Promise.resolve(`ticket-${String((issued += 1))}`))
  let ids = 0
  const commandIds = vi.fn(() => `cmd-${String((ids += 1))}`)

  return { sockets, factory, tickets, commandIds }
}

const socketNumber = async (sockets: FakeSocket[], count: number): Promise<FakeSocket> => {
  await waitFor(() => {
    expect(sockets).toHaveLength(count)
  })
  return sockets[count - 1]!
}

const authenticate = (socket: FakeSocket): void => {
  act(() => {
    socket.open()
    socket.message({ type: 'auth.ok' })
  })
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

/** Ana (A/0) con el turno (turnsCompleted = 1), Poder 10/10, ya sincronizada en el seq 1. */
const inBattle = async () => {
  const harness = setup()
  const hook = renderHook(() =>
    useBattleRealtime(ROOM_ID, harness.factory, harness.tickets, harness.commandIds),
  )
  const socket = await socketNumber(harness.sockets, 1)

  authenticate(socket)
  deliver(socket, snapshot(1, 'IN_BATTLE', skillBattle(1)), ready(1))

  return { ...harness, ...hook, socket }
}

/** Ana usa Golpe con escudo contra Bruno: Poder 10 -> 8, recarga 1, Bruno 44 -> 38, turno de Bruno. */
const anaUsesShield = (seq: number, commandId: string): Record<string, unknown> =>
  skillUsed({
    seq,
    commandId,
    actor: ANA,
    target: BRUNO,
    power: { before: 10, after: 8 },
    before: 44,
    after: 38,
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

beforeEach(() => {
  useSession.setState({ subject: 'sujeto-ana', accessToken: JWT, expiresAt: Date.now() + 900_000 })
})

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.useRealTimers()
})

describe('useBattleRealtime — habilidad (HU-19): la intencion', () => {
  it('envia SOLO {type, commandId, roomId, abilityId, target}: ni costo, ni Poder, ni dano, ni turno, ni JWT', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })

    expect(socket.skills()).toEqual([
      {
        type: 'useSkill',
        commandId: 'cmd-1',
        roomId: ROOM_ID,
        abilityId: ABILITY,
        target: { teamLabel: 'B', seat: 0 },
      },
    ])
    expect(Object.keys(socket.skills()[0]!).sort()).toEqual([
      'abilityId',
      'commandId',
      'roomId',
      'target',
      'type',
    ])
    expect(socket.sent.join('')).not.toContain(JWT)
  })

  it('el objetivo es UNO: nunca datos extra, aunque el llamador pase de mas', async () => {
    const { result, socket } = await inBattle()
    const conExtras = { ...BRUNO, attackValue: 99, damage: 99, power: 99 } as typeof BRUNO

    act(() => {
      result.current.sendSkill(ABILITY, conExtras)
    })

    expect(socket.skills()[0]?.target).toEqual({ teamLabel: 'B', seat: 0 })
  })

  it('genera UN commandId por intencion y queda pendiente con la habilidad y el objetivo', async () => {
    const { result, commandIds } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })

    expect(commandIds).toHaveBeenCalledTimes(1)
    expect(result.current.skill).toEqual({
      intent: { commandId: 'cmd-1', abilityId: ABILITY, target: { teamLabel: 'B', seat: 0 } },
      unconfirmed: false,
      rejection: null,
    })
  })

  it('un doble clic inmediato envia UN solo comando (no se cobra dos veces)', async () => {
    const { result, socket, commandIds } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
      result.current.sendSkill(ABILITY, BRUNO)
    })

    expect(socket.skills()).toHaveLength(1)
    expect(commandIds).toHaveBeenCalledTimes(1)
  })

  it('con una habilidad pendiente NO se envia ni otra habilidad ni un ataque (una accion por turno)', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    act(() => {
      result.current.sendSkill('otra-habilidad', BRUNO)
    })
    act(() => {
      result.current.sendAttack(BRUNO)
    })

    expect(socket.skills()).toHaveLength(1)
    expect(socket.attacks()).toHaveLength(0)
  })

  it('con un ataque pendiente NO se envia una habilidad', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })

    expect(socket.attacks()).toHaveLength(1)
    expect(socket.skills()).toHaveLength(0)
  })

  it('no envia nada si todavia no esta sincronizado (sin resume.ok)', async () => {
    const harness = setup()
    const { result } = renderHook(() =>
      useBattleRealtime(ROOM_ID, harness.factory, harness.tickets, harness.commandIds),
    )
    const socket = await socketNumber(harness.sockets, 1)

    authenticate(socket)
    deliver(socket, snapshot(1, 'IN_BATTLE', skillBattle(1)))

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })

    expect(socket.skills()).toHaveLength(0)
    expect(harness.commandIds).not.toHaveBeenCalled()
  })

  it('no envia nada sin sala', () => {
    const harness = setup()
    const { result } = renderHook(() =>
      useBattleRealtime(null, harness.factory, harness.tickets, harness.commandIds),
    )

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })

    expect(harness.sockets).toHaveLength(0)
    expect(harness.commandIds).not.toHaveBeenCalled()
  })
})

describe('useBattleRealtime — habilidad (HU-19): el resultado', () => {
  it('skillUsed con el MISMO commandId cierra la intencion y actualiza Poder, recarga, Vida, turno y resultado', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(socket, anaUsesShield(2, 'cmd-1'))

    expect(result.current.skill).toEqual({ intent: null, unconfirmed: false, rejection: null })
    expect(result.current.lastSeq).toBe(2)
    expect(result.current.battle?.combatants?.[1]?.power).toEqual({ current: 8, max: 10 })
    expect(result.current.battle?.combatants?.[1]?.skills?.[0]).toMatchObject({
      status: 'RECHARGING',
      cooldownRemaining: 1,
    })
    expect(result.current.battle?.combatants?.[0]?.health).toEqual({ current: 38, max: 44 })
    expect(result.current.battle?.currentTurn.displayName).toBe('Bruno')
    expect(result.current.lastSkill).toMatchObject({
      commandId: 'cmd-1',
      power: { before: 10, after: 8 },
      cooldown: { remainingTurns: 1 },
    })
  })

  it('el skillUsed de OTRO participante actualiza la batalla pero no cierra MI intencion', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(socket, anaUsesShield(2, 'cmd-de-otro'))

    expect(result.current.skill.intent?.commandId).toBe('cmd-1')
    expect(result.current.lastSeq).toBe(2)
  })

  it('Poder insuficiente: la habilidad llega como un ataque basico con el MISMO commandId y cierra la intencion SIN error', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(
      socket,
      degradedAttackResolved({
        seq: 2,
        commandId: 'cmd-1',
        abilityId: ABILITY,
        attacker: ANA,
        target: BRUNO,
        before: 44,
        after: 38,
        completedPosition: 1,
        view: skillBattle(2, [
          [38, 44],
          [44, 44],
        ]),
      }),
    )

    expect(result.current.skill).toEqual({ intent: null, unconfirmed: false, rejection: null })
    expect(result.current.attack).toEqual({ intent: null, unconfirmed: false, rejection: null })
    expect(result.current.lastAttack?.degradedFrom).toMatchObject({
      reason: 'INSUFFICIENT_POWER',
      abilityId: ABILITY,
    })
    expect(result.current.lastSkill).toBeNull()
  })

  it('un basicAttackResolved normal NO cierra una intencion de habilidad de otro commandId', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(
      socket,
      basicAttackResolved({
        seq: 2,
        commandId: 'cmd-del-rival',
        attacker: BRUNO,
        target: ANA,
        before: 44,
        after: 38,
        view: skillBattle(2),
      }),
    )

    expect(result.current.skill.intent?.commandId).toBe('cmd-1')
  })

  it('un skillUsed malformado se ignora: ni Poder, ni turno, ni intencion', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(socket, { ...anaUsesShield(2, 'cmd-1'), power: { before: 8, after: 10 } })

    expect(result.current.lastSeq).toBe(1)
    expect(result.current.skill.intent?.commandId).toBe('cmd-1')
    expect(result.current.lastSkill).toBeNull()
  })

  it('un evento de otra sala se ignora', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(socket, {
      ...anaUsesShield(2, 'cmd-1'),
      roomId: '99999999-9999-4999-8999-999999999999',
    })

    expect(result.current.lastSeq).toBe(1)
    expect(result.current.skill.intent).not.toBeNull()
  })

  it('el mismo evento entregado dos veces no cobra el Poder dos veces ni repite el resultado', async () => {
    const { result, socket } = await inBattle()

    deliver(socket, anaUsesShield(2, 'cmd-1'), anaUsesShield(2, 'cmd-1'))

    expect(result.current.lastSeq).toBe(2)
    expect(result.current.battle?.combatants?.[1]?.power?.current).toBe(8)
  })

  it('un salto de seq NO se aplica y pide `resume` con el ultimo seq aplicado', async () => {
    const { result, socket } = await inBattle()

    deliver(socket, anaUsesShield(4, 'cmd-1'))

    await waitFor(() => {
      expect(socket.commands().filter((command) => command.type === 'resume')).toEqual([
        { type: 'resume', roomId: ROOM_ID },
        { type: 'resume', roomId: ROOM_ID, lastSeq: 1 },
      ])
    })
    expect(result.current.battle?.combatants?.[1]?.power?.current).toBe(10)
    expect(result.current.lastSeq).toBe(1)
  })
})

describe('useBattleRealtime — habilidad (HU-19): rechazos', () => {
  it.each([
    'SKILL_ON_COOLDOWN',
    'UNKNOWN_SKILL',
    'UNSUPPORTED_SKILL_EFFECT',
    'SKILLS_NOT_AVAILABLE',
    'NOT_YOUR_TURN',
  ])(
    'un rechazo %s cierra la intencion, guarda el codigo y NO vuelve inaccesible la batalla',
    async (code) => {
      const { result, socket } = await inBattle()

      act(() => {
        result.current.sendSkill(ABILITY, BRUNO)
      })
      deliver(socket, skillRejected(code, 'cmd-1'))

      expect(result.current.skill).toEqual({ intent: null, unconfirmed: false, rejection: code })
      expect(result.current.rejected).toBeNull()
      expect(result.current.battle).not.toBeNull()
    },
  )

  it('un rechazo de habilidad NO toca la intencion de ataque ni al reves', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(socket, attackRejected('NOT_YOUR_TURN', 'cmd-1'))

    expect(result.current.skill.intent?.commandId).toBe('cmd-1')
    expect(result.current.skill.rejection).toBeNull()
  })

  it('tras el rechazo se puede intentar de nuevo, con un commandId NUEVO (es otra intencion)', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(socket, skillRejected('SKILL_ON_COOLDOWN', 'cmd-1'))
    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })

    expect(socket.skills().map((command) => command.commandId)).toEqual(['cmd-1', 'cmd-2'])
    expect(result.current.skill.rejection).toBeNull()
  })

  it('un rechazo de OTRO commandId no toca mi intencion', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(socket, skillRejected('SKILL_ON_COOLDOWN', 'cmd-ajeno'))

    expect(result.current.skill.intent?.commandId).toBe('cmd-1')
    expect(result.current.skill.rejection).toBeNull()
  })

  it('cerrar el aviso limpia el rechazo', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(socket, skillRejected('UNKNOWN_SKILL', 'cmd-1'))
    act(() => {
      result.current.dismissSkillRejection()
    })

    expect(result.current.skill.rejection).toBeNull()
  })
})

describe('useBattleRealtime — habilidad (HU-19): reintento y reconexion', () => {
  it('COMMAND_CONFLICT deja la intencion sin confirmar y «reintentar» reenvia el MISMO commandId, habilidad y objetivo', async () => {
    const { result, socket, commandIds } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(socket, skillRejected('COMMAND_CONFLICT', 'cmd-1'))

    expect(result.current.skill.unconfirmed).toBe(true)
    expect(result.current.skill.rejection).toBeNull()

    act(() => {
      result.current.retrySkill()
    })

    expect(socket.skills().map((command) => command.commandId)).toEqual(['cmd-1', 'cmd-1'])
    expect(socket.skills()[1]).toEqual(socket.skills()[0])
    expect(commandIds).toHaveBeenCalledTimes(1)
    expect(result.current.skill.unconfirmed).toBe(false)
  })

  it('«reintentar» sin duda no envia nada', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.retrySkill()
    })
    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    act(() => {
      result.current.retrySkill()
    })

    expect(socket.skills()).toHaveLength(1)
  })

  it('un doble clic en «reintentar» no envia dos veces', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    deliver(socket, skillRejected('COMMAND_CONFLICT', 'cmd-1'))
    act(() => {
      result.current.retrySkill()
      result.current.retrySkill()
    })

    expect(socket.skills()).toHaveLength(2)
  })

  /** Corta el socket y deja llegar la reconexion (backoff de 1 s); devuelve el socket nuevo, sin autenticar. */
  const dropAndReconnect = async (
    first: FakeSocket,
    sockets: FakeSocket[],
  ): Promise<FakeSocket> => {
    vi.useFakeTimers()
    act(() => {
      first.close()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    vi.useRealTimers()

    return socketNumber(sockets, 2)
  }

  it('si se corta la conexion con una habilidad pendiente NO se reenvia sola, ni con el mismo ni con otro commandId', async () => {
    const { result, socket, sockets, commandIds } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    const second = await dropAndReconnect(socket, sockets)

    expect(result.current.skill).toMatchObject({
      intent: { commandId: 'cmd-1', abilityId: ABILITY },
      unconfirmed: true,
    })

    authenticate(second)

    expect(second.commands()).toEqual([{ type: 'resume', roomId: ROOM_ID, lastSeq: 1 }])
    expect(second.skills()).toHaveLength(0)
    expect(socket.skills()).toHaveLength(1)
    expect(commandIds).toHaveBeenCalledTimes(1)
  })

  it('tras reconectar, el `resume` reenvia el resultado de MI habilidad: cierra la intencion y muestra el resultado', async () => {
    const { result, socket, sockets } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    const second = await dropAndReconnect(socket, sockets)

    authenticate(second)
    deliver(second, anaUsesShield(2, 'cmd-1'), ready(2))

    expect(result.current.skill).toEqual({ intent: null, unconfirmed: false, rejection: null })
    expect(result.current.battle?.combatants?.[1]?.power?.current).toBe(8)
    expect(result.current.lastSkill?.commandId).toBe('cmd-1')
    expect(result.current.synced).toBe(true)
  })

  it('reconectado y sin resultado, el jugador puede reintentar con el MISMO commandId (idempotente)', async () => {
    const { result, socket, sockets, commandIds } = await inBattle()

    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })
    const second = await dropAndReconnect(socket, sockets)

    authenticate(second)
    deliver(second, ready(1))
    act(() => {
      result.current.retrySkill()
    })

    expect(second.skills()).toEqual([
      {
        type: 'useSkill',
        commandId: 'cmd-1',
        roomId: ROOM_ID,
        abilityId: ABILITY,
        target: { teamLabel: 'B', seat: 0 },
      },
    ])
    expect(commandIds).toHaveBeenCalledTimes(1)
  })

  it('mientras la conexion esta caida no se envia nada aunque el jugador insista', async () => {
    const { result, socket, sockets } = await inBattle()

    await dropAndReconnect(socket, sockets)
    act(() => {
      result.current.sendSkill(ABILITY, BRUNO)
    })

    expect(socket.skills()).toHaveLength(0)
    expect(result.current.skill.intent).toBeNull()
  })
})
