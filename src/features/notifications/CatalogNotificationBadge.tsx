import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { localizedMessages } from '@/shared/i18n/messages'

/**
 * Etiqueta de PRESENTACION del tipo de cambio (HU-38). La logica funcional
 * depende siempre de `changeType`, nunca de analizar el texto de `description`.
 *
 * Componente feature-local y no una ampliacion de `StatusBadge`: `changeType`
 * no es un estado de entidad (como PUBLISHED/SUSPENDED), es un tipo de
 * cambio, y forzarlo en el diccionario global de `StatusBadge` mezclaria dos
 * vocabularios distintos.
 *
 * Los diccionarios se tipan con clave `string` (no la union estrecha de
 * `CatalogNotificationChangeType`), a proposito, igual que `StatusBadge`: el
 * backend es la fuente de verdad, y un `changeType` que el frontend todavia
 * no reconoce debe perder el estilo/etiqueta especifica, no reventar la
 * pantalla.
 */
/** Etiquetas en el idioma activo (`notifications:changeTypes.*`), se traducen al leerse. */
const LABELS: Readonly<Record<string, string>> = localizedMessages({
  PRODUCT_CREATED: 'notifications:changeTypes.PRODUCT_CREATED',
  PRODUCT_INVENTORY_ADJUSTED: 'notifications:changeTypes.PRODUCT_INVENTORY_ADJUSTED',
  PRODUCT_SUSPENDED: 'notifications:changeTypes.PRODUCT_SUSPENDED',
  PRODUCT_REACTIVATED: 'notifications:changeTypes.PRODUCT_REACTIVATED',
  PRODUCT_PREMIUM_CONFIGURED: 'notifications:changeTypes.PRODUCT_PREMIUM_CONFIGURED',
  AUCTION_CHANGED: 'notifications:changeTypes.AUCTION_CHANGED',
  AUCTION_CLOSING_SOON: 'notifications:changeTypes.AUCTION_CLOSING_SOON',
  AUCTION_BID_OUTBID: 'notifications:changeTypes.AUCTION_BID_OUTBID',
  AUCTION_CLOSED_BY_BUY_NOW: 'notifications:changeTypes.AUCTION_CLOSED_BY_BUY_NOW',
  AUCTION_AUTO_BID_LIMIT_REACHED: 'notifications:changeTypes.AUCTION_AUTO_BID_LIMIT_REACHED',
  AUCTION_SETTLED_SELLER: 'notifications:changeTypes.AUCTION_SETTLED_SELLER',
  AUCTION_SETTLED_WINNER: 'notifications:changeTypes.AUCTION_SETTLED_WINNER',
  AUCTION_SETTLED_LOSER: 'notifications:changeTypes.AUCTION_SETTLED_LOSER',
  AUCTION_SETTLED_WITHOUT_BIDS: 'notifications:changeTypes.AUCTION_SETTLED_WITHOUT_BIDS',
})

const TONE: Readonly<Record<string, string>> = {
  PRODUCT_CREATED: 'bg-success/15 text-success',
  PRODUCT_INVENTORY_ADJUSTED: 'bg-border text-muted',
  PRODUCT_SUSPENDED: 'bg-danger/15 text-danger',
  PRODUCT_REACTIVATED: 'bg-success/15 text-success',
  PRODUCT_PREMIUM_CONFIGURED: 'bg-brand/15 text-brand',
  AUCTION_CHANGED: 'bg-brand/15 text-brand',
  AUCTION_CLOSING_SOON: 'bg-warning/15 text-warning',
}

export interface CatalogNotificationBadgeProps {
  readonly changeType: string
}

export const CatalogNotificationBadge = ({
  changeType,
}: CatalogNotificationBadgeProps): React.JSX.Element => {
  // Se suscribe al idioma: la etiqueta se vuelve a pintar al cambiarlo.
  useTranslation()

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONE[changeType] ?? 'bg-border text-muted',
      )}
    >
      {LABELS[changeType] ?? changeType}
    </span>
  )
}
