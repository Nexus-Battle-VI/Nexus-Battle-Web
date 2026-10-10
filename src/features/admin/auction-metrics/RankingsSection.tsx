import { useTranslation } from 'react-i18next'

import { Package, Trophy } from '@/components/ui/icons'

import { formatCount, initialOf } from './metricsFormat'
import { RankBadge, SectionHeading, TableWrap, Td, Th, Tr } from './parts'
import type { ProductRankings, RankedProductInfo } from './types'

/** Un identificador largo se recorta con elipsis: es solo una pista cuando falta el nombre. */
const shortId = (productId: string): string =>
  productId.length > 24 ? `${productId.slice(0, 24)}…` : productId

/**
 * Celda de producto. El NOMBRE es enriquecimiento de Catalog: si falta (`product: null`),
 * se muestra el identificador en su lugar -el conteo sigue siendo correcto- y no se
 * inventa un nombre.
 */
const ProductCell = ({
  productId,
  product,
}: {
  readonly productId: string
  readonly product: RankedProductInfo | null
}): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden="true"
        className="grid h-9 w-9 flex-none place-items-center am-thumb rounded-md text-[0.8125rem] font-semibold"
      >
        {product === null ? '?' : initialOf(product.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">
          {product === null ? t('auctionMetrics:rankings.unnamed') : product.name}
        </p>
        {product === null ? (
          <p className="truncate font-mono text-[0.8125rem] text-muted">{shortId(productId)}</p>
        ) : (
          <p className="truncate text-xs text-muted">
            {product.sku} · {product.type}
          </p>
        )}
      </div>
    </div>
  )
}

interface RankingRow {
  readonly rank: number
  readonly productId: string
  readonly product: RankedProductInfo | null
  readonly cells: readonly number[]
}

const RankingCard = ({
  icon: Icon,
  title,
  description,
  columns,
  rows,
}: {
  readonly icon: typeof Package
  readonly title: string
  readonly description: string
  readonly columns: readonly string[]
  readonly rows: readonly RankingRow[]
}): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <section className="am-panel min-w-0 p-5">
      <div className="flex items-center gap-2">
        <Icon aria-hidden className="am-heading-icon h-4 w-4" />
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
      </div>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{t('common:empty')}</p>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>{t('auctionMetrics:rankings.product')}</Th>
                {columns.map((column) => (
                  <Th key={column} numeric>
                    {column}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Tr key={row.productId}>
                  <Td>
                    <RankBadge rank={row.rank} />
                  </Td>
                  <Td>
                    <ProductCell productId={row.productId} product={row.product} />
                  </Td>
                  {row.cells.map((cell, index) => (
                    <Td key={columns[index]} numeric strong={index === 0}>
                      {formatCount(cell)}
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>
    </section>
  )
}

/** CA-02: productos mas subastados y mas vendidos (contrato §4.2). */
export const RankingsSection = ({
  data,
}: {
  readonly data: ProductRankings
}): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="auction-metrics-rankings" className="grid min-w-0 gap-4">
      <SectionHeading icon={Trophy} id="auction-metrics-rankings">
        {t('auctionMetrics:rankings.title')}
      </SectionHeading>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
        <RankingCard
          icon={Package}
          title={t('auctionMetrics:rankings.mostAuctioned')}
          description={t('auctionMetrics:rankings.mostAuctionedDescription')}
          columns={[
            t('auctionMetrics:rankings.total'),
            t('auctionMetrics:rankings.player'),
            t('auctionMetrics:rankings.official'),
          ]}
          rows={data.mostAuctioned.map((item) => ({
            rank: item.rank,
            productId: item.productId,
            product: item.product,
            cells: [
              item.auctions.total,
              item.auctions.playerCredits,
              item.auctions.officialRealMoney,
            ],
          }))}
        />
        <RankingCard
          icon={Trophy}
          title={t('auctionMetrics:rankings.mostSold')}
          description={t('auctionMetrics:rankings.mostSoldDescription')}
          columns={[
            t('auctionMetrics:rankings.total'),
            t('auctionMetrics:rankings.auction'),
            t('auctionMetrics:rankings.buyNow'),
          ]}
          rows={data.mostSold.map((item) => ({
            rank: item.rank,
            productId: item.productId,
            product: item.product,
            cells: [item.sales.total, item.sales.byAuctionClose, item.sales.byBuyNow],
          }))}
        />
      </div>

      {data.enrichment.status !== 'COMPLETE' && (
        <p
          role="status"
          className="rounded-lg border border-warning bg-warning/10 p-3 text-sm text-ink"
        >
          {t('auctionMetrics:rankings.enrichmentNotice')}
        </p>
      )}
    </section>
  )
}
