import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'

import { createTestQueryClient } from '@/test/render'
import { queryKeys } from '@/shared/query-keys'
import type { CreateBattleRoomInput } from './types'
import {
  useCancelBattleRoom,
  useCreateBattleRoom,
  useJoinBattleRoom,
  useLeaveBattleRoom,
} from './hooks'

const ROOM = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    { label: 'A', capacity: 1, participants: [] },
    { label: 'B', capacity: 1, participants: [] },
  ],
  reward: { amount: 0 },
  createdBy: 'sujeto-ana',
  createdAt: '2026-09-23T00:00:00.000Z',
  version: 1,
}

const setup = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(ROOM), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ),
  )
  const queryClient = createTestQueryClient()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { invalidate, wrapper }
}

const invalidatedKeys = (invalidate: { mock: { calls: readonly unknown[][] } }): string[] =>
  invalidate.mock.calls.map((call) =>
    JSON.stringify((call[0] as { queryKey?: readonly unknown[] } | undefined)?.queryKey),
  )

const LIST = JSON.stringify(queryKeys.battleRooms.list)
const MINE = JSON.stringify(queryKeys.battleRooms.mine)
const WALLET = JSON.stringify(queryKeys.wallet.me)

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * HU-15 + HU-23: toda mutacion de sala refresca el listado publico y "mis
 * salas"; ademas, lo que Wallet mueve por una apuesta refresca el saldo
 * (cabecera incluida). Sin apuesta, el saldo NO se relee.
 */
describe('mutaciones de sala → listado, mis salas y saldo de Wallet', () => {
  const STAKED_CREATE: CreateBattleRoomInput = {
    mode: 'PVP' as const,
    teamConfigs: [
      { capacity: 1, initialParticipants: [{ kind: 'HUMAN' as const, stake: { amount: 200 } }] },
      { capacity: 1 },
    ],
    reward: { amount: 0 },
  }
  const PLAIN_CREATE: CreateBattleRoomInput = {
    mode: 'PVP' as const,
    teamConfigs: [{ capacity: 1 }, { capacity: 1 }],
    reward: { amount: 0 },
  }

  it('CASO 1: crear SIN apuesta → list + mine, sin wallet', async () => {
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useCreateBattleRoom(), { wrapper })

    await act(() => result.current.mutateAsync(PLAIN_CREATE))

    expect(invalidatedKeys(invalidate)).toEqual(expect.arrayContaining([LIST, MINE]))
    expect(invalidatedKeys(invalidate)).not.toContain(WALLET)
  })

  it('CASO 2: crear CON apuesta → list + mine + wallet', async () => {
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useCreateBattleRoom(), { wrapper })

    await act(() => result.current.mutateAsync(STAKED_CREATE))

    expect(invalidatedKeys(invalidate)).toEqual(expect.arrayContaining([LIST, MINE, WALLET]))
  })

  it('CASO 3: unirse SIN apuesta → list + mine, sin wallet', async () => {
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useJoinBattleRoom(), { wrapper })

    await act(() => result.current.mutateAsync({ roomId: ROOM.id }))

    expect(invalidatedKeys(invalidate)).toEqual(expect.arrayContaining([LIST, MINE]))
    expect(invalidatedKeys(invalidate)).not.toContain(WALLET)
  })

  it('CASO 4: unirse CON apuesta → list + mine + wallet', async () => {
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useJoinBattleRoom(), { wrapper })

    await act(() => result.current.mutateAsync({ roomId: ROOM.id, stake: { amount: 50 } }))

    expect(invalidatedKeys(invalidate)).toEqual(expect.arrayContaining([LIST, MINE, WALLET]))
  })

  it.each([
    ['CASO 5: cancelar', useCancelBattleRoom],
    ['CASO 6: abandonar', useLeaveBattleRoom],
  ] as const)('%s → list + mine + wallet (libera la apuesta)', async (_caso, useHook) => {
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useHook(), { wrapper })

    await act(() => result.current.mutateAsync(ROOM.id))

    expect(invalidatedKeys(invalidate)).toEqual(expect.arrayContaining([LIST, MINE, WALLET]))
  })
})
