import type { CatalogNotificationChangeType } from './contract'

/**
 * Manifiesto de los iconos de PixelLab de las notificaciones (EN-031). Es el
 * UNICO sitio que sabe que fichero de `public/assets/notifications/icons/`
 * corresponde a cada familia. Procedencia: `docs/assets/inventario-activos.md`.
 */
export const NOTIFICATION_ICON_NAMES = [
  'catalog',
  'auction',
  'loot',
  'system',
  'credits',
  'battle',
  'victory',
  'expiring',
  'sanction',
  'confirmed',
  'banner',
  'new',
] as const

export type NotificationIconName = (typeof NOTIFICATION_ICON_NAMES)[number]

export type NotificationTheme = 'dark' | 'light'

export const notificationIconSrc = (icon: NotificationIconName, theme: NotificationTheme): string =>
  `/assets/notifications/icons/icon-${icon}-${theme}.png`

/**
 * Familia visual de cada tipo de cambio. Clave `string` y no la union, igual
 * que `CatalogNotificationBadge`: un tipo que Web aun no conoce cae en el
 * icono generico en lugar de romper la fila.
 */
const ICON_BY_CHANGE_TYPE: Readonly<Record<CatalogNotificationChangeType, NotificationIconName>> = {
  PRODUCT_CREATED: 'new',
  PRODUCT_INVENTORY_ADJUSTED: 'catalog',
  PRODUCT_SUSPENDED: 'sanction',
  PRODUCT_REACTIVATED: 'confirmed',
  PRODUCT_PREMIUM_CONFIGURED: 'credits',
  AUCTION_CHANGED: 'auction',
  AUCTION_CLOSING_SOON: 'expiring',
  AUCTION_BID_OUTBID: 'auction',
  AUCTION_CLOSED_BY_BUY_NOW: 'credits',
  AUCTION_AUTO_BID_LIMIT_REACHED: 'expiring',
  AUCTION_SETTLED_SELLER: 'credits',
  AUCTION_SETTLED_WINNER: 'victory',
  AUCTION_SETTLED_LOSER: 'auction',
  AUCTION_SETTLED_WITHOUT_BIDS: 'auction',
  AUCTION_PUBLISHED: 'auction',
  AUCTION_NEW_BID: 'credits',
  AUCTION_BID_ACCEPTED: 'confirmed',
  BATTLE_DROP_GAINED: 'loot',
  BATTLE_DROP_LOST: 'battle',
}

export const iconForChangeType = (changeType: string): NotificationIconName =>
  (ICON_BY_CHANGE_TYPE as Readonly<Record<string, NotificationIconName>>)[changeType] ?? 'system'
