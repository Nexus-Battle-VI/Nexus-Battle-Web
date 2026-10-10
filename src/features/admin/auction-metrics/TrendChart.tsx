import { useTranslation } from 'react-i18next'

import { formatCount, formatDay, formatDuration, formatMonth, formatRate } from './metricsFormat'
import { TableWrap, Td, Th, Tr } from './parts'
import type { TrendBucket, TrendGranularity } from './types'

const bucketLabel = (bucket: TrendBucket, granularity: TrendGranularity): string => {
  if (granularity === 'DAY') return formatDay(bucket.bucketStart)
  if (granularity === 'MONTH') return formatMonth(bucket.bucketStart)

  return `${formatDay(bucket.bucketStart)} – ${formatDay(bucket.bucketEnd)}`
}

/** Vendidas = cierre con ganador + compra inmediata (misma suma que la tasa de exito). */
const soldOf = (bucket: TrendBucket): number =>
  bucket.playerAuctions.closedWithWinner + bucket.playerAuctions.soldByBuyNow

const SERIES = [
  { key: 'published', swatch: 'bg-brand' },
  { key: 'sold', swatch: 'bg-success' },
  { key: 'withoutBids', swatch: 'bg-warning' },
] as const

/**
 * Barras agrupadas con CSS (sin libreria de graficos): publicadas, vendidas y sin pujas
 * por bucket. La altura es relativa al mayor valor visible; un valor 0 conserva 2 % para
 * que la barra siga siendo visible como "cero", y el numero exacto va siempre encima.
 * El grafico es `role="img"` y la tabla "Ver como tabla" entrega los mismos datos.
 */
export const TrendChart = ({
  buckets,
  granularity,
}: {
  readonly buckets: readonly TrendBucket[]
  readonly granularity: TrendGranularity
}): React.JSX.Element => {
  const { t } = useTranslation()

  const max = Math.max(
    0,
    ...buckets.flatMap((bucket) => [
      bucket.playerAuctions.published,
      soldOf(bucket),
      bucket.playerAuctions.closedWithoutBids,
    ]),
  )
  const height = (value: number): string =>
    `${String(max === 0 ? 2 : Math.max(2, Math.round((value / max) * 100)))}%`

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {SERIES.map((serie) => (
          <span key={serie.key}>
            <i
              className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-[2px] align-[-1px] ${serie.swatch}`}
            />
            {t(`auctionMetrics:trends.legend.${serie.key}`)}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label={t(`auctionMetrics:trends.chartLabel.${granularity}`)}
          className="grid items-end gap-4 [grid-auto-columns:minmax(2.75rem,1fr)] [grid-auto-flow:column]"
        >
          {buckets.map((bucket) => {
            const bars = [
              { color: 'bg-brand', value: bucket.playerAuctions.published },
              { color: 'bg-success', value: soldOf(bucket) },
              { color: 'bg-warning', value: bucket.playerAuctions.closedWithoutBids },
            ]

            return (
              <div key={bucket.bucketStart} className="grid gap-2">
                <div className="flex h-36 items-end justify-center gap-1.5 border-b border-border px-1">
                  {bars.map((bar) => (
                    <div
                      key={bar.color}
                      className="flex h-full max-w-9 flex-1 flex-col items-center justify-end gap-0.5"
                    >
                      <span className="text-[0.6875rem] text-muted tabular-nums">
                        {formatCount(bar.value)}
                      </span>
                      <i
                        className={`block min-h-[2px] w-full rounded-t ${bar.color}`}
                        style={{ height: height(bar.value) }}
                      />
                    </div>
                  ))}
                </div>
                <div className="text-center text-xs text-muted">
                  <b className="block font-medium text-ink">{bucketLabel(bucket, granularity)}</b>
                  {t('auctionMetrics:trends.success', {
                    value: formatRate(bucket.playerAuctions.successRate),
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Los mismos datos del grafico en una tabla, con la fila de totales. */
export const TrendTable = ({
  buckets,
  granularity,
  successRate,
  averageClosing,
}: {
  readonly buckets: readonly TrendBucket[]
  readonly granularity: TrendGranularity
  /** Tasa de exito del periodo completo (§4.1): la suma de buckets no puede inferirla. */
  readonly successRate: number | null
  readonly averageClosing: number | null
}): React.JSX.Element => {
  const { t } = useTranslation()
  const total = (pick: (bucket: TrendBucket) => number): number =>
    buckets.reduce((sum, bucket) => sum + pick(bucket), 0)

  return (
    <TableWrap>
      <thead>
        <tr>
          <Th>{t(`auctionMetrics:trends.bucketColumn.${granularity}`)}</Th>
          <Th numeric>{t('auctionMetrics:trends.columns.published')}</Th>
          <Th numeric>{t('auctionMetrics:trends.columns.withWinner')}</Th>
          <Th numeric>{t('auctionMetrics:trends.columns.buyNow')}</Th>
          <Th numeric>{t('auctionMetrics:trends.columns.withoutBids')}</Th>
          <Th numeric>{t('auctionMetrics:trends.columns.cancelled')}</Th>
          <Th numeric>{t('auctionMetrics:trends.columns.success')}</Th>
          <Th numeric>{t('auctionMetrics:trends.columns.averageClosing')}</Th>
        </tr>
      </thead>
      <tbody>
        {buckets.map((bucket) => (
          <Tr key={bucket.bucketStart}>
            <Td>{bucketLabel(bucket, granularity)}</Td>
            <Td numeric>{formatCount(bucket.playerAuctions.published)}</Td>
            <Td numeric>{formatCount(bucket.playerAuctions.closedWithWinner)}</Td>
            <Td numeric>{formatCount(bucket.playerAuctions.soldByBuyNow)}</Td>
            <Td numeric>{formatCount(bucket.playerAuctions.closedWithoutBids)}</Td>
            <Td numeric>{formatCount(bucket.playerAuctions.cancelled)}</Td>
            <Td numeric>{formatRate(bucket.playerAuctions.successRate)}</Td>
            <Td numeric>{formatDuration(bucket.playerAuctions.averageClosingTimeSeconds)}</Td>
          </Tr>
        ))}
        <Tr>
          <Td strong>{t('auctionMetrics:trends.total')}</Td>
          <Td numeric strong>
            {formatCount(total((bucket) => bucket.playerAuctions.published))}
          </Td>
          <Td numeric strong>
            {formatCount(total((bucket) => bucket.playerAuctions.closedWithWinner))}
          </Td>
          <Td numeric strong>
            {formatCount(total((bucket) => bucket.playerAuctions.soldByBuyNow))}
          </Td>
          <Td numeric strong>
            {formatCount(total((bucket) => bucket.playerAuctions.closedWithoutBids))}
          </Td>
          <Td numeric strong>
            {formatCount(total((bucket) => bucket.playerAuctions.cancelled))}
          </Td>
          <Td numeric strong>
            {formatRate(successRate)}
          </Td>
          <Td numeric strong>
            {formatDuration(averageClosing)}
          </Td>
        </Tr>
      </tbody>
    </TableWrap>
  )
}
