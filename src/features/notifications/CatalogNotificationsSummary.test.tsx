import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { CatalogNotificationsSummary } from './CatalogNotificationsSummary'

afterEach(() => {
  vi.unstubAllGlobals()
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const notification = (overrides: Record<string, unknown> = {}) => ({
  id: 'n1',
  notificationIds: ['n1'],
  changeType: 'PRODUCT_CREATED',
  description: 'Se agregó "Piedra de afilar" al catálogo.',
  productId: 'p-1',
  implementedAt: '2026-09-06T10:00:00.000Z',
  consolidatedCount: 1,
  ...overrides,
})

describe('CatalogNotificationsSummary (HU-38, Task #185)', () => {
  it('sin pendientes no renderiza ningun panel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [] })))

    const { container } = renderWithProviders(<CatalogNotificationsSummary />)

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })

  it('presenta las novedades y marca como leido DESPUES de renderizar, con los ids exactos', async () => {
    const fetchImpl = vi.fn((url: string) => {
      if (url.includes('/me/pending')) {
        return Promise.resolve(
          jsonResponse({
            items: [
              notification({ id: 'n1' }),
              notification({
                id: 'n2',
                notificationIds: ['n2'],
                description: 'Se agregó "Escudo del Guardián" al catálogo.',
              }),
            ],
          }),
        )
      }
      if (url.includes('/me/read')) {
        return Promise.resolve(jsonResponse({ status: 'ok' }))
      }
      return Promise.resolve(jsonResponse({ message: `Ruta inesperada: ${url}` }, 404))
    })
    vi.stubGlobal('fetch', fetchImpl)

    renderWithProviders(<CatalogNotificationsSummary />)

    expect(await screen.findByText('Se agregó "Piedra de afilar" al catálogo.')).toBeInTheDocument()
    expect(screen.getByText('Se agregó "Escudo del Guardián" al catálogo.')).toBeInTheDocument()
    expect(screen.getAllByText('Nuevo')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /Ver historial/u })).toHaveAttribute(
      'href',
      '/notifications',
    )

    // El GET pending ocurrio ANTES del POST read: el orden de llamadas lo prueba.
    await waitFor(() => {
      const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][]
      expect(calls.find(([url]) => url.includes('/me/read'))).toBeDefined()
    })

    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][]
    const pendingCallIndex = calls.findIndex(([url]) => url.includes('/me/pending'))
    const readCallIndex = calls.findIndex(([url]) => url.includes('/me/read'))
    expect(pendingCallIndex).toBeLessThan(readCallIndex)

    const readInit = calls[readCallIndex]?.[1]
    expect(readInit?.method).toBe('POST')
    expect(JSON.parse(readInit?.body as string)).toEqual({ notificationIds: ['n1', 'n2'] })
  })

  it('CA-03: una fila consolidada envia TODOS sus notificationIds, no solo el id de presentacion', async () => {
    const fetchImpl = vi.fn((url: string) => {
      if (url.includes('/me/pending')) {
        return Promise.resolve(
          jsonResponse({
            items: [
              notification({
                id: 'n1',
                notificationIds: ['n1', 'n2', 'n3', 'n4'],
                changeType: 'PRODUCT_INVENTORY_ADJUSTED',
                description: 'Armadura de Escamas tuvo 4 actualizaciones recientes; ver detalle',
                consolidatedCount: 4,
              }),
            ],
          }),
        )
      }
      if (url.includes('/me/read')) return Promise.resolve(jsonResponse({ status: 'ok' }))
      return Promise.resolve(jsonResponse({ message: 'Ruta inesperada' }, 404))
    })
    vi.stubGlobal('fetch', fetchImpl)

    renderWithProviders(<CatalogNotificationsSummary />)

    // Una SOLA fila, no cuatro.
    expect(
      await screen.findByText('Armadura de Escamas tuvo 4 actualizaciones recientes; ver detalle'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)

    await waitFor(() => {
      const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][]
      const readInit = calls.find(([url]) => url.includes('/me/read'))?.[1]
      expect(readInit).toBeDefined()
      expect(JSON.parse(readInit?.body as string)).toEqual({
        notificationIds: ['n1', 'n2', 'n3', 'n4'],
      })
    })
  })

  it('no duplica el POST read para el mismo lote en un re-render', async () => {
    const fetchImpl = vi.fn((url: string) => {
      if (url.includes('/me/pending'))
        return Promise.resolve(jsonResponse({ items: [notification()] }))
      if (url.includes('/me/read')) return Promise.resolve(jsonResponse({ status: 'ok' }))
      return Promise.resolve(jsonResponse({ message: 'Ruta inesperada' }, 404))
    })
    vi.stubGlobal('fetch', fetchImpl)

    const { rerender } = renderWithProviders(<CatalogNotificationsSummary />)
    await screen.findByText('Se agregó "Piedra de afilar" al catálogo.')

    await waitFor(() => {
      expect(fetchImpl.mock.calls.filter(([url]) => url.includes('/me/read'))).toHaveLength(1)
    })

    rerender(<CatalogNotificationsSummary />)
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(fetchImpl.mock.calls.filter(([url]) => url.includes('/me/read'))).toHaveLength(1)
  })

  it('un fallo al consultar pendientes muestra un error discreto, sin romper el resto de la pagina', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Error' }, 500)))

    renderWithProviders(<CatalogNotificationsSummary />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las novedades del catálogo',
    )
  })
})
