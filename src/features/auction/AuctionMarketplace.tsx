import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { BadgeDollarSign, Coins } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { formatMoney } from '@/lib/format'
import { canPublishOfficialAuctions } from '@/shared/rbac'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { AUCTION_PAGE_SIZE, listActiveAuctions, type ActiveAuction } from './api'
import { i18n } from '@/shared/i18n/i18n'
import { countLabel, formatInteger, formatLocale } from '@/shared/i18n/format'
import { AuctionCountdown } from './AuctionCountdown'
import { AuctionProductSummary } from './AuctionProductSummary'

const priceOf = (auction: ActiveAuction): string =>
  auction.priceKind === 'REAL_MONEY'
    ? formatMoney(auction.minimumBidAmountMinor, auction.currency)
    : countLabel(i18n.t, 'common:count.credits', auction.minimumBidCredits)

/** Precio de compra inmediata, o `null` si el publicador no lo configuro. */
const buyNowPriceOf = (auction: ActiveAuction): string | null =>
  auction.priceKind === 'REAL_MONEY'
    ? auction.buyNowAmountMinor === null
      ? null
      : formatMoney(auction.buyNowAmountMinor, auction.currency)
    : auction.buyNowCredits === null
      ? null
      : countLabel(i18n.t, 'common:count.credits', auction.buyNowCredits)

const linkClass =
  'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const AuctionCard = ({ auction }: { readonly auction: ActiveAuction }): React.JSX.Element => {
  const { t } = useTranslation()
  const subject = useSession((state) => state.subject)
  const official = auction.publisherType === 'GAME_MASTER'
  const buyNowPrice = buyNowPriceOf(auction)
  /*
   * "Comprar ahora" abre el detalle con `?buyNow=1`, que enfoca directamente la
   * confirmacion de `ImmediatePurchaseCard`: alli se valida el saldo y se
   * ejecuta la compra con su Idempotency-Key. No se repite ese flujo aqui.
   * El vendedor no puede comprar su propia subasta.
   */
  const canBuyNow = !official && buyNowPrice !== null && subject !== auction.sellerId
  const mark = t(
    auction.officialMark === 'PREMIUM' ? 'auction:marks.PREMIUM' : 'auction:marks.OFFICIAL',
  )
  return (
    <article className="rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AuctionProductSummary productId={auction.productId} />
        {official && (
          <span
            aria-label={t('auction:market.officialLabel', { mark })}
            className="rounded-full border border-brand/40 bg-brand/10 px-2 py-1 text-xs font-semibold text-brand"
          >
            {mark}
          </span>
        )}
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">{t('auction:market.minimumPrice')}</dt>
          <dd className="flex items-center gap-1 font-semibold text-ink">
            {official ? (
              <BadgeDollarSign aria-hidden="true" className="size-4 text-brand" />
            ) : (
              <Coins aria-hidden="true" className="size-4 text-brand" />
            )}
            {priceOf(auction)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t('auction:market.buyNow')}</dt>
          <dd className="font-semibold text-ink">
            {buyNowPrice ?? t('auction:market.buyNowNone')}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t('auction:market.closes')}</dt>
          <dd className="font-medium text-ink">
            {new Intl.DateTimeFormat(formatLocale(), {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(auction.closesAt))}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t('auction:market.timeRemaining')}</dt>
          <dd className="font-medium text-ink">
            <AuctionCountdown closesAt={auction.closesAt} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t('auction:market.bids')}</dt>
          <dd className="font-medium text-ink">{formatInteger(auction.bidCount)}</dd>
        </div>
      </dl>
      {
        /*
         * Solo para PLAYER: el detalle real (`GET /v1/auctions/:id`) resuelve
         * unicamente subastas de jugador -`findById`, no `findOfficialById`-,
         * asi que un enlace aqui llevaria a un 404. Pujar y comprar en dinero
         * real ademas exigen la pasarela de pagos que HU-66 todavia no
         * implementa (ver el propio issue de la historia).
         */
        !official && (
          <div className="mt-3 flex flex-wrap gap-2">
            {canBuyNow && (
              <Link
                to={`/auction/${auction.id}?buyNow=1`}
                className={`${linkClass} bg-brand text-brand-ink hover:opacity-90`}
              >
                {t('auction:market.buyNowAction')}
              </Link>
            )}
            <Link
              to={`/auction/${auction.id}`}
              className={`${linkClass} border border-border text-ink hover:bg-surface-raised`}
            >
              {t('auction:market.viewDetail')}
            </Link>
          </div>
        )
      }
    </article>
  )
}

export const AuctionMarketplace = (): React.JSX.Element => {
  const [page, setPage] = useState(1)
  const roles = useSession((state) => state.roles)
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: queryKeys.auctions.activePage(page),
    queryFn: ({ signal }) => listActiveAuctions(page, signal),
  })
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / AUCTION_PAGE_SIZE))

  return (
    <section aria-labelledby="active-auctions-title" className="mt-8 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="active-auctions-title" className="text-xl font-semibold text-ink">
            {t('auction:market.title')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('auction:market.subtitle')}</p>
        </div>
        {/*
         * Enlaces contextuales, no un acceso nuevo en NAVIGATION (HU-02 fija
         * esa lista aparte): quien ya esta viendo subastas es a quien mas le
         * sirve moverse a su seguimiento o a publicar la suya.
         */}
        <nav aria-label={t('auction:market.otherViews')} className="flex flex-wrap gap-2">
          <Link
            to="/auction/watchlist"
            className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
          >
            {t('auction:market.myFollowed')}
          </Link>
          <Link
            to="/auction/publish"
            className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
          >
            {t('auction:market.publishMine')}
          </Link>
          {canPublishOfficialAuctions(roles) && (
            <Link
              to="/auction/publish-official"
              className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
            >
              {t('auction:market.publishOfficial')}
            </Link>
          )}
        </nav>
      </header>
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={query.data?.items.length === 0}
        emptyMessage={t('auction:market.empty')}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(query.data?.items ?? []).map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
        {query.data !== undefined && query.data.total > AUCTION_PAGE_SIZE && (
          <nav aria-label={t('auction:market.pagination')} className="mt-4 flex items-center gap-3">
            <Button
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
      </QueryState>
    </section>
  )
}
