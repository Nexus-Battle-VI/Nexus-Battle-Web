import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useSession } from '@/shared/session'
import type { SocketFactory, TicketProvider } from '../realtime'
import {
  ANA,
  attackRejected,
  basicAttackResolved,
  BRUNO,
  combatBattle,
  ROOM_ID,
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

  attacks(): Record<string, unknown>[] {
    return this.commands().filter((command) => command.type === 'attack')
  }
}

const JWT = 'token-vigente'

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

/** Ana (A/0) con el turno (turnsCompleted = 1), 44/44 cada uno, ya sincronizada en el seq 1. */
const inBattle = async () => {
  const harness = setup()
  const hook = renderHook(() =>
    useBattleRealtime(ROOM_ID, harness.factory, harness.tickets, harness.commandIds),
  )
  const socket = await socketNumber(harness.sockets, 1)

  authenticate(socket)
  deliver(socket, snapshot(1, 'IN_BATTLE', combatBattle(1)), ready(1))

  return { ...harness, ...hook, socket }
}

/** El resultado del ataque de Ana (A/0) a Bruno (B/0): Bruno 44 -> 38, turno de Bruno. */
const anaHitsBruno = (seq: number, commandId: string): Record<string, unknown> =>
  basicAttackResolved({
    seq,
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

beforeEach(() => {
  useSession.setState({ subject: 'sujeto-ana', accessToken: JWT, expiresAt: Date.now() + 900_000 })
})

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.useRealTimers()
})

describe('useBattleRealtime — ataque basico (HU-18): la intencion', () => {
  it('envia SOLO {type, commandId, roomId, target}: ni Ataque, ni dano, ni Vida, ni turno, ni JWT', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })

    expect(socket.attacks()).toEqual([
      { type: 'attack', commandId: 'cmd-1', roomId: ROOM_ID, target: { teamLabel: 'B', seat: 0 } },
    ])
    expect(Object.keys(socket.attacks()[0]!).sort()).toEqual([
      'commandId',
      'roomId',
      'target',
      'type',
    ])
    expect(socket.sent.join('')).not.toContain(JWT)
  })

  it('el objetivo es UNO: nunca un arreglo ni datos extra, aunque el llamador pase de mas', async () => {
    const { result, socket } = await inBattle()
    const conExtras = { ...BRUNO, attackValue: 99, damage: 99 } as typeof BRUNO

    act(() => {
      result.current.sendAttack(conExtras)
    })

    expect(socket.attacks()[0]?.target).toEqual({ teamLabel: 'B', seat: 0 })
  })

  it('genera UN commandId por intencion y queda pendiente', async () => {
    const { result, commandIds } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })

    expect(commandIds).toHaveBeenCalledTimes(1)
    expect(result.current.attack).toEqual({
      intent: { commandId: 'cmd-1', target: { teamLabel: 'B', seat: 0 } },
      unconfirmed: false,
      rejection: null,
    })
  })

  it('un doble clic inmediato (en el mismo instante) envia UN solo comando', async () => {
    const { result, socket, commandIds } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
      result.current.sendAttack(BRUNO)
    })

    expect(socket.attacks()).toHaveLength(1)
    expect(commandIds).toHaveBeenCalledTimes(1)
  })

  it('con una intencion pendiente no se envia otra', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    act(() => {
      result.current.sendAttack(BRUNO)
    })

    expect(socket.attacks()).toHaveLength(1)
  })

  it('no envia nada si todavia no esta sincronizado (sin resume.ok)', async () => {
    const harness = setup()
    const { result } = renderHook(() =>
      useBattleRealtime(ROOM_ID, harness.factory, harness.tickets, harness.commandIds),
    )
    const socket = await socketNumber(harness.sockets, 1)

    authenticate(socket)
    deliver(socket, snapshot(1, 'IN_BATTLE', combatBattle(1)))

    act(() => {
      result.current.sendAttack(BRUNO)
    })

    expect(socket.attacks()).toHaveLength(0)
    expect(harness.commandIds).not.toHaveBeenCalled()
  })

  it('no envia nada sin sala', () => {
    const harness = setup()
    const { result } = renderHook(() =>
      useBattleRealtime(null, harness.factory, harness.tickets, harness.commandIds),
    )

    act(() => {
      result.current.sendAttack(BRUNO)
    })

    expect(harness.sockets).toHaveLength(0)
    expect(harness.commandIds).not.toHaveBeenCalled()
  })
})

