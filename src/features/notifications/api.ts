import { httpClient } from '@/lib/http'
import type {
  CreateBannerCommand,
  PresentedAdminBanner,
  PresentedBanner,
  PresentedNotification,
} from './contract'

/**
 * Cliente HTTP de HU-38 (Notifications: novedades de catálogo y banner).
 *
 * Ninguna funcion envia `playerId`/`subject`/`userId`: el backend deriva al
 * jugador del testimonio (`httpClient` ya adjunta `Authorization`). Enviarlo
 * aqui permitiria a Web pedir notificaciones de otro jugador.
 */
interface ItemsResponse<T> {
  readonly items: readonly T[]
}

export const fetchPendingCatalogNotifications = (
  signal?: AbortSignal,
): Promise<readonly PresentedNotification[]> =>
  httpClient
    .get<ItemsResponse<PresentedNotification>>('/v1/notifications/me/pending', signal)
    .then((response) => response.items)

export const fetchCatalogNotificationHistory = (
  signal?: AbortSignal,
): Promise<readonly PresentedNotification[]> =>
  httpClient
    .get<ItemsResponse<PresentedNotification>>('/v1/notifications/me/history', signal)
    .then((response) => response.items)

/** `notificationIds` debe llevar TODOS los ids originales de las filas presentadas, no solo `id`. */
export const markCatalogNotificationsRead = (notificationIds: readonly string[]): Promise<void> =>
  httpClient
    .post<{ status: string }>('/v1/notifications/me/read', { notificationIds })
    .then(() => undefined)

/** El backend ya filtra por vigencia: los items devueltos son los vigentes ahora mismo. */
export const fetchActiveBanners = (signal?: AbortSignal): Promise<readonly PresentedBanner[]> =>
  httpClient
    .get<ItemsResponse<PresentedBanner>>('/v1/banners', signal)
    .then((response) => response.items)

export const fetchAdminBanners = (signal?: AbortSignal): Promise<readonly PresentedAdminBanner[]> =>
  httpClient
    .get<ItemsResponse<PresentedAdminBanner>>('/v1/admin/banners', signal)
    .then((response) => response.items)

export const createBanner = (command: CreateBannerCommand): Promise<{ id: string }> =>
  httpClient.post<{ id: string }>('/v1/admin/banners', command)
