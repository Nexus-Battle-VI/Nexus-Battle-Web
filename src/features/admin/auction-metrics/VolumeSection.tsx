import { useTranslation } from 'react-i18next'

import { Clock, Package, TrendingUp, Trophy } from '@/components/ui/icons'

import { formatCount, formatRate } from './metricsFormat'
import {
  Badge,
  KeyValue,
  KeyValueList,
  MetricCard,
  SectionHeading,
  StatCard,
  UnavailableNote,
} from './parts'
import { reasonText } from './reasons'
import type { VolumeAndSuccess } from './types'

/** CA-01: volumen de subastas y tasa de exito (contrato §4.1). */
export const VolumeSection = ({ data }: { readonly data: VolumeAndSuccess }): React.JSX.Element => {
  const { t } = useTranslation()
  const player = data.playerAuctions
  const { closed, successRate, claims } = player
  const official = data.officialAuctions

  return (
    <section aria-labelledby="auction-metrics-volume" className="grid min-w-0 gap-4">
      <SectionHeading icon={TrendingUp} id="auction-metrics-volume">
        {t('auctionMetrics:volume.title')}
      </SectionHeading>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12.5rem),1fr))]">
        <StatCard
          icon={Package}
          label={t('auctionMetrics:volume.published')}
          value={formatCount(player.published)}
          foot={t('auctionMetrics:volume.publishedFoot')}
        />
        <StatCard
          icon={Clock}
          label={t('auctionMetrics:volume.closed')}
          value={formatCount(closed.total)}
          foot={t('auctionMetrics:volume.closedFoot', {
            active: formatCount(player.active),
            awaiting: formatCount(player.awaitingClosure),
          })}
        />
        <StatCard
          icon={TrendingUp}
          label={t('auctionMetrics:volume.successRate')}
          value={formatRate(successRate.value)}
          foot={
            successRate.denominator === 0
              ? t('auctionMetrics:volume.successRateEmpty')
              : t('auctionMetrics:volume.successRateFoot', {
                  numerator: formatCount(successRate.numerator),
                  denominator: formatCount(successRate.denominator),
                })
          }
        >
          {successRate.value !== null && (
            <div
              role="img"
              aria-label={t('auctionMetrics:volume.successRateMeter', {
                value: formatRate(successRate.value),
              })}
              className="am-meter mt-2 h-2 overflow-hidden rounded-full"
            >
              <i
                className="am-meter-fill block h-full rounded-full"
                style={{ width: `${String(successRate.value * 100)}%` }}
              />
            </div>
          )}
        </StatCard>
        <StatCard
          icon={Trophy}
          label={t('auctionMetrics:volume.claims')}
          value={formatCount(claims.createdInPeriod)}
          foot={t('auctionMetrics:volume.claimsFoot', {
            claimed: formatCount(claims.claimed),
            pending: formatCount(claims.pending),
            expired: formatCount(claims.expired),
          })}
        />
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
        <MetricCard
          title={t('auctionMetrics:volume.outcomeTitle', { total: formatCount(closed.total) })}
        >
          <KeyValueList>
            <KeyValue
              label={t('auctionMetrics:volume.withWinner')}
              value={formatCount(closed.withWinner)}
            />
            <KeyValue
              label={t('auctionMetrics:volume.soldByBuyNow')}
              value={formatCount(closed.soldByBuyNow)}
            />
            <KeyValue
              label={t('auctionMetrics:volume.withoutBids')}
              value={formatCount(closed.withoutBids)}
            />
            <KeyValue
              label={t('auctionMetrics:volume.settlementFailed')}
              value={formatCount(closed.settlementFailedTerminal)}
            />
            <KeyValue
              label={t('auctionMetrics:volume.cancelled')}
              note={t('auctionMetrics:volume.cancelledNote')}
              value={formatCount(player.cancelled)}
            />
          </KeyValueList>
        </MetricCard>

        <MetricCard
          title={t('auctionMetrics:volume.officialTitle')}
          badge={<Badge tone="neutral">{t('auctionMetrics:badges.realMoney')}</Badge>}
        >
          <div className="grid gap-3">
            <div>
              <p className="am-big text-3xl leading-9 font-semibold tabular-nums">
                {formatCount(official.published)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t('auctionMetrics:volume.officialFoot', {
                  official: formatCount(official.byMark.OFFICIAL),
                  premium: formatCount(official.byMark.PREMIUM),
                })}
              </p>
            </div>
            <UnavailableNote
              title={t('auctionMetrics:volume.officialRateUnavailable')}
              reason={reasonText(t, 'officialSuccessRate', official.successRate.reason)}
            />
          </div>
        </MetricCard>
      </div>
    </section>
  )
}
