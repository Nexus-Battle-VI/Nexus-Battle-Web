import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Clock, Package, RefreshCw } from '@/components/ui/icons'
import { formatDateTime } from '@/lib/format'
import { fetchCanonicalProduct } from '@/features/catalog/api'
import { queryKeys } from '@/shared/query-keys'
import type { PendingClaim } from './api'
import { i18n } from '@/shared/i18n/i18n'
import { formatInteger } from '@/shared/i18n/format'

/** `2500` -> `2.500 créditos`. Misma duplicacion local que `auto-bid`/`bidding`: una feature no importa de otra. */
const formatCredits = (amount: number): string => {
  const value = Math.trunc(amount)

  return i18n.t('common:count.credits', { count: value, value: formatInteger(value) })
}

/**
 * Estado de presentacion de la tarjeta.
 *
 * `PendingClaim.claimStatus` (el contrato real de HU-69.2) solo distingue
 * PENDING/CLAIMED: el listado nunca devuelve un item EXPIRED porque el
 * repositorio de Auction filtra por PENDING (HU-69.2) y el vencimiento
 * definitivo (HU-69.6) es un proceso en segundo plano que retira el item de
 * ese mismo listado, no un tercer valor de este campo. "EXPIRED" en esta
 * tarjeta es un estado LOCAL que `PendingClaimsPage` sintetiza cuando el
 * servidor rechaza un intento de reclamo con 422 (plazo vencido) o cuando un
 * item del reclamo en bloque vuelve con `status: 'EXPIRED'` -en ambos casos
 * el contrato real SI distingue ese motivo, solo que no como un tercer valor
 * de `claimStatus`.
 */
export type PendingClaimDisplayStatus = PendingClaim['claimStatus'] | 'EXPIRED'

export interface PendingClaimCardProps {
  readonly claim: PendingClaim
  readonly displayStatus: PendingClaimDisplayStatus
  readonly selected: boolean
  readonly claiming: boolean
  readonly onToggleSelected: (auctionId: string) => void
  readonly onClaim: (auctionId: string) => void
}

/** `label` es la clave de traduccion de la etiqueta. */
const STATUS_META: Readonly<Record<PendingClaimDisplayStatus, { label: string; tone: string }>> = {
  PENDING: { label: 'auction:claims.status.PENDING', tone: 'bg-warning/15 text-warning' },
  CLAIMED: { label: 'auction:claims.status.CLAIMED', tone: 'bg-success/15 text-success' },
  EXPIRED: { label: 'auction:claims.status.EXPIRED', tone: 'bg-danger/15 text-danger' },
}

const PendingClaimStatusBadge = ({
  status,
}: {
  readonly status: PendingClaimDisplayStatus
}): React.JSX.Element => {
  const meta = STATUS_META[status]
  const { t } = useTranslation()

  return (
    <span
      className={clsx(
        'inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        meta.tone,
      )}
    >
      {t(meta.label)}
    </span>
  )
}

/**
 * Producto ganado pendiente de reclamo (HU-69.7).
 *
 * El listado de HU-69.2 no trae nombre ni categoria del producto -solo
 * `productId`-, asi que la tarjeta consulta el catalogo canonico
 * (`fetchCanonicalProduct`, mismo contrato que `AuctionDetailPage`) para
 * mostrarlos; mientras carga o si falla, usa el `productId` como respaldo.
 * No hay campo de rareza en el modelo de Catalog: se omite en vez de
 * inventarlo.
 */
export const PendingClaimCard = ({
  claim,
  displayStatus,
  selected,
  claiming,
  onToggleSelected,
  onClaim,
}: PendingClaimCardProps): React.JSX.Element => {
  const productQuery = useQuery({
    queryKey: queryKeys.catalog.detail(claim.productId),
    queryFn: ({ signal }) => fetchCanonicalProduct(claim.productId, signal),
  })
  const product = productQuery.data
  const { t } = useTranslation()
  const name = product?.name ?? claim.productId
  const urgent = displayStatus === 'PENDING' && claim.remainingClaimDays <= 1

  return (
    <li>
      <article
        className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4"
        aria-labelledby={`pending-claim-${claim.auctionId}-name`}
      >
        <div className="flex items-start gap-3">
          {displayStatus === 'PENDING' ? (
            <input
              type="checkbox"
              aria-label={t('auction:claims.select', { name })}
              checked={selected}
              onChange={() => {
                onToggleSelected(claim.auctionId)
              }}
              className="mt-1 size-4 shrink-0 accent-[var(--color-brand)]"
            />
          ) : (
            // Reserva el mismo espacio que ocuparia el checkbox: sin esto, el
            // icono y el nombre se corren a la izquierda en las tarjetas sin
            // checkbox y desalinean toda la fila respecto a las que si lo tienen.
            <span aria-hidden="true" className="mt-1 size-4 shrink-0" />
          )}
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand"
          >
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id={`pending-claim-${claim.auctionId}-name`}
              className="truncate text-sm font-semibold text-ink"
              title={name}
            >
              {name}
            </h3>
            <div className="mt-1">
              <PendingClaimStatusBadge status={displayStatus} />
            </div>
            <p className="mt-1 truncate text-xs text-muted">
              {t('auction:claims.meta', {
                type:
                  product === undefined
                    ? t('auction:claims.productFallback')
                    : t(`commerce:productTypes.${product.type}`, { defaultValue: product.type }),
                id: claim.auctionId,
              })}
            </p>
          </div>
        </div>

        <p className="text-sm font-semibold tabular-nums text-ink">
          {formatCredits(claim.finalAmountCredits)}
        </p>

        {displayStatus !== 'CLAIMED' && (
          <p
            className={clsx(
              'flex items-center gap-1.5 text-xs',
              urgent ? 'font-semibold text-danger' : 'text-muted',
            )}
          >
            <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {displayStatus === 'EXPIRED'
              ? t('auction:claims.expiredOn', { date: formatDateTime(claim.claimDeadline) })
              : claim.remainingClaimDays <= 1
                ? t('auction:claims.dueSoon')
                : t('auction:claims.remaining', {
                    count: claim.remainingClaimDays,
                    value: formatInteger(claim.remainingClaimDays),
                    date: formatDateTime(claim.claimDeadline),
                  })}
          </p>
        )}

        <div className="mt-auto pt-1">
          {displayStatus === 'PENDING' && (
            <Button
              variant="primary"
              className="w-full"
              disabled={claiming}
              aria-busy={claiming}
              onClick={() => {
                onClaim(claim.auctionId)
              }}
            >
              {claiming ? (
                <>
                  <RefreshCw aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
                  {t('auction:claims.claiming')}
                </>
              ) : (
                t('auction:claims.claim')
              )}
            </Button>
          )}

          {displayStatus === 'CLAIMED' && (
            <p role="status" className="text-xs font-medium text-success">
              {t('auction:claims.added')}
            </p>
          )}

          {displayStatus === 'EXPIRED' && (
            <p role="alert" className="text-xs text-danger">
              {t('auction:claims.lost')}
            </p>
          )}
        </div>
      </article>
    </li>
  )
}
