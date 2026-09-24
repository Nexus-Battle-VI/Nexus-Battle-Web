import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BadgeDollarSign, Coins } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { formatMoney } from '@/lib/format'
import { queryKeys } from '@/shared/query-keys'
import { listActiveAuctions, type ActiveAuction } from './api'

const priceOf = (auction: ActiveAuction): string =>
  auction.priceKind === 'REAL_MONEY'
    ? formatMoney(auction.minimumBidAmountMinor, auction.currency)
    : `${String(auction.minimumBidCredits)} créditos`

const AuctionCard = ({ auction }: { readonly auction: ActiveAuction }): React.JSX.Element => {
  const official = auction.publisherType === 'GAME_MASTER'
  return (
    <article className="rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-ink">Producto {auction.productId}</h3>
        {official && (
          <span
            aria-label={`Publicación oficial: ${auction.officialMark === 'PREMIUM' ? 'Premium' : 'Oficial'}`}
            className="rounded-full border border-brand/40 bg-brand/10 px-2 py-1 text-xs font-semibold text-brand"
          >
            {auction.officialMark === 'PREMIUM' ? 'Premium' : 'Oficial'}
          </span>
        )}
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Precio mínimo</dt>
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
          <dt className="text-muted">Cierra</dt>
          <dd className="font-medium text-ink">
            {new Intl.DateTimeFormat('es-CO', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(auction.closesAt))}
          </dd>
        </div>
      </dl>
    </article>
  )
}

export const AuctionMarketplace = (): React.JSX.Element => {
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: queryKeys.auctions.activePage(page),
    queryFn: ({ signal }) => listActiveAuctions(page, signal),
  })
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 12))

  return (
    <section aria-labelledby="active-auctions-title" className="mt-8 space-y-4">
      <header>
        <h2 id="active-auctions-title" className="text-xl font-semibold text-ink">
          Subastas activas
        </h2>
        <p className="mt-1 text-sm text-muted">
          Las publicaciones oficiales aparecen primero según el orden definido por Auction.
        </p>
      </header>
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={query.data?.items.length === 0}
        emptyMessage="No hay subastas activas en este momento."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(query.data?.items ?? []).map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
        {query.data !== undefined && query.data.total > 12 && (
          <nav aria-label="Paginación de subastas" className="mt-4 flex items-center gap-3">
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => {
                setPage((current) => Math.max(1, current - 1))
              }}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((current) => current + 1)
              }}
            >
              Siguiente
            </Button>
          </nav>
        )}
      </QueryState>
    </section>
  )
}
