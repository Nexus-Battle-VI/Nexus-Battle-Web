import { useTranslation } from 'react-i18next'

import { Coins } from '@/components/ui/icons'

import { formatCount, formatCredits, formatRealMoney } from './metricsFormat'
import {
  Badge,
  KeyValue,
  KeyValueList,
  MetricCard,
  SectionHeading,
  TableWrap,
  Td,
  Th,
  Tr,
  UnavailableNote,
} from './parts'
import { reasonText } from './reasons'
import type { AveragePrices } from './types'

/**
 * CA-03: precios promedio por moneda (contrato §4.3). Creditos y dinero real viven en
 * tarjetas distintas y NUNCA se suman ni se convierten: cada importe lleva su unidad.
 */
export const PricesSection = ({ data }: { readonly data: AveragePrices }): React.JSX.Element => {
  const { t } = useTranslation()
  const { credits, realMoney } = data

  return (
    <section aria-labelledby="auction-metrics-prices" className="grid min-w-0 gap-4">
      <SectionHeading icon={Coins} id="auction-metrics-prices">
        {t('auctionMetrics:prices.title')}
      </SectionHeading>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
        <MetricCard
          title={t('auctionMetrics:prices.playerTitle')}
          badge={<Badge tone="ok">{t('auctionMetrics:badges.creditsSalePrice')}</Badge>}
        >
          <div className="grid gap-4">
            <div>
              <p className="am-big text-3xl leading-9 font-semibold tabular-nums">
                {formatCredits(credits.average)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t('auctionMetrics:prices.averageOf', {
                  count: credits.salesCount,
                  value: formatCount(credits.salesCount),
                })}
              </p>
            </div>
            <KeyValueList>
              <KeyValue
                label={t('auctionMetrics:prices.median')}
                value={formatCredits(credits.median)}
              />
              <KeyValue label={t('auctionMetrics:prices.min')} value={formatCredits(credits.min)} />
              <KeyValue label={t('auctionMetrics:prices.max')} value={formatCredits(credits.max)} />
            </KeyValueList>
            <div className="am-subpanel p-3">
              <p className="mb-1.5 text-xs font-medium text-ink">
                {t('auctionMetrics:prices.byChannel')}
              </p>
              <KeyValueList>
                <KeyValue
                  label={t('auctionMetrics:prices.auctionClose', {
                    value: formatCount(credits.byChannel.AUCTION_CLOSE.salesCount),
                  })}
                  value={formatCredits(credits.byChannel.AUCTION_CLOSE.average)}
                />
                <KeyValue
                  label={t('auctionMetrics:prices.buyNow', {
                    value: formatCount(credits.byChannel.BUY_NOW.salesCount),
                  })}
                  value={formatCredits(credits.byChannel.BUY_NOW.average)}
                />
              </KeyValueList>
            </div>
            <p className="text-xs text-muted">
              {t('auctionMetrics:prices.listedMinimum', {
                count: credits.listedMinimumBid.auctionsCount,
                value: formatCount(credits.listedMinimumBid.auctionsCount),
              })}{' '}
              <b className="font-medium text-ink">
                {formatCredits(credits.listedMinimumBid.average)}
              </b>
            </p>
          </div>
        </MetricCard>

        <MetricCard
          className="[grid-column:1/-1]"
          title={t('auctionMetrics:prices.officialTitle')}
          badge={<Badge tone="neutral">{t('auctionMetrics:badges.realMoneyListPrice')}</Badge>}
        >
          <div className="grid gap-4">
            <UnavailableNote
              title={t('auctionMetrics:prices.finalPriceUnavailable')}
              reason={reasonText(t, 'officialFinalPrice', realMoney.finalSalePrice.reason)}
            />
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t('auctionMetrics:prices.currency')}</Th>
                  <Th numeric>{t('auctionMetrics:prices.published')}</Th>
                  <Th numeric>{t('auctionMetrics:prices.minimumBidAverage')}</Th>
                  <Th numeric>{t('auctionMetrics:prices.minimum')}</Th>
                  <Th numeric>{t('auctionMetrics:prices.maximum')}</Th>
                  <Th numeric>{t('auctionMetrics:prices.buyNowAverage')}</Th>
                </tr>
              </thead>
              <tbody>
                {realMoney.byCurrency.map((row) => (
                  <Tr key={row.currency}>
                    <Td strong>{row.currency}</Td>
                    <Td numeric>{formatCount(row.publishedCount)}</Td>
                    <Td numeric>{formatRealMoney(row.listedMinimumBid.average)}</Td>
                    <Td numeric>{formatRealMoney(row.listedMinimumBid.min)}</Td>
                    <Td numeric>{formatRealMoney(row.listedMinimumBid.max)}</Td>
                    <Td numeric>
                      {row.listedBuyNow.average === null ? (
                        <span className="text-muted">{t('auctionMetrics:prices.noBuyNow')}</span>
                      ) : (
                        <>
                          {formatRealMoney(row.listedBuyNow.average)}{' '}
                          <span className="text-xs text-muted">
                            ({formatCount(row.listedBuyNow.count)})
                          </span>
                        </>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </MetricCard>
      </div>
    </section>
  )
}
