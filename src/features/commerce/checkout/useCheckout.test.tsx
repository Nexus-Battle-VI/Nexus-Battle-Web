import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { createTestQueryClient } from '@/test/render'
import { jsonResponse } from '@/test/commerce-fixtures'
import { useCheckout } from './useCheckout'
import type { CheckoutSummary } from './api'

const summary = (id: string, version = 3): CheckoutSummary => ({
  id,
  version,
  status: 'DRAFT',
  currency: 'COP',
  total: 15000,
  itemCount: 1,
  lines: [
    {
      productId: 'product-1',
      sku: 'espada',
      name: 'Espada',
      quantity: 1,
      unitPrice: 15000,
      subtotal: 15000,
    },
  ],
})
const card = { holder: 'A', number: 'dato-solo-en-peticion', expiry: 'prueba', securityCode: 'x' }
afterEach(() => {
  vi.unstubAllGlobals()
})
const setup = () => {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}
describe('Coordinacion de checkout', () => {
  it('envia la version vigente, no cachea tarjeta y no reutiliza el exito en un segundo pedido', async () => {
    const fetcher = vi.fn((url: string, init: RequestInit) => {
      const id = url.includes('/order-2/') ? 'order-2' : 'order-1'
      if (init.method === 'POST')
        return Promise.resolve(
          jsonResponse({
            status: 'COMPLETED',
            order: { ...summary(id), status: 'CONFIRMED' },
            paymentReference: `sim-${id}`,
            maskedCard: 'test',
            realMoneyMoved: false,
          }),
        )
      return Promise.resolve(jsonResponse(summary(id)))
    })
    vi.stubGlobal('fetch', fetcher)
    const { wrapper, queryClient } = setup()
    const { result, rerender } = renderHook(({ id }) => useCheckout(id), {
      wrapper,
      initialProps: { id: 'order-1' },
    })
    await waitFor(() => {
      expect(result.current.summary?.version).toBe(3)
    })
    act(() => {
      result.current.pay(card)
    })
    await waitFor(() => {
      expect(result.current.result?.status).toBe('COMPLETED')
    })
    const post = fetcher.mock.calls.find(([, init]) => init.method === 'POST')
    expect(JSON.parse(post![1].body as string)).toEqual({ ...card, expectedVersion: 3 })
    expect(
      JSON.stringify(
        queryClient
          .getMutationCache()
          .getAll()
          .map((mutation) => mutation.state.variables),
      ),
    ).not.toContain(card.number)
    rerender({ id: 'order-2' })
    await waitFor(() => {
      expect(result.current.summary?.id).toBe('order-2')
    })
    expect(result.current.result).toBeNull()
    expect(result.current.paymentError).toBeNull()
    act(() => {
      result.current.pay(card)
    })
    await waitFor(() => {
      expect(result.current.result?.order.id).toBe('order-2')
    })
  })
  it('un resultado PROCESSING consulta recibo y termina sin reenviar el pago', async () => {
    let paid = false
    const fetcher = vi.fn((url: string, init: RequestInit) => {
      if (init.method === 'POST') {
        paid = true
        return Promise.resolve(
          jsonResponse({
            status: 'PROCESSING',
            order: { ...summary('order-1'), status: 'PROCESSING' },
            paymentReference: 'sim-1',
            maskedCard: 'test',
            realMoneyMoved: false,
          }),
        )
      }
      if (url.endsWith('/payment'))
        return Promise.resolve(
          jsonResponse({
            status: 'COMPLETED',
            order: { ...summary('order-1'), status: 'CONFIRMED' },
            paymentReference: 'sim-1',
            maskedCard: 'test',
            realMoneyMoved: false,
          }),
        )
      return Promise.resolve(
        jsonResponse({ ...summary('order-1'), status: paid ? 'PROCESSING' : 'DRAFT' }),
      )
    })
    vi.stubGlobal('fetch', fetcher)
    const { wrapper } = setup()
    const { result } = renderHook(() => useCheckout('order-1'), { wrapper })
    await waitFor(() => {
      expect(result.current.summary).not.toBeNull()
    })
    act(() => {
      result.current.pay(card)
    })
    await waitFor(() => {
      expect(result.current.result?.status).toBe('COMPLETED')
    })
    expect(fetcher.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(1)
    expect(
      fetcher.mock.calls.some(([url, init]) => url.endsWith('/payment') && init.method === 'GET'),
    ).toBe(true)
  })
})
