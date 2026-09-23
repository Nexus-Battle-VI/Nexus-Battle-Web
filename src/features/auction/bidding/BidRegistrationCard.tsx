import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/form/TextField'
import './bidding.css'

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g

const formatCredits = (amount: number): string =>
  `${Math.trunc(amount).toString().replace(THOUSANDS, '.')} créditos`

export type BidRegistrationStage =
  | 'ready'
  | 'processing'
  | 'leading'
  | 'rejected'
  | 'own-auction'
  | 'cooldown'
  | 'limit'
  | 'outbid'

export interface BidRegistrationProduct {
  readonly name: string
  readonly icon: string
  readonly summary?: string
}

export interface BidRegistrationCardProps {
  readonly product: BidRegistrationProduct
  readonly stage: BidRegistrationStage
  readonly currentBidCredits?: number
  readonly minimumBidCredits: number
  readonly availableCredits?: number
  readonly bidCredits?: number
  readonly errorMessage?: string
  readonly onRegister?: (amountCredits: number) => void
  readonly onRetry?: () => void
  readonly onClose?: () => void
  readonly onAccept?: () => void
}

const STAGE_LABEL: Readonly<Record<BidRegistrationStage, string>> = {
  ready: 'En curso',
  processing: 'Registrando',
  leading: 'Oferta líder',
  rejected: 'Rechazada',
  'own-auction': 'Rechazada',
  cooldown: 'Rechazada',
  limit: 'Rechazada',
  outbid: 'Superada',
}

const DEFAULT_ERROR =
  'La puja no cumple las reglas de la subasta. Revisa el monto e inténtalo de nuevo.'

const Alert = ({
  tone,
  title,
  message,
}: {
  readonly tone: 'info' | 'warning' | 'success' | 'danger'
  readonly title: string
  readonly message: string
}): React.JSX.Element => (
  <div className="bid-alert" data-tone={tone} role={tone === 'success' ? 'status' : 'alert'}>
    <div className="bid-alert-content">
      <p className="bid-alert-title">{title}</p>
      <p className="bid-alert-message">{message}</p>
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
  <div className="bid-kv">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
)

