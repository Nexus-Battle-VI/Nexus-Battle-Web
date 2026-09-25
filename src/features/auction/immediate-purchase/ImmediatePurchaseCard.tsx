import { useId, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { CheckboxField } from '@/components/ui/form/CheckboxField'
import { countLabel } from '@/shared/i18n/format'
import { formatCredits } from './formatCredits'

/**
 * Tarjeta de compra inmediata (HU-64.1).
 *
 * Es presentacional: recibe la etapa del flujo y los datos ya resueltos, y avisa
 * por callbacks. La orquestacion con la API (`POST /auctions/{auctionId}/buy-now`)
 * la aporta HU-64.6.
 *
 * Usa los tokens del producto (`src/index.css`: `--color-brand`, `--color-surface-raised`,
 * `--color-danger`...) y los componentes compartidos (`Card`, `Button`, `CheckboxField`),
 * NO una paleta propia: Figma fue la guia de contenido y disposicion, no una licencia
 * para que este componente se viera distinto al resto de Nexus Battles VI.
 *
 * Criterios de aceptacion que la interfaz hace visibles:
 * - CA-01 `success` / `pending-pickup`: compra completada y producto por recoger.
 * - CA-02 `insufficient-credits`: rechazo con el detalle de creditos faltantes.
 * - CA-03 `unavailable`: sin precio de compra inmediata, se ofrece pujar.
 * - CA-04 `available` sin marcar la confirmacion: la compra NO se ejecuta.
 */
export type ImmediatePurchaseStage =
  'available' | 'processing' | 'success' | 'unavailable' | 'insufficient-credits' | 'pending-pickup'

export interface ImmediatePurchaseProduct {
  readonly name: string
  /** Emoji o glifo corto del producto. */
  readonly icon: string
  /** Linea descriptiva, por ejemplo "Arma mítica · Poder 95 · Rareza Épica". */
  readonly summary?: string
}

export interface ImmediatePurchaseTransaction {
  readonly id: string
  readonly debitedCredits: number
  readonly remainingCredits: number
}

export interface ImmediatePurchaseCardProps {
  readonly product: ImmediatePurchaseProduct
  readonly stage: ImmediatePurchaseStage
  readonly priceCredits?: number
  readonly availableCredits?: number
  /** Datos de la transaccion; requeridos en `success` y `pending-pickup`. */
  readonly transaction?: ImmediatePurchaseTransaction
  /** Fecha limite de retiro, ya formateada para mostrar. */
  readonly pickupDeadline?: string
  readonly pickupDays?: number
  readonly confirmed: boolean
  /** Permite abrir la tarjeta mostrando ya el aviso "Confirmación requerida". */
  readonly initialConfirmationAttempted?: boolean
  readonly onConfirmedChange: (confirmed: boolean) => void
  /** Solo se invoca con la confirmacion marcada (CA-04). */
  readonly onBuy: () => void
  readonly onGoToBid?: () => void
  readonly onViewPending?: () => void
  readonly onViewOtherProducts?: () => void
}

/** Clave de la etiqueta de cada etapa (se traduce al pintar). */
const BADGE_LABEL: Readonly<Record<ImmediatePurchaseStage, string>> = {
  available: 'auction:purchase.badge.available',
  processing: 'auction:purchase.badge.processing',
  success: 'auction:purchase.badge.success',
  unavailable: 'auction:purchase.badge.unavailable',
  'insufficient-credits': 'auction:purchase.badge.available',
  'pending-pickup': 'auction:purchase.badge.pending-pickup',
}

/** Mismo criterio de tono que `StatusBadge` (components/ui): fondo suave al 15% del color de estado. */
const BADGE_TONE: Readonly<Record<ImmediatePurchaseStage, string>> = {
  available: 'bg-success/15 text-success',
  processing: 'bg-warning/15 text-warning',
  success: 'bg-success/15 text-success',
  unavailable: 'bg-border text-muted',
  'insufficient-credits': 'bg-danger/15 text-danger',
  'pending-pickup': 'bg-warning/15 text-warning',
}

type AlertTone = 'info' | 'warning' | 'success' | 'danger'

const ALERT_TONE: Readonly<Record<AlertTone, string>> = {
  info: 'bg-brand/10 border-brand',
  warning: 'bg-warning/10 border-warning',
  success: 'bg-success/10 border-success',
  danger: 'bg-danger/10 border-danger',
}

const Alert = ({
  tone,
  title,
  message,
}: {
  readonly tone: AlertTone
  readonly title: string
  readonly message: string
}): React.JSX.Element => (
  <div
    className={clsx('flex gap-3 rounded-lg border-l-4 p-4 text-xs', ALERT_TONE[tone])}
    role={tone === 'success' || tone === 'info' ? 'status' : 'alert'}
  >
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-muted">{message}</p>
    </div>
  </div>
)

const KeyValue = ({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}): React.JSX.Element => (
  <div className="flex flex-col gap-1">
    <dt className="text-[11px] font-medium text-muted">{label}</dt>
    <dd className="m-0 text-xs font-semibold text-ink">{value}</dd>
  </div>
)

export const ImmediatePurchaseCard = ({
  product,
  stage,
  priceCredits,
  availableCredits,
  transaction,
  pickupDeadline,
  pickupDays = 7,
  confirmed,
  initialConfirmationAttempted = false,
  onConfirmedChange,
  onBuy,
  onGoToBid,
  onViewPending,
  onViewOtherProducts,
}: ImmediatePurchaseCardProps): React.JSX.Element => {
  const titleId = useId()
  const { t } = useTranslation()
  const [attempted, setAttempted] = useState(initialConfirmationAttempted)
  const confirmationMissing = attempted && !confirmed

  const handleConfirmedChange = (next: boolean): void => {
    setAttempted(false)
    onConfirmedChange(next)
  }

  const handleBuy = (): void => {
    if (!confirmed) {
      setAttempted(true)

      return
    }

    onBuy()
  }

  const missingCredits =
    priceCredits !== undefined && availableCredits !== undefined
      ? Math.max(priceCredits - availableCredits, 0)
      : undefined

  const header = (
    <div className="flex flex-1 min-w-0 items-center gap-3">
      <h3 className="m-0 flex-1 min-w-0 text-lg font-semibold text-ink" id={titleId}>
        {product.name}
      </h3>
      <span
        className={clsx(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
          BADGE_TONE[stage],
        )}
      >
        {t(BADGE_LABEL[stage])}
      </span>
    </div>
  )

  if (stage === 'processing') {
    return (
      <article
        className="flex w-full max-w-[480px] flex-col gap-5 rounded-lg border border-border bg-surface-raised p-6"
        aria-labelledby={titleId}
        aria-busy="true"
      >
        {header}
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
            <span>{t('auction:purchase.processing')}</span>
            <span className="text-[11px] font-medium text-muted">{t('auction:dontClose')}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-label={t('auction:purchase.processingLabel')}
          >
            <div className="h-2 w-full animate-pulse rounded-full bg-brand motion-reduce:animate-none" />
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      className={clsx(
        'flex w-full max-w-[480px] flex-col gap-5 rounded-lg border bg-surface-raised p-6',
        stage === 'available' && !confirmationMissing
          ? 'border-2 border-brand p-[23px] shadow-[0_0_20px_0_var(--color-brand)]/30'
          : 'border-border',
      )}
      aria-labelledby={titleId}
    >
      <div className="flex items-center gap-4">
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-brand text-2xl"
          aria-hidden="true"
        >
          {product.icon}
        </div>
        {header}
      </div>

      {stage === 'available' && (
        <>
          {product.summary !== undefined && (
            <p className="m-0 text-[13px] text-muted">{product.summary}</p>
          )}
          <hr className="m-0 h-px border-0 bg-border" />
          <dl className="m-0 flex flex-col gap-2.5">
            {priceCredits !== undefined && (
              <KeyValue label={t('auction:purchase.price')} value={formatCredits(priceCredits)} />
            )}
            {availableCredits !== undefined && (
              <KeyValue
                label={t('auction:purchase.availableCredits')}
                value={formatCredits(availableCredits)}
              />
            )}
          </dl>
          <hr className="m-0 h-px border-0 bg-border" />
          <CheckboxField
            label={t('auction:purchase.confirm')}
            checked={confirmed}
            onChange={(event) => {
              handleConfirmedChange(event.target.checked)
            }}
          />
          {confirmationMissing && (
            <Alert
              tone="warning"
              title={t('auction:purchase.confirmationRequired')}
              message={t('auction:purchase.confirmationBody')}
            />
          )}
          <Button
            variant="primary"
            className="w-full"
            aria-disabled={confirmationMissing}
            onClick={handleBuy}
          >
            {t('auction:purchase.buy')}
          </Button>
        </>
      )}

      {stage === 'success' && transaction !== undefined && (
        <>
          <Alert
            tone="success"
            title={t('auction:purchase.completed')}
            message={countLabel(t, 'auction:purchase.completedBody', pickupDays)}
          />
          <dl className="m-0 flex flex-col gap-2.5">
            <KeyValue label={t('auction:purchase.transactionId')} value={transaction.id} />
            <KeyValue
              label={t('auction:purchase.debited')}
              value={`-${formatCredits(transaction.debitedCredits)}`}
            />
            <KeyValue
              label={t('auction:purchase.remaining')}
              value={formatCredits(transaction.remainingCredits)}
            />
          </dl>
          <Button variant="secondary" className="w-full" onClick={onViewPending}>
            {t('auction:purchase.viewPending')}
          </Button>
        </>
      )}

      {stage === 'unavailable' && (
        <>
          <Alert
            tone="info"
            title={t('auction:purchase.unavailableTitle')}
            message={t('auction:purchase.unavailableBody')}
          />
          <Button variant="primary" className="w-full" onClick={onGoToBid}>
            {t('auction:purchase.goToBid')}
          </Button>
        </>
      )}

      {stage === 'insufficient-credits' && (
        <>
          {priceCredits !== undefined && availableCredits !== undefined && (
            <Alert
              tone="danger"
              title={t('auction:purchase.insufficientTitle')}
              message={t('auction:purchase.insufficientBody', {
                price: formatCredits(priceCredits),
                available: formatCredits(availableCredits),
              })}
            />
          )}
          <dl className="m-0 flex flex-col gap-2.5">
            {priceCredits !== undefined && (
              <KeyValue label={t('auction:purchase.price')} value={formatCredits(priceCredits)} />
            )}
            {availableCredits !== undefined && (
              <KeyValue
                label={t('auction:purchase.availableCredits')}
                value={formatCredits(availableCredits)}
              />
            )}
            {missingCredits !== undefined && (
              <KeyValue
                label={t('auction:purchase.missing')}
                value={formatCredits(missingCredits)}
              />
            )}
          </dl>
          <Button variant="primary" className="w-full" disabled>
            {t('auction:purchase.buy')}
          </Button>
        </>
      )}

      {stage === 'pending-pickup' && transaction !== undefined && (
        <>
          <Alert
            tone="success"
            title={t('auction:purchase.readyTitle')}
            message={countLabel(t, 'auction:purchase.readyBody', pickupDays)}
          />
          <dl className="m-0 flex flex-col gap-2.5">
            <KeyValue label={t('auction:purchase.transactionId')} value={transaction.id} />
            {pickupDeadline !== undefined && (
              <KeyValue label={t('auction:purchase.deadline')} value={pickupDeadline} />
            )}
            <KeyValue
              label={t('auction:purchase.status')}
              value={t('auction:purchase.pendingPickup')}
            />
          </dl>
          <Button variant="secondary" className="w-full" onClick={onViewOtherProducts}>
            {t('auction:purchase.viewOthers')}
          </Button>
        </>
      )}
    </article>
  )
}
