import { useState, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { formatDateTime } from '@/lib/format'
import { countLabel } from '@/shared/i18n/format'
import { describeFollowError } from './api'
import { useWatchlist } from './useWatchlist'

/** Pantalla del jugador para administrar su lista privada de subastas (HU-68). */
export const AuctionPage = (): React.JSX.Element => {
  const { items, isLoading, loadError, follow, unfollow, isSaving } = useWatchlist()
  const [auctionId, setAuctionId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  const submit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const id = auctionId.trim()
    if (id.length === 0) return
    setError(null)
    try {
      await follow(id)
      setAuctionId('')
    } catch (cause: unknown) {
      setError(describeFollowError(cause))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <Breadcrumb
        items={[
          { label: t('auction:crumbs.home'), to: '/ecommerce' },
          { label: t('auction:crumbs.watchlist') },
        ]}
      />
      <header>
        <h1 className="text-2xl font-semibold text-ink">{t('auction:watchlist.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('auction:watchlist.subtitle')}</p>
      </header>

      <form
        onSubmit={(event) => {
          void submit(event)
        }}
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-ink">
          {t('auction:watchlist.idLabel')}
          <input
            className="rounded-md border border-border bg-surface px-3 py-2"
            value={auctionId}
            onChange={(event) => {
              setAuctionId(event.target.value)
            }}
          />
        </label>
        <button
          type="submit"
          disabled={isSaving || auctionId.trim().length === 0}
          className="rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {t('auction:watchlist.follow')}
        </button>
      </form>
      {error !== null && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
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
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map(({ auction, followedAt }) => (
            <li key={auction.id} className="rounded-lg border border-border bg-surface-raised p-4">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <h2 className="break-words font-semibold text-ink">
                    {t('auction:watchlist.auction', { id: auction.id })}
                  </h2>
                  <p className="break-words text-sm text-muted">
                    {t('auction:product', { id: auction.productId })}
                  </p>
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
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  unfollow(auction.id)
                }}
                className="mt-4 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
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
