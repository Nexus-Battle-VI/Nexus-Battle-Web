import clsx from 'clsx'

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
const LABELS: Readonly<Record<string, string>> = {
  PRODUCT_CREATED: 'Nuevo',
  PRODUCT_INVENTORY_ADJUSTED: 'Tiraje actualizado',
  PRODUCT_SUSPENDED: 'Suspendido',
  PRODUCT_REACTIVATED: 'Reactivado',
  PRODUCT_PREMIUM_CONFIGURED: 'Premium',
  AUCTION_CHANGED: 'Subasta actualizada',
  AUCTION_CLOSING_SOON: 'Cierre próximo',
  AUCTION_BID_OUTBID: 'Puja superada',
  AUCTION_CLOSED_BY_BUY_NOW: 'Compra inmediata',
  AUCTION_AUTO_BID_LIMIT_REACHED: 'Límite de puja alcanzado',
  AUCTION_SETTLED_SELLER: 'Subasta vendida',
  AUCTION_SETTLED_WINNER: 'Ganaste la subasta',
  AUCTION_SETTLED_LOSER: 'Subasta finalizada',
  AUCTION_SETTLED_WITHOUT_BIDS: 'Subasta sin pujas',
}

const TONE: Readonly<Record<string, string>> = {
  PRODUCT_CREATED: 'bg-success/15 text-success',
  PRODUCT_INVENTORY_ADJUSTED: 'bg-border text-muted',
  PRODUCT_SUSPENDED: 'bg-danger/15 text-danger',
  PRODUCT_REACTIVATED: 'bg-success/15 text-success',
  PRODUCT_PREMIUM_CONFIGURED: 'bg-brand/15 text-brand',
  AUCTION_CHANGED: 'bg-brand/15 text-brand',
  AUCTION_CLOSING_SOON: 'bg-warning/15 text-warning',
  AUCTION_BID_OUTBID: 'bg-warning/15 text-warning',
  AUCTION_CLOSED_BY_BUY_NOW: 'bg-brand/15 text-brand',
  AUCTION_AUTO_BID_LIMIT_REACHED: 'bg-warning/15 text-warning',
  AUCTION_SETTLED_SELLER: 'bg-success/15 text-success',
  AUCTION_SETTLED_WINNER: 'bg-success/15 text-success',
  AUCTION_SETTLED_LOSER: 'bg-border text-muted',
  AUCTION_SETTLED_WITHOUT_BIDS: 'bg-border text-muted',
}

export interface CatalogNotificationBadgeProps {
  readonly changeType: string
}

export const CatalogNotificationBadge = ({
  changeType,
}: CatalogNotificationBadgeProps): React.JSX.Element => (
  <span
    className={clsx(
      'inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
      TONE[changeType] ?? 'bg-border text-muted',
    )}
  >
    {LABELS[changeType] ?? changeType}
  </span>
)