describe('useBattleRealtime — ataque basico (HU-18): el resultado', () => {
  it('el resultado con el MISMO commandId cierra la intencion y actualiza Vida, turno y resultado', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    deliver(socket, anaHitsBruno(2, 'cmd-1'))

    expect(result.current.attack).toEqual({ intent: null, unconfirmed: false, rejection: null })
    expect(result.current.lastSeq).toBe(2)
    expect(result.current.battle?.combatants?.[0]?.health).toEqual({ current: 38, max: 44 })
    expect(result.current.battle?.currentTurn.displayName).toBe('Bruno')
    expect(result.current.lastAttack).toMatchObject({
      commandId: 'cmd-1',
      targetHealth: { before: 44, after: 38 },
    })
  })

  it('el resultado del ataque de OTRO participante actualiza la batalla pero no cierra MI intencion', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    deliver(socket, anaHitsBruno(2, 'cmd-de-otro'))

    expect(result.current.attack.intent?.commandId).toBe('cmd-1')
    expect(result.current.lastSeq).toBe(2)
  })

  it('un basicAttackResolved malformado se ignora: ni Vida, ni turno, ni intencion', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    deliver(socket, { ...anaHitsBruno(2, 'cmd-1'), resolution: { effective: true } })

    expect(result.current.lastSeq).toBe(1)
    expect(result.current.attack.intent?.commandId).toBe('cmd-1')
    expect(result.current.lastAttack).toBeNull()
  })

  it('un evento de otra sala se ignora', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    deliver(socket, { ...anaHitsBruno(2, 'cmd-1'), roomId: '99999999-9999-4999-8999-999999999999' })

    expect(result.current.lastSeq).toBe(1)
    expect(result.current.attack.intent).not.toBeNull()
  })

  it('el mismo evento entregado dos veces no resta Vida dos veces ni repite el resultado', async () => {
    const { result, socket } = await inBattle()

    deliver(socket, anaHitsBruno(2, 'cmd-1'), anaHitsBruno(2, 'cmd-1'))

    expect(result.current.lastSeq).toBe(2)
    expect(result.current.battle?.combatants?.[0]?.health?.current).toBe(38)
  })

  it('un salto de seq NO se aplica y pide `resume` con el ultimo seq aplicado', async () => {
    const { result, socket } = await inBattle()

    deliver(socket, anaHitsBruno(4, 'cmd-1'))

    await waitFor(() => {
      expect(socket.commands().filter((command) => command.type === 'resume')).toEqual([
        { type: 'resume', roomId: ROOM_ID },
        { type: 'resume', roomId: ROOM_ID, lastSeq: 1 },
      ])
    })
    expect(result.current.battle?.combatants?.[0]?.health?.current).toBe(44)
    expect(result.current.lastSeq).toBe(1)
  })
})

describe('useBattleRealtime — ataque basico (HU-18): rechazos', () => {
  it('un rechazo del ataque cierra la intencion, guarda el codigo y NO vuelve inaccesible la batalla', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    deliver(socket, attackRejected('NOT_YOUR_TURN', 'cmd-1'))

    expect(result.current.attack).toEqual({
      intent: null,
      unconfirmed: false,
      rejection: 'NOT_YOUR_TURN',
    })
    expect(result.current.rejected).toBeNull()
    expect(result.current.battle).not.toBeNull()
  })

  it('tras el rechazo se puede intentar de nuevo, con un commandId NUEVO (es otra intencion)', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    deliver(socket, attackRejected('TARGET_UNAVAILABLE', 'cmd-1'))
    act(() => {
      result.current.sendAttack(BRUNO)
    })

    expect(socket.attacks().map((command) => command.commandId)).toEqual(['cmd-1', 'cmd-2'])
    expect(result.current.attack.rejection).toBeNull()
  })

  it('un rechazo de OTRO commandId no toca mi intencion', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    deliver(socket, attackRejected('NOT_YOUR_TURN', 'cmd-ajeno'))

    expect(result.current.attack.intent?.commandId).toBe('cmd-1')
    expect(result.current.attack.rejection).toBeNull()
  })

  it('un rechazo de `resume` (sin `command`) sigue haciendo inaccesible la batalla (HU-17)', async () => {
    const { result, socket } = await inBattle()

    deliver(socket, { type: 'command.rejected', code: 'NOT_A_PARTICIPANT' })

    expect(result.current.rejected).toBe('NOT_A_PARTICIPANT')
    expect(result.current.attack.rejection).toBeNull()
  })

  it('un rechazo de otro comando (no `attack`) no marca la batalla como inaccesible', async () => {
    const { result, socket } = await inBattle()

    deliver(socket, { type: 'command.rejected', command: 'chat.send', code: 'RATE_LIMITED' })

    expect(result.current.rejected).toBeNull()
    expect(result.current.attack.rejection).toBeNull()
  })

  it('cerrar el aviso limpia el rechazo', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    deliver(socket, attackRejected('INVALID_TARGET', 'cmd-1'))
    act(() => {
      result.current.dismissAttackRejection()
    })

    expect(result.current.attack.rejection).toBeNull()
  })
})

