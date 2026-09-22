import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'

import { queryKeys } from '@/shared/query-keys'
import { createTestQueryClient } from '@/test/render'
import type { BattleRewardStatus } from './api'
import { ROOM_ID } from './fixtures'
import { useBattleReward } from './useBattleReward'

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const NONE_UNKNOWN: BattleRewardStatus = {
  creditsEarned: null,
  balance: null,
  victoryProgress: null,
  weeklyChestCount: null,
  chestEarned: null,
  rewardDelivery: 'NONE',
  reward: null,
}

const PENDING: BattleRewardStatus = {
  creditsEarned: 2,
  balance: null,
  victoryProgress: 12,
  weeklyChestCount: 0,
  chestEarned: null,
  rewardDelivery: 'PENDING',
  reward: null,
}

const NONE_SETTLED: BattleRewardStatus = {
  creditsEarned: 2,
  balance: 44,
  victoryProgress: 12,
  weeklyChestCount: 0,
  chestEarned: false,
  rewardDelivery: 'NONE',
  reward: null,
}

const CONFIRMED: BattleRewardStatus = {
  creditsEarned: 4,
  balance: 60,
  victoryProgress: 0,
  weeklyChestCount: 1,
  chestEarned: true,
  rewardDelivery: 'CONFIRMED',
  reward: { productId: 'p-1', sku: 'ARM-1', name: 'Armadura de Escamas' },
}

const wrapper =
  (queryClient: ReturnType<typeof createTestQueryClient>) =>
  ({ children }: { readonly children: ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useBattleReward — activacion y clave (HU-22)', () => {
  it('deshabilitado (batalla sin terminar) no consulta nada', async () => {
    const queryClient = createTestQueryClient()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, NONE_UNKNOWN))
    vi.stubGlobal('fetch', fetchImpl)

    renderHook(() => useBattleReward(ROOM_ID, false), { wrapper: wrapper(queryClient) })

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('habilitado consulta GET .../reward con la clave `battleRooms.reward`', async () => {
    const queryClient = createTestQueryClient()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, CONFIRMED))
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(() => useBattleReward(ROOM_ID, true), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(queryKeys.battleRooms.reward(ROOM_ID)).toEqual(['battle-rooms', 'reward', ROOM_ID])
    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/v1/combat/rooms/${ROOM_ID}/reward`,
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

/**
 * El flujo Combat -> Wallet -> Inventory puede tardar mas que el primer
 * render: estas pruebas fijan el reloj para probar que el sondeo SIGUE
 * mientras la entrega no llega a un estado final, y se DETIENE justo ahi
 * (ni antes, dejando de avisar, ni despues, insistiendo sin motivo).
 */
describe('useBattleReward — sondeo (HU-22): se detiene solo en un estado final', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('PENDING sigue sondeando: la entrega aun no llego a un estado final', async () => {
    const queryClient = createTestQueryClient()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, PENDING))
    vi.stubGlobal('fetch', fetchImpl)

    renderHook(() => useBattleReward(ROOM_ID, true), { wrapper: wrapper(queryClient) })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('NONE con balance aun desconocido sigue sondeando (el credito no se confirmo todavia)', async () => {
    const queryClient = createTestQueryClient()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, NONE_UNKNOWN))
    vi.stubGlobal('fetch', fetchImpl)

    renderHook(() => useBattleReward(ROOM_ID, true), { wrapper: wrapper(queryClient) })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('CONFIRMED detiene el sondeo: el cofre ya se entrego', async () => {
    const queryClient = createTestQueryClient()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, CONFIRMED))
    vi.stubGlobal('fetch', fetchImpl)

    renderHook(() => useBattleReward(ROOM_ID, true), { wrapper: wrapper(queryClient) })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('NONE con balance ya conocido detiene el sondeo: no corresponde cofre', async () => {
    const queryClient = createTestQueryClient()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, NONE_SETTLED))
    vi.stubGlobal('fetch', fetchImpl)

    renderHook(() => useBattleReward(ROOM_ID, true), { wrapper: wrapper(queryClient) })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
