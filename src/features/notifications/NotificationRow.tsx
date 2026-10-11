import { formatDateTime } from '@/lib/format'

import { CatalogNotificationBadge } from './CatalogNotificationBadge'
import type { PresentedNotification } from './contract'
import { iconForChangeType } from './notificationIcons'
import { NotificationPixelIcon } from './NotificationPixelIcon'
import './notifications.css'

/**
 * Una notificacion presentada (EN-031): icono de su familia, etiqueta del
 * tipo, texto y fecha. Compartida por el resumen, el historial y la campana
 * para que las tres se lean igual. El texto es el que escribe el backend; la
 * logica nunca lo analiza (HU-38).
 */
export const NotificationRow = ({
  item,
}: {
  readonly item: PresentedNotification
}): React.JSX.Element => (
  <div className="nb-notice">
    <span className="nb-notice-plate">
      <NotificationPixelIcon icon={iconForChangeType(item.changeType)} />
    </span>
    <div className="min-w-0 flex-1">
      <CatalogNotificationBadge changeType={item.changeType} />
      <p className="mt-1 text-sm text-ink">{item.description}</p>
      <p className="mt-0.5 text-xs text-muted">{formatDateTime(item.implementedAt)}</p>
    </div>
  </div>
)
