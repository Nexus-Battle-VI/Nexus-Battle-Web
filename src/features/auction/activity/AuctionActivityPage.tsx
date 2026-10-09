import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { QueryState } from '@/components/ui/QueryState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDateTime } from '@/lib/format'
import { countLabel, formatInteger } from '@/shared/i18n/format'
import { queryKeys } from '@/shared/query-keys'
import { AuctionProductSummary } from '../AuctionProductSummary'
import '../auction-remaster.css'
import {
  fetchMyAuctions,
  fetchMyBids,
  fetchMyTransactions,
  fetchMyViewStatistics,
  type AuctionTransactionType,
  type BidParticipationStatus,
} from './api'

const PAGE_SIZE = 16
const linkClass =
  'inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

interface SectionProps {
  readonly title: string
  readonly description: string
  readonly children: ReactNode
}

const ActivitySection = ({ title, description, children }: SectionProps): React.JSX.Element => (
  <section
    aria-label={title}
    className="auction-activity-section space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
  >
    <header>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </header>
    {children}
  </section>
)

interface PaginationProps {
  readonly page: number
  readonly total: number
  readonly label: string
  readonly onPageChange: (page: number) => void
}

const ActivityPagination = ({
  page,
  total,
  label,
  onPageChange,
}: PaginationProps): React.JSX.Element | null => {
  const { t } = useTranslation()
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  return (
    <nav
      aria-label={label}
      className="flex items-center justify-between gap-3 border-t border-border pt-3"
    >
      <button
        type="button"
        disabled={page === 1}
        onClick={() => {
          onPageChange(page - 1)
        }}
        className={`${linkClass} auction-button-utility`}
      >
        {t('auction:previous')}
      </button>
      <span className="text-sm text-muted">
        {t('auction:activity.pageOf', { page: String(page), pages: String(pages) })}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => {
          onPageChange(page + 1)
        }}
        className={`${linkClass} auction-button-utility`}
      >
        {t('auction:next')}
      </button>
    </nav>
  )
}

const transactionLabel = (type: AuctionTransactionType, t: (key: string) => string): string =>
  t(`auction:activity.transactions.types.${type}`)

const participationLabel = (status: BidParticipationStatus, t: (key: string) => string): string =>
  t(`auction:activity.bids.status.${status}`)

/** Tono visual del resultado de participacion, sin alterar el estado de dominio. */
const participationTone = (status: BidParticipationStatus): 'success' | 'warning' | 'danger' => {
  if (status === 'LEADING' || status === 'WON') return 'success'
  return status === 'OUTBID' ? 'warning' : 'danger'
}

