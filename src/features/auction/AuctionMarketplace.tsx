import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { BadgeDollarSign, Coins } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import { formatMoney } from '@/lib/format'
import { canPublishOfficialAuctions } from '@/shared/rbac'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import {
  AUCTION_PAGE_SIZE,
  AUCTION_PAGE_SIZE_OPTIONS,
  listActiveAuctions,
  type ActiveAuction,
  type ActiveAuctionQuery,
  type ActiveAuctionSort,
  type AuctionPriceKind,
  type AuctionPublisherType,
} from './api'
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

/** Estado visual de los filtros: `''` es "sin filtro" (mismo patron que AdminUsersSection). */
interface MarketplaceFilters {
  readonly search: string
  readonly publisherType: '' | AuctionPublisherType
  readonly priceKind: '' | AuctionPriceKind
  readonly hasBuyNow: '' | 'true' | 'false'
  readonly sort: '' | ActiveAuctionSort
}

const DEFAULT_FILTERS: MarketplaceFilters = {
  search: '',
  publisherType: '',
  priceKind: '',
  hasBuyNow: '',
  sort: '',
}

const SORT_OPTIONS: readonly { readonly value: ActiveAuctionSort; readonly labelKey: string }[] = [
  { value: 'closingSoon', labelKey: 'auction:market.sortClosingSoon' },
  { value: 'newest', labelKey: 'auction:market.sortNewest' },
  { value: 'mostBids', labelKey: 'auction:market.sortMostBids' },
  { value: 'priceAsc', labelKey: 'auction:market.sortPriceAsc' },
  { value: 'priceDesc', labelKey: 'auction:market.sortPriceDesc' },
]

const sortsByPrice = (sort: MarketplaceFilters['sort']): boolean =>
  sort === 'priceAsc' || sort === 'priceDesc'

/**
 * Unico lugar de la regla de Auction: ordenar por precio exige
 * `priceKind=CREDITS`. Elegir un orden por precio fija CREDITS; salir de
 * CREDITS con ese orden activo vuelve al orden por defecto. Asi la UI nunca
 * pide `PRICE_SORT_REQUIRES_CREDITS`. Si un mismo cambio trae un orden por
 * precio y otro tipo de precio, gana el orden (lo ultimo que pidio el usuario).
 */
const normalizeFilters = (
  current: MarketplaceFilters,
  patch: Partial<MarketplaceFilters>,
): MarketplaceFilters => {
  const next = { ...current, ...patch }
  if (!sortsByPrice(next.sort) || next.priceKind === 'CREDITS') {
    return next
  }
  return patch.sort !== undefined && sortsByPrice(patch.sort)
    ? { ...next, priceKind: 'CREDITS' }
    : { ...next, sort: '' }
}

/** Traduce el estado visual al contrato: `''` no viaja; el filtrado lo hace Auction. */
const toActiveAuctionQuery = (
  page: number,
  pageSize: number,
  filters: MarketplaceFilters,
): ActiveAuctionQuery => ({
  page,
  pageSize,
  ...(filters.search === '' ? {} : { search: filters.search }),
  ...(filters.publisherType === '' ? {} : { publisherType: filters.publisherType }),
  ...(filters.priceKind === '' ? {} : { priceKind: filters.priceKind }),
  ...(filters.hasBuyNow === '' ? {} : { hasBuyNow: filters.hasBuyNow === 'true' }),
  ...(filters.sort === '' ? {} : { sort: filters.sort }),
})

