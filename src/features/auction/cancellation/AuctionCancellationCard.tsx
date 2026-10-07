import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { AuctionCancellationConfirmation } from '../detail-api'
import { formatCancellationCredits } from './formatCancellationCredits'

type CancellationResult = 'confirmed' | 'processing' | 'terminal'

const resultOf = (confirmation: AuctionCancellationConfirmation): CancellationResult => {
  const statuses = [confirmation.walletRefundStatus, confirmation.inventoryReleaseStatus]
  if (statuses.includes('TERMINAL_ERROR')) return 'terminal'
  if (statuses.every((status) => status === 'CONFIRMED')) return 'confirmed'
  return 'processing'
}

export interface AuctionCancellationCardProps {
  readonly publicationFeeCredits: number
  readonly bidCount: number
  readonly loading: boolean
  readonly confirmation: AuctionCancellationConfirmation | null
  readonly error: string | null
  readonly onCancel: () => void
}

/** Confirmacion inline para la cancelacion manual del vendedor (HU-90). */
export const AuctionCancellationCard = ({
  publicationFeeCredits,
  bidCount,
  loading,
  confirmation,
  error,
  onCancel,
}: AuctionCancellationCardProps): React.JSX.Element => {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const refund = publicationFeeCredits * 0.5

  if (confirmation !== null) {
    const result = resultOf(confirmation)
    const copy =
      result === 'confirmed'
        ? 'auction:cancellation.completed'
        : result === 'terminal'
          ? 'auction:cancellation.terminal'
          : 'auction:cancellation.processing'
    return (
      <Card title={t('auction:cancellation.title')} description={t(copy)}>
        <p className="text-sm text-muted">
          {t('auction:cancellation.cancelledOn', { date: confirmation.cancelledAt })}
        </p>
      </Card>
    )
  }

  const disabledForBids = bidCount > 0
  return (
    <Card
      title={t('auction:cancellation.title')}
      description={t('auction:cancellation.description')}
    >
      {confirming ? (
        <div className="space-y-4" role="group" aria-label={t('auction:cancellation.confirmTitle')}>
          <p className="text-sm text-ink">{t('auction:cancellation.confirmBody')}</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">{t('auction:cancellation.penalty')}</dt>
              <dd className="font-semibold text-ink">{formatCancellationCredits(t, refund)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t('auction:cancellation.refund')}</dt>
              <dd className="font-semibold text-ink">{formatCancellationCredits(t, refund)}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" loading={loading} onClick={onCancel}>
              {t('auction:cancellation.confirmAction')}
            </Button>
            <Button
              variant="secondary"
              disabled={loading}
              onClick={() => {
                setConfirming(false)
              }}
            >
              {t('common:cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {disabledForBids && (
            <p className="mb-3 text-sm text-muted">{t('auction:cancellation.hasBids')}</p>
          )}
          <Button
            variant="danger"
            disabled={disabledForBids}
            onClick={() => {
              setConfirming(true)
            }}
          >
            {t('auction:cancellation.action')}
          </Button>
        </>
      )}
      {error !== null && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  )
}
