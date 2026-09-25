import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/form/TextField'
import './bidding.css'
import { i18n } from '@/shared/i18n/i18n'
import { formatInteger } from '@/shared/i18n/format'

/** `2500` -> `2.500 créditos` en es; separador y plural del idioma activo. */
const formatCredits = (amount: number): string => {
  const value = Math.trunc(amount)

  return i18n.t('common:count.credits', { count: value, value: formatInteger(value) })
}

export type BidRegistrationStage =
  'ready' | 'processing' | 'leading' | 'rejected' | 'own-auction' | 'cooldown' | 'limit' | 'outbid'

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

/** Clave de la etiqueta de cada etapa (se traduce al pintar). */
const STAGE_LABEL: Readonly<Record<BidRegistrationStage, string>> = {
  ready: 'auction:bid.stage.ready',
  processing: 'auction:bid.stage.processing',
  leading: 'auction:bid.stage.leading',
  rejected: 'auction:bid.stage.rejected',
  'own-auction': 'auction:bid.stage.rejected',
  cooldown: 'auction:bid.stage.rejected',
  limit: 'auction:bid.stage.rejected',
  outbid: 'auction:bid.stage.outbid',
}

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
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  // Guarda la CLAVE del aviso; se traduce al pintar.
  const [validationError, setValidationError] = useState<string | undefined>()
  const effectiveBid = bidCredits ?? currentBidCredits
  const minimumSuggested =
    currentBidCredits === undefined ? minimumBidCredits : currentBidCredits + minimumBidCredits

  const submit = (): void => {
    const parsed = Number(amount)

    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      setValidationError('auction:bid.amountInvalid')

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
        {t(STAGE_LABEL[stage])}
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
            <span>{t('auction:bid.registering')}</span>
            <span>{t('auction:dontClose')}</span>
          </div>
          <div
            className="bid-progress-track"
            role="progressbar"
            aria-label={t('auction:bid.registeringLabel')}
          >
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
              <KeyValue
                label={t('auction:bid.currentOffer')}
                value={formatCredits(currentBidCredits)}
              />
            )}
            <KeyValue
              label={t('auction:bid.minimumIncrement')}
              value={formatCredits(minimumBidCredits)}
            />
            {availableCredits !== undefined && (
              <KeyValue
                label={t('auction:availableCredits')}
                value={formatCredits(availableCredits)}
              />
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
              label={t('auction:bid.amount')}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              hint={t('auction:bid.suggested', { credits: formatCredits(minimumSuggested) })}
              error={validationError === undefined ? undefined : t(validationError)}
              onChange={(event) => {
                setAmount(event.target.value)
              }}
            />
            <Button type="submit" className="bid-button" disabled={onRegister === undefined}>
              {t('auction:bid.register')}
            </Button>
          </form>
        </>
      )}

      {stage === 'leading' && (
        <>
          <Alert
            tone="success"
            title={t('auction:bid.leadingTitle')}
            message={t('auction:bid.leadingBody')}
          />
          <dl className="bid-info-col">
            {effectiveBid !== undefined && (
              <KeyValue
                label={t('auction:bid.registeredAmount')}
                value={formatCredits(effectiveBid)}
              />
            )}
            {effectiveBid !== undefined && (
              <KeyValue label={t('auction:bid.reserved')} value={formatCredits(effectiveBid)} />
            )}
          </dl>
          <Button type="button" className="bid-button" onClick={onAccept}>
            {t('auction:accept')}
          </Button>
        </>
      )}

      {stage === 'rejected' && (
        <>
          <Alert
            tone="danger"
            title={t('auction:bid.insufficientTitle')}
            message={errorMessage ?? t('auction:bid.defaultError')}
          />
          <Button type="button" variant="danger" className="bid-button" onClick={onRetry}>
            {t('auction:retry')}
          </Button>
        </>
      )}

      {stage === 'own-auction' && (
        <>
          <Alert
            tone="danger"
            title={t('auction:bid.ownTitle')}
            message={t('auction:bid.ownBody')}
          />
          <Button type="button" variant="danger" className="bid-button" onClick={onClose}>
            {t('auction:understood')}
          </Button>
        </>
      )}

      {stage === 'cooldown' && (
        <>
          <Alert
            tone="danger"
            title={t('auction:bid.cooldownTitle')}
            message={t('auction:bid.cooldownBody')}
          />
          <Button type="button" variant="danger" className="bid-button" onClick={onRetry}>
            {t('auction:retry')}
          </Button>
        </>
      )}

      {stage === 'limit' && (
        <>
          <Alert
            tone="danger"
            title={t('auction:bid.limitTitle')}
            message={t('auction:bid.limitBody')}
          />
          <Button type="button" variant="danger" className="bid-button" onClick={onClose}>
            {t('auction:close')}
          </Button>
        </>
      )}

      {stage === 'outbid' && (
        <>
          <Alert
            tone="warning"
            title={t('auction:bid.outbidTitle')}
            message={t('auction:bid.outbidBody')}
          />
          <dl className="bid-info-col">
            {effectiveBid !== undefined && (
              <KeyValue label={t('auction:bid.yourBid')} value={formatCredits(effectiveBid)} />
            )}
            {effectiveBid !== undefined && (
              <KeyValue
                label={t('auction:bid.released')}
                value={`+${formatCredits(effectiveBid)}`}
              />
            )}
          </dl>
          <Button type="button" className="bid-button bid-button-warning" onClick={onAccept}>
            {t('auction:accept')}
          </Button>
        </>
      )}
    </article>
  )
}
