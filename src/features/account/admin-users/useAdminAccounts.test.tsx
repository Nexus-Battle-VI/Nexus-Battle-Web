import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'

import { queryKeys } from '@/shared/query-keys'
import { createTestQueryClient } from '@/test/render'
import { useAdminAccounts } from './useAdminAccounts'

const response = (): Response =>
  new Response(
    JSON.stringify({
      items: [],
      statusCounts: { pendingVerification: 0, active: 0, suspended: 0 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAdminAccounts', () => {
  it('consulta y cachea por los criterios aplicados, no por el estado draft', async () => {
    const queryClient = createTestQueryClient()
    const fetchImpl = vi.fn().mockResolvedValue(response())
    vi.stubGlobal('fetch', fetchImpl)
    const criteria = { displayName: 'Capitana Panel', role: 'ADMINISTRATOR' } as const

    const wrapper = ({ children }: { readonly children: ReactNode }): React.JSX.Element => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useAdminAccounts(criteria), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const criteriaKey = '?nickname=Capitana+Panel&role=ADMINISTRATOR'
    expect(queryKeys.account.adminUsers(criteriaKey)).toEqual([
      'account',
      'admin-users',
      criteriaKey,
    ])
    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/accounts${criteriaKey}`,
      expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) }),
    )
    expect(queryClient.getQueryData(queryKeys.account.adminUsers(criteriaKey))).toEqual(
      result.current.data,
    )
  })
})
