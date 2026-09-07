import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createBanner,
  fetchActiveBanners,
  fetchAdminBanners,
  fetchCatalogNotificationHistory,
  fetchPendingCatalogNotifications,
  markCatalogNotificationsRead,
} from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const stubFetch = (response: Response) => {
  const fetchImpl = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchImpl)

  return fetchImpl
}

const urlOf = (fetchImpl: ReturnType<typeof stubFetch>): string =>
  String(fetchImpl.mock.calls[0]?.[0])

const initOf = (fetchImpl: ReturnType<typeof stubFetch>): RequestInit =>
  fetchImpl.mock.calls[0]?.[1] as RequestInit

const NOTIFICATION = {
  id: 'n1',
  notificationIds: ['n1'],
  changeType: 'PRODUCT_CREATED',
  description: 'Se agregó "Piedra de afilar" al catálogo.',
  productId: 'p-1',
  implementedAt: '2026-09-06T10:00:00.000Z',
  consolidatedCount: 1,
}

const BANNER = {
  id: 'b1',
  title: 'Mantenimiento programado',
  content: 'El catálogo estará en mantenimiento el sábado.',
  publishAt: '2026-09-06T00:00:00.000Z',
  expiresAt: '2026-09-10T00:00:00.000Z',
}

describe('api de notificaciones de catalogo y banner (HU-38)', () => {
  it('fetchPendingCatalogNotifications consulta /v1/notifications/me/pending sin identificar al jugador', async () => {
    const fetchImpl = stubFetch(jsonResponse({ items: [NOTIFICATION] }))

    const items = await fetchPendingCatalogNotifications()

    expect(urlOf(fetchImpl)).toContain('/v1/notifications/me/pending')
    expect(urlOf(fetchImpl)).not.toMatch(/playerId|subject|userId/u)
    expect(items).toEqual([NOTIFICATION])
  })

  it('fetchCatalogNotificationHistory consulta /v1/notifications/me/history', async () => {
    const fetchImpl = stubFetch(jsonResponse({ items: [NOTIFICATION] }))

    const items = await fetchCatalogNotificationHistory()

    expect(urlOf(fetchImpl)).toContain('/v1/notifications/me/history')
    expect(items).toEqual([NOTIFICATION])
  })

  it('markCatalogNotificationsRead envia POST con notificationIds exactos', async () => {
    const fetchImpl = stubFetch(jsonResponse({ status: 'ok' }))

    await markCatalogNotificationsRead(['n1', 'n2', 'n3', 'n4'])

    expect(urlOf(fetchImpl)).toContain('/v1/notifications/me/read')
    expect(initOf(fetchImpl).method).toBe('POST')
    expect(JSON.parse(initOf(fetchImpl).body as string)).toEqual({
      notificationIds: ['n1', 'n2', 'n3', 'n4'],
    })
  })

  it('fetchActiveBanners consulta /v1/banners', async () => {
    const fetchImpl = stubFetch(jsonResponse({ items: [BANNER] }))

    const items = await fetchActiveBanners()

    expect(urlOf(fetchImpl)).toContain('/v1/banners')
    expect(items).toEqual([BANNER])
  })

  it('fetchAdminBanners consulta /v1/admin/banners', async () => {
    const fetchImpl = stubFetch(
      jsonResponse({
        items: [
          {
            ...BANNER,
            status: 'ACTIVE',
            isActive: true,
            createdBy: 'admin-1',
            createdAt: BANNER.publishAt,
          },
        ],
      }),
    )

    const items = await fetchAdminBanners()

    expect(urlOf(fetchImpl)).toContain('/v1/admin/banners')
    expect(items[0]?.isActive).toBe(true)
  })

  it('createBanner envia POST con el payload exacto del comando', async () => {
    const fetchImpl = stubFetch(jsonResponse({ id: 'b1' }, 201))

    const command = {
      title: 'Mantenimiento programado',
      content: 'El catálogo estará en mantenimiento el sábado.',
      publishAt: '2026-09-06T00:00:00.000Z',
      expiresAt: '2026-09-10T00:00:00.000Z',
    }

    const result = await createBanner(command)

    expect(urlOf(fetchImpl)).toContain('/v1/admin/banners')
    expect(initOf(fetchImpl).method).toBe('POST')
    expect(JSON.parse(initOf(fetchImpl).body as string)).toEqual(command)
    expect(result).toEqual({ id: 'b1' })
  })
})