export const BidRegistrationCard = ({
  product,
  stage,
  currentBidCredits,
  minimumBidCredits,
  availableCredits,
  bidCredits,
  errorMessage,
  onRegister,
  onRetry,
  onClose,
  onAccept,
}: BidRegistrationCardProps): React.JSX.Element => {
  const titleId = useId()
  const [amount, setAmount] = useState('')
  const [validationError, setValidationError] = useState<string | undefined>()
  const effectiveBid = bidCredits ?? currentBidCredits
  const minimumSuggested =
    currentBidCredits === undefined ? minimumBidCredits : currentBidCredits + minimumBidCredits

  const submit = (): void => {
    const parsed = Number(amount)

    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      setValidationError('Ingresa un monto entero mayor que 0.')

      return
    }

    setValidationError(undefined)
    onRegister?.(parsed)
  }

  const header = (
    <div className="bid-header-row">
      <p className="bid-title" id={titleId}>
        {product.name}
      </p>
      <span className="bid-badge" data-stage={stage}>
        {STAGE_LABEL[stage]}
      </span>
    </div>
  )

  if (stage === 'processing') {
    return (
      <article className="bid-card" aria-labelledby={titleId} aria-busy="true">
        <div className="bid-product-row">
          <div className="bid-product-icon" aria-hidden="true">
            {product.icon}
          </div>
          {header}
        </div>
        <div>
          <div className="bid-progress-header">
            <span>Registrando tu puja...</span>
            <span>No cierres esta ventana</span>
          </div>
          <div className="bid-progress-track" role="progressbar" aria-label="Registrando tu puja">
            <div className="bid-progress-indicator" />
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      className="bid-card"
      aria-labelledby={titleId}
      data-emphasis={stage === 'ready' || stage === 'leading'}
    >
      <div className="bid-product-row">
        <div className="bid-product-icon" aria-hidden="true">
          {product.icon}
        </div>
        {header}
      </div>

      {product.summary !== undefined && <p className="bid-summary">{product.summary}</p>}

      {stage === 'ready' && (
        <>
          <hr className="bid-divider" />
          <dl className="bid-info-col">
            {currentBidCredits !== undefined && (
              <KeyValue label="Oferta actual" value={formatCredits(currentBidCredits)} />
            )}
            <KeyValue label="Incremento mínimo" value={formatCredits(minimumBidCredits)} />
            {availableCredits !== undefined && (
              <KeyValue label="Tus créditos disponibles" value={formatCredits(availableCredits)} />
            )}
          </dl>
          <hr className="bid-divider" />
          <form
            className="bid-form"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <TextField
              label="Monto de puja"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              hint={`Mínimo sugerido: ${formatCredits(minimumSuggested)}`}
              error={validationError}
              onChange={(event) => {
                setAmount(event.target.value)
              }}
            />
            <Button type="submit" className="bid-button" disabled={onRegister === undefined}>
              Registrar puja
            </Button>
          </form>
        </>
      )}

      {stage === 'leading' && (
        <>
          <Alert
            tone="success"
            title="¡Eres la oferta líder!"
            message="Tu puja está liderando esta subasta. Te avisaremos si otro jugador la supera."
          />
          <dl className="bid-info-col">
            {effectiveBid !== undefined && (
              <KeyValue label="Monto registrado" value={formatCredits(effectiveBid)} />
            )}
            {effectiveBid !== undefined && (
              <KeyValue label="Créditos reservados" value={formatCredits(effectiveBid)} />
            )}
          </dl>
          <Button type="button" className="bid-button" onClick={onAccept}>
            Aceptar
          </Button>
        </>
      )}

      {stage === 'rejected' && (
        <>
          <Alert
            tone="danger"
            title="Monto insuficiente"
            message={errorMessage ?? DEFAULT_ERROR}
          />
          <Button type="button" variant="danger" className="bid-button" onClick={onRetry}>
            Reintentar
          </Button>
        </>
      )}

      {stage === 'own-auction' && (
        <>
          <Alert
            tone="danger"
            title="No puedes pujar en tu propia subasta"
            message="El vendedor no puede registrar pujas en la subasta que publicó."
          />
          <Button type="button" variant="danger" className="bid-button" onClick={onClose}>
            Entendido
          </Button>
        </>
      )}

      {stage === 'cooldown' && (
        <>
          <Alert
            tone="danger"
            title="Debes esperar 5 segundos"
            message="No se permite pujar más de una vez cada 5 segundos."
          />
          <Button type="button" variant="danger" className="bid-button" onClick={onRetry}>
            Reintentar
          </Button>
        </>
      )}

      {stage === 'limit' && (
        <>
          <Alert
            tone="danger"
            title="Límite alcanzado"
            message="Ya tienes 50 pujas activas. Abandona algunas antes de registrar nuevas."
          />
          <Button type="button" variant="danger" className="bid-button" onClick={onClose}>
            Cerrar
          </Button>
        </>
      )}

      {stage === 'outbid' && (
        <>
          <Alert
            tone="warning"
            title="Tu puja fue superada"
            message="Otro jugador registró una puja más alta en esta subasta."
          />
          <dl className="bid-info-col">
            {effectiveBid !== undefined && (
              <KeyValue label="Tu puja" value={formatCredits(effectiveBid)} />
            )}
            {effectiveBid !== undefined && (
              <KeyValue label="Créditos liberados" value={`+${formatCredits(effectiveBid)}`} />
            )}
          </dl>
          <Button type="button" className="bid-button bid-button-warning" onClick={onAccept}>
            Aceptar
          </Button>
        </>
      )}
    </article>
  )
}
