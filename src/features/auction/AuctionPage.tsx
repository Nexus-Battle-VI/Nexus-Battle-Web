import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { formatDateTime } from '@/lib/format'
import { countLabel } from '@/shared/i18n/format'
import { AuctionProductSummary } from './AuctionProductSummary'
import { useWatchlist } from './useWatchlist'
import './auction-remaster.css'

/** Pantalla del jugador para administrar su lista privada de subastas (HU-68). */
export const AuctionPage = (): React.JSX.Element => {
  const { items, isLoading, loadError, unfollow, isSaving } = useWatchlist()
  const { t } = useTranslation()

  return (
    <div className="auction-shell auction-page flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: t('auction:crumbs.home'), to: '/ecommerce' },
          { label: t('auction:crumbs.auction'), to: '/auction' },
          { label: t('auction:crumbs.watchlist') },
        ]}
      />
      <header className="auction-hero">
        <div>
          <p className="auction-kicker">{t('auction:crumbs.auction')}</p>
          <h1 className="auction-title font-semibold text-ink">{t('auction:watchlist.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('auction:watchlist.subtitle')}</p>
        </div>
        <Link
          to="/auction"
          className="auction-link inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
        >
          {t('auction:watchlist.viewActive')}
        </Link>
      </header>

      {isLoading && (
        <p role="status" className="text-sm text-muted">
          {t('auction:loading')}
        </p>
      )}
      {!isLoading && loadError !== null && (
        <p role="alert" className="text-sm text-danger">
          {t('auction:watchlist.loadFailed')}
        </p>
      )}
      {!isLoading && loadError === null && items.length === 0 && (
        <p className="text-sm text-muted">{t('auction:watchlist.empty')}</p>
      )}
      {!isLoading && loadError === null && items.length > 0 && (
        <ul className="auction-collection-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map(({ auction, followedAt }) => (
            <li
              key={auction.id}
              className="auction-card rounded-lg border border-border bg-surface-raised p-4"
            >
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <AuctionProductSummary productId={auction.productId} />
                </div>
                <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-medium text-success">
                  {auction.status}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">{t('auction:watchlist.minimumBid')}</dt>
                  <dd className="font-medium text-ink">
                    {countLabel(t, 'common:count.credits', auction.minimumBidCredits)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">{t('auction:watchlist.closes')}</dt>
                  <dd className="break-words font-medium text-ink">
                    {formatDateTime(auction.closesAt)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted">
                {t('auction:watchlist.since', { date: formatDateTime(followedAt) })}
              </p>
              <Link
                to={`/auction/${auction.id}`}
                className="mt-4 inline-flex rounded-md border border-border px-3 py-2 text-sm font-medium text-ink"
              >
                {t('auction:market.viewDetail')}
              </Link>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  unfollow(auction.id)
                }}
                className="ml-2 mt-4 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
              >
                {t('auction:watchlist.unfollow')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
