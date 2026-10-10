import { useTranslation } from 'react-i18next'

import { SelectField } from '@/components/ui/form/SelectField'
import { Clock } from '@/components/ui/icons'

import { DASH, formatCount, formatDuration } from './metricsFormat'
import { KeyValue, KeyValueList, MetricCard, SectionHeading, StatCard } from './parts'
import { reasonText } from './reasons'
import { TrendChart, TrendTable } from './TrendChart'
import type { CloseReason, ClosingTimeAndTrends, TrendGranularity } from './types'

const REASONS: readonly { readonly key: CloseReason; readonly label: string }[] = [
  { key: 'EXPIRED_WITH_WINNER', label: 'withWinner' },
  { key: 'EXPIRED_WITHOUT_BIDS', label: 'withoutBids' },
  { key: 'BUY_NOW', label: 'buyNow' },
]

const GRANULARITIES: readonly TrendGranularity[] = ['WEEK', 'DAY', 'MONTH']

const seconds = (value: number | null): string =>
  value === null ? DASH : `${formatCount(value)} s`

export interface ClosingTrendSectionProps {
  readonly data: ClosingTimeAndTrends
  /** Tasa de exito del periodo (§4.1) para la fila de totales; `null` si esa seccion no cargo. */
  readonly successRate: number | null
  readonly granularity: TrendGranularity
  /** `DAY` solo se ofrece cuando el periodo no supera 92 dias (contrato §4.5). */
  readonly dailyAllowed: boolean
  readonly onGranularityChange: (granularity: TrendGranularity) => void
}

/** CA-05: tiempo de cierre y tendencia por bucket (contrato §4.5). */
export const ClosingTrendSection = ({
  data,
  successRate,
  granularity,
  dailyAllowed,
  onGranularityChange,
}: ClosingTrendSectionProps): React.JSX.Element => {
  const { t } = useTranslation()
  const { closingTime, trends } = data

  return (
    <section aria-labelledby="auction-metrics-trends" className="grid min-w-0 gap-4">
      <SectionHeading icon={Clock} id="auction-metrics-trends">
        {t('auctionMetrics:trends.title')}
      </SectionHeading>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
        <StatCard
          icon={Clock}
          label={t('auctionMetrics:trends.average')}
          value={formatDuration(closingTime.average)}
          foot={t('auctionMetrics:trends.averageFoot', {
            median: formatDuration(closingTime.median),
            p90: formatDuration(closingTime.p90),
          })}
        />
        <MetricCard title={t('auctionMetrics:trends.byReason')}>
          <KeyValueList>
            {REASONS.map((reason) => (
              <KeyValue
                key={reason.key}
                label={t(`auctionMetrics:trends.reason.${reason.label}`)}
                note={formatCount(closingTime.byCloseReason[reason.key].sampleSize)}
                value={formatDuration(closingTime.byCloseReason[reason.key].average)}
              />
            ))}
          </KeyValueList>
        </MetricCard>
        <MetricCard title={t('auctionMetrics:trends.lag')}>
          <KeyValueList>
            <KeyValue
              label={t('auctionMetrics:trends.lagAverage')}
              value={seconds(closingTime.settlementLagSeconds.average)}
            />
            <KeyValue
              label={t('auctionMetrics:trends.lagP90')}
              value={seconds(closingTime.settlementLagSeconds.p90)}
            />
            <KeyValue
              label={t('auctionMetrics:trends.lagSample')}
              value={formatCount(closingTime.settlementLagSeconds.sampleSize)}
            />
          </KeyValueList>
        </MetricCard>
      </div>

      <section className="am-panel min-w-0 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">
              {t(`auctionMetrics:trends.cardTitle.${granularity}`)}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {t(`auctionMetrics:trends.cardDescription.${granularity}`)}
            </p>
          </div>
          <div className="min-w-36">
            <SelectField
              label={t('auctionMetrics:trends.groupBy')}
              value={granularity}
              onChange={(event) => {
                onGranularityChange(event.target.value as TrendGranularity)
              }}
              options={GRANULARITIES.filter((option) => dailyAllowed || option !== 'DAY').map(
                (option) => ({
                  value: option,
                  label: t(`auctionMetrics:trends.granularity.${option}`),
                }),
              )}
            />
          </div>
        </div>

        <div className="mt-4">
          <TrendChart buckets={trends.buckets} granularity={granularity} />
        </div>

        <details className="mt-4">
          <summary className="am-link cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            {t('auctionMetrics:trends.viewAsTable')}
          </summary>
          <div className="mt-3">
            <TrendTable
              buckets={trends.buckets}
              granularity={granularity}
              successRate={successRate}
              averageClosing={closingTime.average}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {t(`auctionMetrics:trends.tableNote.${granularity}`)}
          </p>
        </details>
      </section>

      <p className="text-xs text-muted">
        <b className="font-medium text-ink">{t('auctionMetrics:trends.officialClosingTitle')}</b>{' '}
        {reasonText(t, 'officialClosingTime', closingTime.officialAuctions.reason)}
      </p>
    </section>
  )
}