export const AuctionMarketplace = (): React.JSX.Element => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(AUCTION_PAGE_SIZE)
  const [filters, setFilters] = useState<MarketplaceFilters>(DEFAULT_FILTERS)
  const [inputValue, setInputValue] = useState('')
  const roles = useSession((state) => state.roles)
  const { t } = useTranslation()
  const request = toActiveAuctionQuery(page, pageSize, filters)
  // La clave sale de la misma consulta que se envia: no pueden divergir.
  const query = useQuery({
    queryKey: queryKeys.auctions.activePage({
      page: request.page,
      pageSize: request.pageSize,
      search: request.search ?? null,
      publisherType: request.publisherType ?? null,
      priceKind: request.priceKind ?? null,
      hasBuyNow: request.hasBuyNow ?? null,
      sort: request.sort ?? null,
    }),
    queryFn: ({ signal }) => listActiveAuctions(request, signal),
  })
  const hasActiveFilters = Object.values(filters).some((value) => value !== '')

  // Otro filtro u orden cambia el conjunto de resultados: se vuelve a la primera pagina.
  const changeFilters = (patch: Partial<MarketplaceFilters>): void => {
    setFilters((current) => normalizeFilters(current, patch))
    setPage(1)
  }
  const applySearch = (): void => {
    changeFilters({ search: inputValue.trim() })
  }
  const clearSearch = (): void => {
    setInputValue('')
    changeFilters({ search: '' })
  }
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize))

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
      <div
        role="group"
        aria-label={t('auction:market.filters')}
        className="space-y-3 rounded-lg border border-border bg-surface-raised p-4"
      >
        <div className="flex flex-wrap items-end gap-3">
          <TextField
            label={t('auction:market.searchLabel')}
            placeholder={t('auction:market.searchPlaceholder')}
            type="search"
            maxLength={80}
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                applySearch()
              }
            }}
            className="w-full sm:max-w-md"
          />
          {filters.search !== '' && (
            <Button variant="secondary" onClick={clearSearch}>
              {t('auction:market.clearSearch')}
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SelectField
            label={t('auction:market.publisherFilter')}
            value={filters.publisherType}
            placeholder={t('auction:market.publisherAll')}
            options={[
              { value: 'PLAYER', label: t('auction:market.publisherPlayer') },
              { value: 'GAME_MASTER', label: t('auction:market.publisherOfficial') },
            ]}
            onChange={(event) => {
              changeFilters({
                publisherType: event.target.value as MarketplaceFilters['publisherType'],
              })
            }}
          />
          <SelectField
            label={t('auction:market.priceKindFilter')}
            value={filters.priceKind}
            placeholder={t('auction:market.priceKindAll')}
            options={[
              { value: 'CREDITS', label: t('auction:market.priceKindCredits') },
              { value: 'REAL_MONEY', label: t('auction:market.priceKindRealMoney') },
            ]}
            onChange={(event) => {
              changeFilters({ priceKind: event.target.value as MarketplaceFilters['priceKind'] })
            }}
          />
          <SelectField
            label={t('auction:market.buyNowFilter')}
            value={filters.hasBuyNow}
            placeholder={t('auction:market.buyNowAll')}
            options={[
              { value: 'true', label: t('auction:market.buyNowWith') },
              { value: 'false', label: t('auction:market.buyNowWithout') },
            ]}
            onChange={(event) => {
              changeFilters({ hasBuyNow: event.target.value as MarketplaceFilters['hasBuyNow'] })
            }}
          />
          <SelectField
            label={t('auction:market.sortLabel')}
            hint={t('auction:market.sortPriceHint')}
            value={filters.sort}
            placeholder={t('auction:market.sortDefault')}
            options={SORT_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            onChange={(event) => {
              changeFilters({ sort: event.target.value as MarketplaceFilters['sort'] })
            }}
          />
          <SelectField
            label={t('auction:market.itemsPerPage')}
            value={String(pageSize)}
            options={AUCTION_PAGE_SIZE_OPTIONS.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            onChange={(event) => {
              // Otro tamano cambia cuantas paginas hay: se vuelve a la primera.
              setPageSize(Number(event.target.value))
              setPage(1)
            }}
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="secondary"
            onClick={() => {
              setInputValue('')
              changeFilters(DEFAULT_FILTERS)
            }}
          >
            {t('auction:market.clearFilters')}
          </Button>
        )}
      </div>
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={query.data?.items.length === 0}
        emptyMessage={t(hasActiveFilters ? 'auction:market.emptyFiltered' : 'auction:market.empty')}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(query.data?.items ?? []).map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
        {query.data !== undefined && query.data.total > pageSize && (
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
