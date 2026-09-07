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
}

const TONE: Readonly<Record<string, string>> = {
  PRODUCT_CREATED: 'bg-success/15 text-success',
  PRODUCT_INVENTORY_ADJUSTED: 'bg-border text-muted',
  PRODUCT_SUSPENDED: 'bg-danger/15 text-danger',
  PRODUCT_REACTIVATED: 'bg-success/15 text-success',
  PRODUCT_PREMIUM_CONFIGURED: 'bg-brand/15 text-brand',
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