/** Panel unificado de HU-89; enlaza HU-68/HU-69 y no duplica sus datos. */
export const AuctionActivityPage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const [ownedPage, setOwnedPage] = useState(1)
  const [bidsPage, setBidsPage] = useState(1)
  const [transactionsPage, setTransactionsPage] = useState(1)

  const owned = useQuery({
    queryKey: queryKeys.auction.activity.owned(ownedPage, PAGE_SIZE),
    queryFn: ({ signal }) => fetchMyAuctions({ page: ownedPage, pageSize: PAGE_SIZE }, signal),
  })
  const bids = useQuery({
    queryKey: queryKeys.auction.activity.bids(bidsPage, PAGE_SIZE),
    queryFn: ({ signal }) => fetchMyBids({ page: bidsPage, pageSize: PAGE_SIZE }, signal),
  })
  const transactions = useQuery({
    queryKey: queryKeys.auction.activity.transactions(transactionsPage, PAGE_SIZE),
    queryFn: ({ signal }) =>
      fetchMyTransactions({ page: transactionsPage, pageSize: PAGE_SIZE }, signal),
  })
  const statistics = useQuery({
    queryKey: queryKeys.auction.activity.viewStatistics,
    queryFn: ({ signal }) => fetchMyViewStatistics(signal),
  })

  return (
    <main className="auction-shell auction-page space-y-4">
      <Breadcrumb
        items={[
          { label: t('auction:crumbs.home'), to: '/ecommerce' },
          { label: t('auction:crumbs.auction'), to: '/auction' },
          { label: t('auction:activity.title') },
        ]}
      />
      <header className="auction-hero flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="auction-kicker">{t('auction:crumbs.auction')}</p>
          <h1 className="auction-title">{t('auction:activity.title')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">{t('auction:activity.subtitle')}</p>
        </div>
        <nav
          aria-label={t('auction:activity.related')}
          className="auction-nav flex flex-wrap gap-2"
        >
          <Link
            className={`${linkClass} auction-link auction-button-tertiary`}
            to="/auction/watchlist"
          >
            {t('auction:activity.watchlist')}
          </Link>
          <Link
            className={`${linkClass} auction-link auction-button-tertiary`}
            to="/auction/pending-claims"
          >
            {t('auction:activity.pendingClaims')}
          </Link>
        </nav>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <ActivitySection
          title={t('auction:activity.owned.title')}
          description={t('auction:activity.owned.description')}
        >
          <QueryState
            isLoading={owned.isPending}
            error={owned.error}
            isEmpty={owned.data?.items.length === 0}
            emptyMessage={t('auction:activity.owned.empty')}
          >
            <ul className="space-y-3">
              {owned.data?.items.map((auction) => (
                <li
                  key={auction.auctionId}
                  className="auction-card auction-activity-lot-card rounded-lg border border-border bg-surface-raised p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <AuctionProductSummary productId={auction.productId} />
                    <StatusBadge status={auction.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted">{t('auction:activity.minimumBid')}</dt>
                      <dd className="font-medium text-ink">
                        {countLabel(t, 'common:count.credits', auction.minimumBidCredits)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">{t('auction:activity.currentBid')}</dt>
                      <dd className="font-medium text-ink">
                        {auction.currentBidCredits === null
                          ? t('auction:activity.noBids')
                          : countLabel(t, 'common:count.credits', auction.currentBidCredits)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">{t('auction:activity.bidCount')}</dt>
                      <dd className="font-medium text-ink">{formatInteger(auction.bidCount)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">{t('auction:activity.closes')}</dt>
                      <dd className="font-medium text-ink">{formatDateTime(auction.closesAt)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      className={`${linkClass} auction-button-secondary`}
                      to={`/auction/${auction.auctionId}`}
                    >
                      {t('auction:market.viewDetail')}
                    </Link>
                    {auction.actions.cancel && (
                      <Link
                        className={`${linkClass} auction-button-destructive`}
                        to={`/auction/${auction.auctionId}?cancel=1`}
                      >
                        {t('auction:activity.owned.cancel')}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <ActivityPagination
              page={ownedPage}
              total={owned.data?.total ?? 0}
              label={t('auction:activity.owned.pagination')}
              onPageChange={setOwnedPage}
            />
          </QueryState>
        </ActivitySection>

        <ActivitySection
          title={t('auction:activity.bids.title')}
          description={t('auction:activity.bids.description')}
        >
          <QueryState
            isLoading={bids.isPending}
            error={bids.error}
            isEmpty={bids.data?.items.length === 0}
            emptyMessage={t('auction:activity.bids.empty')}
          >
            <ul className="space-y-3">
              {bids.data?.items.map((bid) => (
                <li
                  key={bid.auctionId}
                  className="auction-card auction-activity-lot-card rounded-lg border border-border bg-surface-raised p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <AuctionProductSummary productId={bid.productId} />
                    <span
                      className="auction-state-badge rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand"
                      data-tone={participationTone(bid.participationStatus)}
                    >
                      {participationLabel(bid.participationStatus, t)}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted">{t('auction:activity.bids.mine')}</dt>
                      <dd className="font-medium text-ink">
                        {countLabel(t, 'common:count.credits', bid.ownLatestBidCredits)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">{t('auction:activity.currentBid')}</dt>
                      <dd className="font-medium text-ink">
                        {bid.currentBidCredits === null
                          ? t('auction:activity.noBids')
                          : countLabel(t, 'common:count.credits', bid.currentBidCredits)}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    className={`${linkClass} auction-button-secondary mt-3`}
                    to={`/auction/${bid.auctionId}`}
                  >
                    {t('auction:market.viewDetail')}
                  </Link>
                </li>
              ))}
            </ul>
            <ActivityPagination
              page={bidsPage}
              total={bids.data?.total ?? 0}
              label={t('auction:activity.bids.pagination')}
              onPageChange={setBidsPage}
            />
          </QueryState>
        </ActivitySection>

        <ActivitySection
          title={t('auction:activity.transactions.title')}
          description={t('auction:activity.transactions.description')}
        >
          <QueryState
            isLoading={transactions.isPending}
            error={transactions.error}
            isEmpty={transactions.data?.items.length === 0}
            emptyMessage={t('auction:activity.transactions.empty')}
          >
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface-raised">
              {transactions.data?.items.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex flex-wrap items-start justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-medium text-ink">{transactionLabel(transaction.type, t)}</p>
                    <p className="auction-meta text-muted">
                      {formatDateTime(transaction.occurredAt)} · {transaction.reference}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={transaction.status} />
                    {transaction.value !== null && (
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {countLabel(t, 'common:count.credits', transaction.value.amount)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <ActivityPagination
              page={transactionsPage}
              total={transactions.data?.total ?? 0}
              label={t('auction:activity.transactions.pagination')}
              onPageChange={setTransactionsPage}
            />
          </QueryState>
        </ActivitySection>

        <ActivitySection
          title={t('auction:activity.statistics.title')}
          description={t('auction:activity.statistics.description')}
        >
          <QueryState isLoading={statistics.isPending} error={statistics.error}>
            {statistics.data?.availability === 'UNAVAILABLE' ? (
              <p className="rounded-lg border border-border bg-surface-raised p-4 text-sm text-muted">
                {t('auction:activity.statistics.unavailable')}
              </p>
            ) : (
              <ul className="space-y-2">
                {statistics.data?.metrics.map((metric) => (
                  <li
                    key={metric.auctionId}
                    className="flex justify-between rounded-lg border border-border bg-surface-raised p-3 text-sm"
                  >
                    <span className="text-muted">{metric.auctionId}</span>
                    <strong className="text-ink">{formatInteger(metric.views)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </ActivitySection>
      </div>
    </main>
  )
}
