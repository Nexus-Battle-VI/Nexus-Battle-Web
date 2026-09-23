import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'

import { createTestQueryClient } from '@/test/render'
import { queryKeys } from '@/shared/query-keys'
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

const walletInvalidated = (invalidate: { mock: { calls: readonly unknown[][] } }): boolean =>
  invalidate.mock.calls.some((call) => {
    const key = (call[0] as { queryKey?: readonly unknown[] } | undefined)?.queryKey
    return JSON.stringify(key) === JSON.stringify(queryKeys.wallet.me)
  })

afterEach(() => {
  vi.unstubAllGlobals()
})

/** HU-23: todo lo que Wallet mueve por una apuesta refresca el saldo (cabecera incluida). */
describe('mutaciones de sala → saldo de Wallet', () => {
  it('crear APOSTANDO relee el saldo; crear sin apostar no', async () => {
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useCreateBattleRoom(), { wrapper })

    await act(() =>
      result.current.mutateAsync({
        mode: 'PVP',
        teamConfigs: [{ capacity: 1 }, { capacity: 1 }],
        reward: { amount: 0 },
      }),
    )
    expect(walletInvalidated(invalidate)).toBe(false)

    await act(() =>
      result.current.mutateAsync({
        mode: 'PVP',
        teamConfigs: [
          { capacity: 1, initialParticipants: [{ kind: 'HUMAN', stake: { amount: 200 } }] },
          { capacity: 1 },
        ],
        reward: { amount: 0 },
      }),
    )
    expect(walletInvalidated(invalidate)).toBe(true)
  })

  it('unirse APOSTANDO relee el saldo; unirse sin apostar no', async () => {
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useJoinBattleRoom(), { wrapper })

    await act(() => result.current.mutateAsync({ roomId: ROOM.id }))
    expect(walletInvalidated(invalidate)).toBe(false)

    await act(() => result.current.mutateAsync({ roomId: ROOM.id, stake: { amount: 50 } }))
    expect(walletInvalidated(invalidate)).toBe(true)
  })

  it.each([
    ['cancelar', useCancelBattleRoom],
    ['abandonar', useLeaveBattleRoom],
  ] as const)('%s relee el saldo (libera la apuesta)', async (_accion, useHook) => {
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useHook(), { wrapper })

    await act(() => result.current.mutateAsync(ROOM.id))

    expect(walletInvalidated(invalidate)).toBe(true)
  })
})
