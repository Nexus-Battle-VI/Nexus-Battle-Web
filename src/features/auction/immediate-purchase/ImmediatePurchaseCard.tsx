import { useId, useState } from 'react'

import { formatCredits } from './formatCredits'
import './immediate-purchase.css'

/**
 * Tarjeta de compra inmediata (HU-64.1).
 *
 * Es presentacional: recibe la etapa del flujo y los datos ya resueltos, y avisa
 * por callbacks. La orquestacion con la API (`POST /auctions/{auctionId}/buy-now`)
 * la aporta HU-64.6; aqui solo vive la interfaz de los estados de Figma.
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

const BADGE_LABEL: Readonly<Record<ImmediatePurchaseStage, string>> = {
  available: 'Disponible',
  processing: 'Procesando',
  success: 'Vendida',
  unavailable: 'En subasta solo',
  'insufficient-credits': 'Disponible',
  'pending-pickup': 'Pendiente de retiro',
}

type AlertTone = 'info' | 'warning' | 'success' | 'danger'

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
    className="ip-alert"
    data-tone={tone}
    role={tone === 'success' || tone === 'info' ? 'status' : 'alert'}
  >
    <div className="ip-alert-content">
      <p className="ip-alert-title">{title}</p>
      <p className="ip-alert-message">{message}</p>
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
  <div className="ip-kv">
    <dt>{label}</dt>
    <dd>{value}</dd>
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
    <div className="ip-header-row">
      <h3 className="ip-title" id={titleId}>
        {product.name}
      </h3>
      <span className="ip-badge">{BADGE_LABEL[stage]}</span>
    </div>
  )

  if (stage === 'processing') {
    return (
      <article className="ip-card" aria-labelledby={titleId} aria-busy="true">
        {header}
        <div>
          <div className="ip-progress-header">
            <span>Procesando tu compra...</span>
            <span>No cierres esta ventana</span>
          </div>
          <div className="ip-progress-track" role="progressbar" aria-label="Procesando tu compra">
            <div className="ip-progress-indicator" />
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      className="ip-card"
      aria-labelledby={titleId}
      data-emphasis={stage === 'available' && !confirmationMissing}
    >
      <div className="ip-product-row">
        <div className="ip-product-icon" aria-hidden="true">
          {product.icon}
        </div>
        {header}
      </div>

      {stage === 'available' && (
        <>
          {product.summary !== undefined && <p className="ip-summary">{product.summary}</p>}
          <hr className="ip-divider" />
          <dl className="ip-info-col">
            {priceCredits !== undefined && (
              <KeyValue label="Precio de compra inmediata" value={formatCredits(priceCredits)} />
            )}
            {availableCredits !== undefined && (
              <KeyValue label="Créditos disponibles" value={formatCredits(availableCredits)} />
            )}
          </dl>
          <hr className="ip-divider" />
          <label className="ip-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => {
                handleConfirmedChange(event.target.checked)
              }}
            />
            Confirmo la compra inmediata
          </label>
          {confirmationMissing && (
            <Alert
              tone="warning"
              title="Confirmación requerida"
              message="Debes marcar la casilla de confirmación antes de continuar."
            />
          )}
          <button
            type="button"
            className="ip-button"
            aria-disabled={confirmationMissing}
            onClick={handleBuy}
          >
            Comprar ahora
          </button>
        </>
      )}

      {stage === 'success' && transaction !== undefined && (
        <>
          <Alert
            tone="success"
            title="¡Compra completada!"
            message={`El producto quedó en pendientes de recoger. Tienes ${String(pickupDays)} días para reclamarlo.`}
          />
          <dl className="ip-info-col">
            <KeyValue label="ID de transacción" value={transaction.id} />
            <KeyValue
              label="Créditos debitados"
              value={`-${formatCredits(transaction.debitedCredits)}`}
            />
            <KeyValue
              label="Créditos restantes"
              value={formatCredits(transaction.remainingCredits)}
            />
          </dl>
          <button type="button" className="ip-button" onClick={onViewPending}>
            Ver pendientes de recoger
          </button>
        </>
      )}

      {stage === 'unavailable' && (
        <>
          <Alert
            tone="info"
            title="Compra inmediata no disponible"
            message="El vendedor no configuró un precio de compra inmediata para este producto. Participa en la subasta mediante pujas."
          />
          <button type="button" className="ip-button" onClick={onGoToBid}>
            Ir a pujar
          </button>
        </>
      )}

      {stage === 'insufficient-credits' && (
        <>
          {priceCredits !== undefined && availableCredits !== undefined && (
            <Alert
              tone="danger"
              title="Créditos insuficientes"
              message={`Necesitas ${formatCredits(priceCredits)} y solo tienes ${formatCredits(availableCredits)} disponibles.`}
            />
          )}
          <dl className="ip-info-col">
            {priceCredits !== undefined && (
              <KeyValue label="Precio de compra inmediata" value={formatCredits(priceCredits)} />
            )}
            {availableCredits !== undefined && (
              <KeyValue label="Créditos disponibles" value={formatCredits(availableCredits)} />
            )}
            {missingCredits !== undefined && (
              <KeyValue label="Créditos faltantes" value={formatCredits(missingCredits)} />
            )}
          </dl>
          <button type="button" className="ip-button" disabled>
            Comprar ahora
          </button>
        </>
      )}

      {stage === 'pending-pickup' && transaction !== undefined && (
        <>
          <Alert
            tone="success"
            title="Tu compra está lista para reclamar"
            message={`Retira el producto dentro de los próximos ${String(pickupDays)} días o volverá al inventario del vendedor.`}
          />
          <dl className="ip-info-col">
            <KeyValue label="ID de transacción" value={transaction.id} />
            {pickupDeadline !== undefined && (
              <KeyValue label="Fecha límite de retiro" value={pickupDeadline} />
            )}
            <KeyValue label="Estado" value="Pendiente de retiro" />
          </dl>
          <button type="button" className="ip-button" onClick={onViewOtherProducts}>
            Ver otros productos
          </button>
        </>
      )}
    </article>
  )
}
