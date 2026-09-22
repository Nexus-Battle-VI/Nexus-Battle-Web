import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { createTestQueryClient } from '@/test/render'
import type { WalletSnapshot } from './api'
import { useWallet } from './useWallet'

const SNAPSHOT: WalletSnapshot = {
  balance: 42,
  victoryProgress: 6,
  weeklyChestCount: 0,
  weeklyChestLimit: 2,
  threshold: 20,
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('useWallet (HU-22)', () => {
  it('con sesion, consulta el saldo propio con la clave `wallet.me`', async () => {
    useSession.setState({
      subject: 'sujeto-ana',
      accessToken: 'token-vigente',
      expiresAt: Date.now() + 900_000,
    })
    const queryClient = createTestQueryClient()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, SNAPSHOT))
    vi.stubGlobal('fetch', fetchImpl)

    const wrapper = ({ children }: { readonly children: ReactNode }): React.JSX.Element => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useWallet(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(queryKeys.wallet.me).toEqual(['wallet', 'me'])
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/wallet/me', expect.objectContaining({ method: 'GET' }))
    expect(result.current.data).toEqual(SNAPSHOT)
  })

  it('sin sesion no consulta el saldo: anonimo no tiene wallet propia', async () => {
    const queryClient = createTestQueryClient()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, SNAPSHOT))
    vi.stubGlobal('fetch', fetchImpl)

    const wrapper = ({ children }: { readonly children: ReactNode }): React.JSX.Element => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    renderHook(() => useWallet(), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
