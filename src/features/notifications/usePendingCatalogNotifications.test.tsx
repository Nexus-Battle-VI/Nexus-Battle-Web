import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { useOwnedInventory } from '@/features/player-inventory/useOwnedInventory'
import { CatalogNotificationsSummary } from './CatalogNotificationsSummary'

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

beforeEach(() => {
  useSession.setState({
    subject: 'sujeto-ana',
    accessToken: 'token-de-sesion',
    expiresAt: Date.now() + 900_000,
  })
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

const INVENTORY_PAGE = { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }

/** Sonda minima: monta "Mi Inventario" junto a las novedades, en la misma pagina. */
const InventoryProbe = (): React.JSX.Element => {
  useOwnedInventory({ page: 1, term: '', type: null })
  return <div data-testid="inventory-probe" />
}

describe('usePendingCatalogNotifications (HU-30): invalidar inventario tras un drop', () => {
  it('una notificacion BATTLE_DROP_GAINED fuerza una relectura de "Mi Inventario"', async () => {
    const fetchImpl = vi.fn((url: string) => {
      if (url.includes('/me/pending')) {
        return Promise.resolve(
          jsonResponse({
            items: [
              notification({
                changeType: 'BATTLE_DROP_GAINED',
                description: 'Obtuviste espada-legendaria por una derrota en Versus.',
                productId: null,
              }),
            ],
          }),
        )
      }
      if (url.includes('/me/read')) return Promise.resolve(jsonResponse({ status: 'ok' }))
      if (url.includes('/inventories/me/items'))
        return Promise.resolve(jsonResponse(INVENTORY_PAGE))
      return Promise.resolve(jsonResponse({ message: `Ruta inesperada: ${url}` }, 404))
    })
    vi.stubGlobal('fetch', fetchImpl)

    renderWithProviders(
      <>
        <InventoryProbe />
        <CatalogNotificationsSummary />
      </>,
    )

    await screen.findByText('Pieza obtenida')

    const callsToInventory = () =>
      fetchImpl.mock.calls.filter(([url]) => url.includes('/inventories/me/items'))

    await waitFor(() => {
      expect(callsToInventory().length).toBeGreaterThanOrEqual(1)
    })

    // La invalidacion dispara una SEGUNDA lectura ademas del montaje inicial:
    // no es solo que "Mi Inventario" haya cargado una vez, es que se releyo
    // DESPUES de enterarse del drop.
    await waitFor(() => {
      expect(callsToInventory().length).toBeGreaterThanOrEqual(2)
    })
  })

  it('una notificacion que no es de drop NO fuerza una relectura adicional de inventario', async () => {
    const fetchImpl = vi.fn((url: string) => {
      if (url.includes('/me/pending'))
        return Promise.resolve(jsonResponse({ items: [notification()] }))
      if (url.includes('/me/read')) return Promise.resolve(jsonResponse({ status: 'ok' }))
      if (url.includes('/inventories/me/items'))
        return Promise.resolve(jsonResponse(INVENTORY_PAGE))
      return Promise.resolve(jsonResponse({ message: `Ruta inesperada: ${url}` }, 404))
    })
    vi.stubGlobal('fetch', fetchImpl)

    renderWithProviders(
      <>
        <InventoryProbe />
        <CatalogNotificationsSummary />
      </>,
    )

    await screen.findByText('Se agregó "Piedra de afilar" al catálogo.')

    await waitFor(() => {
      expect(fetchImpl.mock.calls.some(([url]) => url.includes('/me/read'))).toBe(true)
    })

    const callsToInventory = fetchImpl.mock.calls.filter(([url]) =>
      url.includes('/inventories/me/items'),
    )
    expect(callsToInventory).toHaveLength(1)
  })
})
