import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/form/TextField'
import { formatDateTime } from '@/lib/format'
import './auto-bid.css'
import { i18n } from '@/shared/i18n/i18n'
import { formatInteger } from '@/shared/i18n/format'

/** `2500` -> `2.500 créditos` en es; separador y plural del idioma activo. */
const formatCredits = (amount: number): string => {
  const value = Math.trunc(amount)

  return i18n.t('common:count.credits', { count: value, value: formatInteger(value) })
}

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

/** Clave de la etiqueta de cada etapa (se traduce al pintar). */
const STAGE_LABEL: Readonly<Record<AutoBidConfigStage, string>> = {
  ready: 'auction:autoBid.stage.ready',
  processing: 'auction:autoBid.stage.processing',
  configured: 'auction:autoBid.stage.configured',
  rejected: 'auction:autoBid.stage.rejected',
  'own-auction': 'auction:autoBid.stage.rejected',
  'auction-not-active': 'auction:autoBid.stage.rejected',
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
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  // Guarda la CLAVE del aviso; se traduce al pintar.
  const [validationError, setValidationError] = useState<string | undefined>()

  const submit = (): void => {
    const parsed = Number(amount)

    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      setValidationError('auction:autoBid.limitInvalid')

      return
    }

    setValidationError(undefined)
    onConfigure?.(parsed)
  }

  const header = (
    <div className="auto-bid-header-row">
      <p className="auto-bid-title" id={titleId}>
        {t('auction:autoBid.title')}
      </p>
      <span className="auto-bid-badge" data-stage={stage}>
        {t(STAGE_LABEL[stage])}
      </span>
    </div>
  )

  if (stage === 'processing') {
    return (
      <article className="auto-bid-card" aria-labelledby={titleId} aria-busy="true">
        {header}
        <div>
          <div className="auto-bid-progress-header">
            <span>{t('auction:autoBid.saving')}</span>
            <span>{t('auction:dontClose')}</span>
          </div>
          <div
            className="auto-bid-progress-track"
            role="progressbar"
            aria-label={t('auction:autoBid.savingLabel')}
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
          <p className="auto-bid-summary">{t('auction:autoBid.summary')}</p>
          {availableCredits !== undefined && (
            <>
              <hr className="auto-bid-divider" />
              <dl className="auto-bid-info-col">
                <KeyValue
                  label={t('auction:availableCredits')}
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
              label={t('auction:autoBid.limit')}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              hint={t('auction:autoBid.limitHint')}
              error={validationError === undefined ? undefined : t(validationError)}
              onChange={(event) => {
                setAmount(event.target.value)
              }}
            />
            <Button type="submit" className="auto-bid-button" disabled={onConfigure === undefined}>
              {t('auction:autoBid.configure')}
            </Button>
          </form>
        </>
      )}

      {stage === 'configured' && (
        <>
          <Alert
            tone="success"
            title={t('auction:autoBid.configuredTitle')}
            message={t('auction:autoBid.configuredBody')}
          />
          <dl className="auto-bid-info-col">
            {maxAmountCredits !== undefined && (
              <KeyValue
                label={t('auction:autoBid.limit')}
                value={formatCredits(maxAmountCredits)}
              />
            )}
            {configuredAt !== undefined && (
              <KeyValue
                label={t('auction:autoBid.configuredAt')}
                value={formatDateTime(configuredAt)}
              />
            )}
          </dl>
        </>
      )}

      {stage === 'rejected' && (
        <>
          <Alert
            tone="danger"
            title={t('auction:autoBid.invalidTitle')}
            message={errorMessage ?? t('auction:autoBid.defaultError')}
          />
          <Button type="button" variant="danger" className="auto-bid-button" onClick={onRetry}>
            {t('auction:retry')}
          </Button>
        </>
      )}

      {stage === 'own-auction' && (
        <>
          <Alert
            tone="danger"
            title={t('auction:autoBid.ownTitle')}
            message={t('auction:autoBid.ownBody')}
          />
          <Button type="button" variant="danger" className="auto-bid-button" onClick={onClose}>
            {t('auction:understood')}
          </Button>
        </>
      )}

      {stage === 'auction-not-active' && (
        <>
          <Alert
            tone="danger"
            title={t('auction:autoBid.notActiveTitle')}
            message={t('auction:autoBid.notActiveBody')}
          />
          <Button type="button" variant="danger" className="auto-bid-button" onClick={onClose}>
            {t('auction:understood')}
          </Button>
        </>
      )}
    </article>
  )
}
