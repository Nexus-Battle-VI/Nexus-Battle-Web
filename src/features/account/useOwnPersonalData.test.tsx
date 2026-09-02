import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'

import { queryKeys } from '@/shared/query-keys'
import { createTestQueryClient } from '@/test/render'
import type { OwnPersonalData } from './api'
import { useOwnPersonalData } from './useOwnAccount'

const PERSONAL_DATA: OwnPersonalData = {
  email: 'valeria.privacidad@nexus.test',
  displayName: 'Valeria Privacidad',
  firstNames: 'Valeria',
  lastNames: 'Rios',
  roles: ['PLAYER'],
  termsAccepted: true,
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useOwnPersonalData', () => {
  it('consulta la proyeccion autorizada de privacidad con query key propia', async () => {
    const queryClient = createTestQueryClient()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, PERSONAL_DATA))
    vi.stubGlobal('fetch', fetchImpl)

    const wrapper = ({ children }: { readonly children: ReactNode }): React.JSX.Element => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useOwnPersonalData(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(queryKeys.account.privacy).toEqual(['account', 'me', 'privacy'])
    expect(url).toBe('/api/accounts/me/privacy')
    expect(init.method).toBe('GET')
    expect(init.signal).toBeDefined()
    expect(queryClient.getQueryData(queryKeys.account.privacy)).toEqual(PERSONAL_DATA)
    expect(result.current.data).toEqual(PERSONAL_DATA)
  })
})
