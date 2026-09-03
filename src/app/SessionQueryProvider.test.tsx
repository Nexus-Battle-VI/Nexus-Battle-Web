import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'

import { httpClient } from '@/lib/http'
import { useSession } from '@/shared/session'
import { jsonResponse } from '@/test/commerce-fixtures'
import { SessionQueryProvider } from './SessionQueryProvider'

const PrivateData = (): React.JSX.Element => {
  // Incluso una clave historica sin sujeto queda aislada por el proveedor.
  const query = useQuery({
    queryKey: ['private'],
    queryFn: ({ signal }) => httpClient.get<{ owner: string }>('/orders/cart', signal),
  })
  return <p>{query.data?.owner ?? 'Cargando sesion'}</p>
}
const Harness = (): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  return (
    <SessionQueryProvider key={subject ?? 'signed-out'}>
      {subject !== null && <PrivateData />}
    </SessionQueryProvider>
  )
}
afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  vi.unstubAllGlobals()
})

describe('Aislamiento de la cache al cambiar de identidad', () => {
  it('no muestra datos de A durante la carga de B aunque sigan frescos', async () => {
    let resolveB: ((response: Response) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        const token = new Headers(init.headers).get('authorization')
        return token === 'Bearer token-A'
          ? Promise.resolve(jsonResponse({ owner: 'Carrito de A' }))
          : new Promise<Response>((resolve) => {
              resolveB = resolve
            })
      }),
    )
    useSession.setState({ subject: 'A', accessToken: 'token-A', expiresAt: Date.now() + 60000 })
    render(<Harness />)
    expect(await screen.findByText('Carrito de A')).toBeInTheDocument()
    act(() => {
      useSession.setState({ subject: null, accessToken: null })
    })
    act(() => {
      useSession.setState({ subject: 'B', accessToken: 'token-B' })
    })
    expect(screen.queryByText('Carrito de A')).not.toBeInTheDocument()
    expect(screen.getByText('Cargando sesion')).toBeInTheDocument()
    await waitFor(() => {
      expect(resolveB).toBeDefined()
    })
    resolveB!(jsonResponse({ owner: 'Carrito de B' }))
    expect(await screen.findByText('Carrito de B')).toBeInTheDocument()
  })
  it('cancela una lectura anterior y descarta su respuesta tardia', async () => {
    let oldSignal: AbortSignal | null | undefined
    let resolveA: ((response: Response) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        if (new Headers(init.headers).get('authorization') === 'Bearer token-A') {
          oldSignal = init.signal
          return new Promise<Response>((resolve) => {
            resolveA = resolve
          })
        }
        return Promise.resolve(jsonResponse({ owner: 'Solo B' }))
      }),
    )
    useSession.setState({ subject: 'A', accessToken: 'token-A', expiresAt: Date.now() + 60000 })
    render(<Harness />)
    await waitFor(() => {
      expect(resolveA).toBeDefined()
    })
    act(() => {
      useSession.setState({ subject: 'B', accessToken: 'token-B' })
    })
    expect(await screen.findByText('Solo B')).toBeInTheDocument()
    expect(oldSignal?.aborted).toBe(true)
    await act(async () => {
      resolveA!(jsonResponse({ owner: 'Respuesta tardia de A' }))
      await Promise.resolve()
    })
    expect(screen.queryByText('Respuesta tardia de A')).not.toBeInTheDocument()
  })
})
