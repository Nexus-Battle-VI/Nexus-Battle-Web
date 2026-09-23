import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/form/TextField'
import { formatDateTime } from '@/lib/format'
import './auto-bid.css'

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g

const formatCredits = (amount: number): string =>
  `${Math.trunc(amount).toString().replace(THOUSANDS, '.')} créditos`

export type AutoBidConfigStage =
  'ready' | 'processing' | 'configured' | 'rejected' | 'own-auction' | 'auction-not-active'

export interface AutoBidConfigCardProps {
  readonly stage: AutoBidConfigStage
  readonly availableCredits?: number
  readonly maxAmountCredits?: number
  readonly configuredAt?: string
  readonly errorMessage?: string
  readonly onConfigure?: (maxAmountCredits: number) => void
  readonly onRetry?: () => void
  readonly onClose?: () => void
}

const STAGE_LABEL: Readonly<Record<AutoBidConfigStage, string>> = {
  ready: 'Sin configurar',
  processing: 'Guardando',
  configured: 'Activa',
  rejected: 'Rechazada',
  'own-auction': 'Rechazada',
  'auction-not-active': 'Rechazada',
}

const DEFAULT_ERROR =
  'El límite no cumple las reglas de la subasta. Revisa el valor e inténtalo de nuevo.'

const Alert = ({
  tone,
  title,
  message,
}: {
  readonly tone: 'info' | 'warning' | 'success' | 'danger'
  readonly title: string
  readonly message: string
}): React.JSX.Element => (
  <div className="auto-bid-alert" data-tone={tone} role={tone === 'success' ? 'status' : 'alert'}>
    <div className="auto-bid-alert-content">
      <p className="auto-bid-alert-title">{title}</p>
      <p className="auto-bid-alert-message">{message}</p>
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
  <div className="auto-bid-kv">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
)

export const AutoBidConfigCard = ({
  stage,
  availableCredits,
  maxAmountCredits,
  configuredAt,
  errorMessage,
  onConfigure,
  onRetry,
  onClose,
}: AutoBidConfigCardProps): React.JSX.Element => {
  const titleId = useId()
  const [amount, setAmount] = useState('')
  const [validationError, setValidationError] = useState<string | undefined>()

  const submit = (): void => {
    const parsed = Number(amount)

    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      setValidationError('Ingresa un límite entero mayor que 0.')

      return
    }

    setValidationError(undefined)
    onConfigure?.(parsed)
  }

  const header = (
    <div className="auto-bid-header-row">
      <p className="auto-bid-title" id={titleId}>
        Puja automática
      </p>
      <span className="auto-bid-badge" data-stage={stage}>
        {STAGE_LABEL[stage]}
      </span>
    </div>
  )

  if (stage === 'processing') {
    return (
      <article className="auto-bid-card" aria-labelledby={titleId} aria-busy="true">
        {header}
        <div>
          <div className="auto-bid-progress-header">
            <span>Guardando tu límite...</span>
            <span>No cierres esta ventana</span>
          </div>
          <div
            className="auto-bid-progress-track"
            role="progressbar"
            aria-label="Guardando tu límite"
          >
            <div className="auto-bid-progress-indicator" />
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      className="auto-bid-card"
      aria-labelledby={titleId}
      data-emphasis={stage === 'ready' || stage === 'configured'}
    >
      {header}

      {stage === 'ready' && (
        <>
          <p className="auto-bid-summary">
            Configura un límite máximo y el sistema pujará automáticamente por ti, sin superarlo,
            cada vez que otro jugador te desplace del liderazgo.
          </p>
          {availableCredits !== undefined && (
            <>
              <hr className="auto-bid-divider" />
              <dl className="auto-bid-info-col">
                <KeyValue
                  label="Tus créditos disponibles"
                  value={formatCredits(availableCredits)}
                />
              </dl>
            </>
          )}
          <hr className="auto-bid-divider" />
          <form
            className="auto-bid-form"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <TextField
              label="Límite máximo"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              hint="Nunca pujaremos automáticamente por encima de este monto."
              error={validationError}
              onChange={(event) => {
                setAmount(event.target.value)
              }}
            />
            <Button type="submit" className="auto-bid-button" disabled={onConfigure === undefined}>
              Configurar puja automática
            </Button>
          </form>
        </>
      )}

      {stage === 'configured' && (
        <>
          <Alert
            tone="success"
            title="Puja automática configurada"
            message="Reaccionaremos por ti ante cualquier oferta rival, sin superar tu límite."
          />
          <dl className="auto-bid-info-col">
            {maxAmountCredits !== undefined && (
              <KeyValue label="Límite máximo" value={formatCredits(maxAmountCredits)} />
            )}
            {configuredAt !== undefined && (
              <KeyValue label="Configurada el" value={formatDateTime(configuredAt)} />
            )}
          </dl>
        </>
      )}

      {stage === 'rejected' && (
        <>
          <Alert tone="danger" title="Límite inválido" message={errorMessage ?? DEFAULT_ERROR} />
          <Button type="button" variant="danger" className="auto-bid-button" onClick={onRetry}>
            Reintentar
          </Button>
        </>
      )}

      {stage === 'own-auction' && (
        <>
          <Alert
            tone="danger"
            title="No puedes configurar puja automática en tu propia subasta"
            message="El vendedor no puede configurar una puja automática en la subasta que publicó."
          />
          <Button type="button" variant="danger" className="auto-bid-button" onClick={onClose}>
            Entendido
          </Button>
        </>
      )}

      {stage === 'auction-not-active' && (
        <>
          <Alert
            tone="danger"
            title="Esta subasta ya no está activa"
            message="No puedes configurar una puja automática en una subasta que ya cerró."
          />
          <Button type="button" variant="danger" className="auto-bid-button" onClick={onClose}>
            Entendido
          </Button>
        </>
      )}
    </article>
  )
}
