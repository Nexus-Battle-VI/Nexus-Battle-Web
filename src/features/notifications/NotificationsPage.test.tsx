import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { NotificationsPage } from './NotificationsPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('NotificationsPage: historial de novedades (HU-38)', () => {
  it('ya no es un marcador de posicion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [] })))

    renderWithProviders(<NotificationsPage />)

    expect(
      await screen.findByRole('heading', { name: 'Novedades del catálogo' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/todavia no esta implementada/u)).not.toBeInTheDocument()
  })

  it('consulta history, no pending, y nunca marca nada como leido', async () => {
    const fetchImpl = vi.fn((url: string) =>
      Promise.resolve(
        url.includes('/me/history')
          ? jsonResponse({
              items: [
                {
                  id: 'n1',
                  notificationIds: ['n1'],
                  changeType: 'PRODUCT_SUSPENDED',
                  description: '"Machete" fue suspendido temporalmente.',
                  productId: 'p-1',
                  implementedAt: '2026-09-01T00:00:00.000Z',
                  consolidatedCount: 1,
                },
              ],
            })
          : jsonResponse({ message: `Ruta inesperada: ${url}` }, 404),
      ),
    )
    vi.stubGlobal('fetch', fetchImpl)

    renderWithProviders(<NotificationsPage />)

    expect(await screen.findByText('"Machete" fue suspendido temporalmente.')).toBeInTheDocument()
    expect(screen.getByText('Suspendido')).toBeInTheDocument()

    expect(fetchImpl.mock.calls.some(([url]: [string]) => url.includes('/me/pending'))).toBe(false)
    expect(fetchImpl.mock.calls.some(([url]: [string]) => url.includes('/me/read'))).toBe(false)
  })

  it('muestra un estado vacio cuando no hay historial', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [] })))

    renderWithProviders(<NotificationsPage />)

    expect(await screen.findByText('Todavía no hay novedades registradas.')).toBeInTheDocument()
  })

  it('un fallo al consultar el historial se muestra sin informacion tecnica', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Error' }, 500)))

    renderWithProviders(<NotificationsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar el historial de novedades',
    )
  })
})