describe('useBattleRealtime — ataque basico (HU-18): reintento y reconexion', () => {
  it('COMMAND_CONFLICT deja la intencion sin confirmar y «reintentar» reenvia el MISMO commandId', async () => {
    const { result, socket, commandIds } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    deliver(socket, attackRejected('COMMAND_CONFLICT', 'cmd-1'))

    expect(result.current.attack.unconfirmed).toBe(true)
    expect(result.current.attack.rejection).toBeNull()

    act(() => {
      result.current.retryAttack()
    })

    expect(socket.attacks().map((command) => command.commandId)).toEqual(['cmd-1', 'cmd-1'])
    expect(socket.attacks()[1]).toEqual(socket.attacks()[0])
    expect(commandIds).toHaveBeenCalledTimes(1)
    expect(result.current.attack.unconfirmed).toBe(false)
  })

  it('«reintentar» sin duda (nada pendiente o ya confirmado) no envia nada', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.retryAttack()
    })
    act(() => {
      result.current.sendAttack(BRUNO)
    })
    act(() => {
      result.current.retryAttack()
    })

    expect(socket.attacks()).toHaveLength(1)
  })

  it('un doble clic en «reintentar» no envia dos veces', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    deliver(socket, attackRejected('COMMAND_CONFLICT', 'cmd-1'))
    act(() => {
      result.current.retryAttack()
      result.current.retryAttack()
    })

    expect(socket.attacks()).toHaveLength(2)
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

  it('si se corta la conexion con un ataque pendiente NO se reenvia solo, ni con el mismo ni con otro commandId', async () => {
    const { result, socket, sockets, commandIds } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    const second = await dropAndReconnect(socket, sockets)

    expect(result.current.attack).toMatchObject({
      intent: { commandId: 'cmd-1' },
      unconfirmed: true,
    })

    authenticate(second)

    // Tras reconectar solo se pide `resume` con el ultimo seq: NINGUN `attack` automatico.
    expect(second.commands()).toEqual([{ type: 'resume', roomId: ROOM_ID, lastSeq: 1 }])
    expect(second.attacks()).toHaveLength(0)
    expect(socket.attacks()).toHaveLength(1)
    expect(commandIds).toHaveBeenCalledTimes(1)
  })

  it('tras reconectar, el `resume` reenvia el resultado de MI comando: cierra la intencion y muestra el resultado', async () => {
    const { result, socket, sockets } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    const second = await dropAndReconnect(socket, sockets)

    authenticate(second)
    deliver(second, anaHitsBruno(2, 'cmd-1'), ready(2))

    expect(result.current.attack).toEqual({ intent: null, unconfirmed: false, rejection: null })
    expect(result.current.battle?.combatants?.[0]?.health?.current).toBe(38)
    expect(result.current.lastAttack?.commandId).toBe('cmd-1')
    expect(result.current.synced).toBe(true)
  })

  it('reconectado y sin resultado, el jugador puede reintentar con el MISMO commandId (idempotente)', async () => {
    const { result, socket, sockets, commandIds } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })
    const second = await dropAndReconnect(socket, sockets)

    authenticate(second)
    deliver(second, ready(1))
    act(() => {
      result.current.retryAttack()
    })

    expect(second.attacks()).toEqual([
      { type: 'attack', commandId: 'cmd-1', roomId: ROOM_ID, target: { teamLabel: 'B', seat: 0 } },
    ])
    expect(commandIds).toHaveBeenCalledTimes(1)
  })

  it('mientras la conexion esta caida no se envia nada aunque el jugador insista', async () => {
    const { result, socket, sockets } = await inBattle()

    await dropAndReconnect(socket, sockets)
    act(() => {
      result.current.sendAttack(BRUNO)
    })

    expect(socket.attacks()).toHaveLength(0)
    expect(result.current.attack.intent).toBeNull()
  })
})
