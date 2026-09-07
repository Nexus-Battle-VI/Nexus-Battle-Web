/**
 * Contrato HTTP real de HU-38 (Notifications). No inventar campos: si el
 * backend no los devuelve, no existen aqui.
 */
export type CatalogNotificationChangeType =
  | 'PRODUCT_CREATED'
  | 'PRODUCT_INVENTORY_ADJUSTED'
  | 'PRODUCT_SUSPENDED'
  | 'PRODUCT_REACTIVATED'
  | 'PRODUCT_PREMIUM_CONFIGURED'

/**
 * Ya consolidada por el backend: `notificationIds` puede representar varias
 * notificaciones originales para el mismo producto. Web NO recalcula esto.
 */
export interface PresentedNotification {
  readonly id: string
  readonly notificationIds: readonly string[]
  readonly changeType: CatalogNotificationChangeType
  readonly description: string
  readonly productId: string | null
  readonly implementedAt: string
  readonly consolidatedCount: number
}

/** Ya filtrado por vigencia en el backend: Web no vuelve a comparar fechas. */
export interface PresentedBanner {
  readonly id: string
  readonly title: string
  readonly content: string
  readonly publishAt: string
  readonly expiresAt: string
}

export interface PresentedAdminBanner extends PresentedBanner {
  readonly status: string
  readonly isActive: boolean
  readonly createdBy: string
  readonly createdAt: string
}

export interface CreateBannerCommand {
  readonly title: string
  readonly content: string
  /** Instante ISO-8601, ya convertido desde el `datetime-local` del formulario. */
  readonly publishAt: string
  readonly expiresAt: string
}
