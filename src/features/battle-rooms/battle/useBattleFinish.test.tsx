import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useSession } from '@/shared/session'
import type { SocketFactory, TicketProvider } from '../realtime'
import {
  ANA,
  attackRejected,
  battleFinished,
  BRUNO,
  combatBattle,
  noWinnerResult,
  ROOM_ID,
  snapshot,
  turnAdvanced,
  winResult,
} from './fixtures'
import { useBattleRealtime } from './useBattleRealtime'

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

  commands(): Record<string, unknown>[] {
    return this.sent.map((raw) => JSON.parse(raw) as Record<string, unknown>).slice(1)
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

const inBattle = async (serverTime?: string) => {
  const harness = setup()
  const hook = renderHook(() =>
    useBattleRealtime(ROOM_ID, harness.factory, harness.tickets, harness.commandIds),
  )

  await waitFor(() => {
    expect(harness.sockets).toHaveLength(1)
  })

  const socket = harness.sockets[0]!

  authenticate(socket)
  deliver(
    socket,
    snapshot(1, 'IN_BATTLE', combatBattle(1)),
    serverTime === undefined
      ? { type: 'resume.ok', roomId: ROOM_ID, seq: 1 }
      : { type: 'resume.ok', roomId: ROOM_ID, seq: 1, serverTime },
  )

  return { ...harness, ...hook, socket }
}

beforeEach(() => {
  useSession.setState({ subject: 'sujeto-ana', accessToken: JWT, expiresAt: Date.now() + 900_000 })
})

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('useBattleRealtime — finalizacion (HU-21)', () => {
  it('recibe `battleFinished`: guarda el resultado y bloquea cualquier accion', async () => {
    const { result, socket } = await inBattle()

    deliver(socket, battleFinished(winResult(), combatBattle(2), 2))

    expect(result.current.result).toEqual(winResult())
    expect(result.current.roomStatus).toBe('FINISHED')

    act(() => {
      result.current.sendAttack(BRUNO)
      result.current.sendSkill('habilidad-1', BRUNO)
      result.current.retryAttack()
      result.current.retrySkill()
    })

    // El unico comando del cliente es el `resume` inicial; ninguna accion sale.
    expect(
      socket
        .commands()
        .filter((command) => command.type === 'attack' || command.type === 'useSkill'),
    ).toEqual([])
  })

  it('una intencion pendiente se cierra al llegar el final, sin aviso de error', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })

    expect(result.current.attack.intent).not.toBeNull()

    deliver(socket, battleFinished(noWinnerResult(), combatBattle(2), 2))

    expect(result.current.attack.intent).toBeNull()
    expect(result.current.attack.rejection).toBeNull()
    expect(result.current.skill.intent).toBeNull()
  })

  it('un BATTLE_NOT_ACTIVE sobre una accion pendiente la cierra sin dejar «Atacando…»', async () => {
    const { result, socket } = await inBattle()

    act(() => {
      result.current.sendAttack(BRUNO)
    })

    deliver(socket, attackRejected('BATTLE_NOT_ACTIVE', 'cmd-1'))

    expect(result.current.attack.intent).toBeNull()
    expect(result.current.attack.rejection).toBeNull()
  })

  it('`resume.ok.serverTime` crea el reloj de visualizacion; sin el, no hay reloj', async () => {
    const withClock = await inBattle('2026-09-21T10:00:00.000Z')

    expect(withClock.result.current.serverClock?.serverAtSyncMs).toBe(
      Date.parse('2026-09-21T10:00:00.000Z'),
    )

    const withoutClock = await inBattle()

    expect(withoutClock.result.current.serverClock).toBeNull()
  })

  it('un refresh tras el final recupera el resultado por el `snapshot`', async () => {
    const { result, socket } = await inBattle()

    deliver(socket, snapshot(3, 'FINISHED', combatBattle(2), winResult()), {
      type: 'resume.ok',
      roomId: ROOM_ID,
      seq: 3,
    })

    expect(result.current.result).toEqual(winResult())
    expect(result.current.roomStatus).toBe('FINISHED')
  })

  it('ningun evento posterior al final cambia el estado', async () => {
    const { result, socket } = await inBattle()

    deliver(socket, battleFinished(winResult(), combatBattle(2), 2))

    const afterFinish = result.current

    deliver(socket, turnAdvanced(3, 3, combatBattle(1)))

    expect(result.current.result).toEqual(afterFinish.result)
    expect(result.current.lastSeq).toBe(afterFinish.lastSeq)
    expect(result.current.lastTurnTimeout).toBeNull()
  })
})

describe('useBattleRealtime — turno perdido (HU-21)', () => {
  it('guarda el ultimo `turnTimedOut` para la franja de resultado', async () => {
    const { result, socket } = await inBattle()

    deliver(socket, {
      type: 'turnTimedOut',
      seq: 2,
      roomId: ROOM_ID,
      occurredAt: '2026-09-21T10:00:30.000Z',
      completedPosition: 0,
      timedOut: ANA,
      battle: combatBattle(1),
    })

    expect(result.current.lastTurnTimeout).toEqual({
      seq: 2,
      timedOut: ANA,
      occurredAt: '2026-09-21T10:00:30.000Z',
    })
  })
})
