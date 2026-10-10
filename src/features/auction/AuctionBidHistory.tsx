import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { queryKeys } from '@/shared/query-keys'
import { countLabel, formatLocale } from '@/shared/i18n/format'
import { i18n } from '@/shared/i18n/i18n'
import { AUCTION_BID_HISTORY_PAGE_SIZE, fetchAuctionBidHistory } from './detail-api'

interface AuctionBidHistoryProps {
  readonly auctionId: string
}

const dateTimeOf = (placedAt: string): string =>
  new Intl.DateTimeFormat(formatLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(placedAt),
  )

/**
 * Historial publico y paginado de pujas (HU-88).
 *
 * Consulta independiente del detalle: una falla aqui no debe convertir toda
 * `AuctionDetailPage` en error, ni al reves. Nunca muestra identidad del
 * postor -ni siquiera un alias generico como "Jugador anonimo", que seria
 * inventar una regla de anonimizacion que todavia no existe-: solo monto y
 * fecha, que es exactamente lo que el contrato publico expone.
 */
export const AuctionBidHistory = ({ auctionId }: AuctionBidHistoryProps): React.JSX.Element => {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const pageSize = AUCTION_BID_HISTORY_PAGE_SIZE

  const query = useQuery({
    queryKey: queryKeys.auction.bidHistory(auctionId, page, pageSize),
    queryFn: ({ signal }) => fetchAuctionBidHistory(auctionId, page, pageSize, signal),
  })

  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const items = query.data?.items ?? []

  return (
    <section aria-labelledby="bid-history-title" className="auction-history space-y-3">
      <h2 id="bid-history-title" className="text-lg font-semibold text-ink">
        {t('auction:detail.bidHistory.title')}
      </h2>
      {query.isLoading && (
        <p role="status" className="text-sm text-muted">
          {t('common:loading')}
        </p>
      )}
      {query.isError && (
        <p role="alert" className="text-sm text-danger">
          {t('auction:detail.bidHistory.error')}
        </p>
      )}
      {!query.isLoading && !query.isError && items.length === 0 && (
        <p className="text-sm text-muted">{t('auction:detail.bidHistory.empty')}</p>
      )}
      {!query.isLoading && !query.isError && items.length > 0 && (
        <ul className="auction-history-list divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
            >
              <span className="font-medium text-ink">
                {countLabel(i18n.t, 'common:count.credits', item.amountCredits)}
              </span>
              <span className="text-muted">{dateTimeOf(item.placedAt)}</span>
            </li>
          ))}
        </ul>
      )}
      {total > pageSize && (
        <nav
          aria-label={t('auction:detail.bidHistory.pagination')}
          className="flex items-center gap-3"
        >
          <Button
            className="auction-button-utility"
            variant="secondary"
            disabled={page === 1}
            onClick={() => {
              setPage((current) => Math.max(1, current - 1))
            }}
          >
            {t('auction:previous')}
          </Button>
          <span className="text-sm text-muted">
            {t('auction:market.pageOf', { page: String(page), pages: String(totalPages) })}
          </span>
          <Button
            className="auction-button-utility"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => {
              setPage((current) => current + 1)
            }}
          >
            {t('auction:next')}
          </Button>
        </nav>
      )}
    </section>
  )
}
