import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { fetchCanonicalProduct } from '@/features/catalog/api'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { fetchAuctionDetail, fetchBuyerCredits } from './detail-api'
import { AuctionBidPanel } from './bidding/AuctionBidPanel'
import { ImmediatePurchaseCard } from './immediate-purchase/ImmediatePurchaseCard'

/**
 * Vista de detalle de una subasta para quien la va a COMPRAR (HU-64.1,
 * integrada aqui porque "Integrado en pantalla de detalle de subasta" es una
 * de sus propias condiciones de finalizacion). Distinta de `AuctionPage.tsx`
 * -el formulario del VENDEDOR para publicar, HU-62-, que no lista ni muestra
 * subastas ajenas.
 *
 * Es el punto de union para dos flujos del comprador que hoy no tienen
 * ninguna pantalla propia en este repositorio:
 * - HU-64 (compra inmediata): el `ImmediatePurchaseCard` de abajo. Muestra
 *   datos REALES (`GET /v1/auctions/:auctionId`, ya construido y probado por
 *   HU-63.6), pero el boton "Comprar ahora" NO llama todavia al backend real
 *   -eso es HU-64.6, deliberadamente fuera del alcance de HU-64.1-.
 * - HU-63 (pujar): el `AuctionBidPanel` de abajo presenta el registro de pujas
 *   y sus respuestas del contrato, integrado junto a la compra inmediata.
 */
export const AuctionDetailPage = (): React.JSX.Element => {
  const { auctionId = '' } = useParams()
  const subject = useSession((state) => state.subject)
  const [confirmed, setConfirmed] = useState(false)
  const [showIntegrationNote, setShowIntegrationNote] = useState(false)

  const auctionQuery = useQuery({
    queryKey: queryKeys.auction.detail(auctionId),
    queryFn: ({ signal }) => fetchAuctionDetail(auctionId, signal),
    enabled: auctionId !== '',
  })

  const auction = auctionQuery.data

  const productQuery = useQuery({
    queryKey: queryKeys.catalog.detail(auction?.productId ?? ''),
    queryFn: ({ signal }) => fetchCanonicalProduct(auction?.productId ?? '', signal),
    enabled: auction !== undefined,
  })

  const product = productQuery.data
  const isSeller = auction !== undefined && subject !== null && subject === auction.sellerId

  const walletQuery = useQuery({
    queryKey: queryKeys.wallet.me,
    queryFn: ({ signal }) => fetchBuyerCredits(signal),
    enabled: subject !== null && auction !== undefined && !isSeller,
  })

  const availableCredits = walletQuery.data?.available ?? walletQuery.data?.balance
  const buyNowCredits = auction?.buyNowCredits ?? null
  const purchaseStage =
    buyNowCredits === null
      ? 'unavailable'
      : availableCredits !== undefined && availableCredits < buyNowCredits
        ? 'insufficient-credits'
        : 'available'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Breadcrumb
        items={[
          { label: 'Inicio', to: '/ecommerce' },
          { label: 'Subasta', to: '/auction' },
          { label: product?.name ?? 'Detalle' },
        ]}
      />

      <div className="mt-6 space-y-6">
        <QueryState isLoading={auctionQuery.isPending} error={auctionQuery.error}>
          {auction !== undefined && (
            <>
              {auction.status !== 'ACTIVE' ? (
                <Card
                  title="Esta subasta ya no esta activa"
                  description={`Estado actual: ${auction.status}.`}
                >
                  {null}
                </Card>
              ) : isSeller ? (
                <Card
                  title="Es tu propia subasta"
                  description="No puedes ejecutar la compra inmediata de un producto que tu mismo publicaste."
                >
                  {null}
                </Card>
              ) : (
                <QueryState isLoading={productQuery.isPending} error={productQuery.error}>
                  {product !== undefined && (
                    <ImmediatePurchaseCard
                      product={{
                        name: product.name,
                        // El catalogo real no trae un glifo corto por producto
                        // (a diferencia del mock de Figma): se usa uno generico.
                        icon: '🎁',
                        summary: product.description,
                      }}
                      stage={purchaseStage}
                      {...(buyNowCredits !== null ? { priceCredits: buyNowCredits } : {})}
                      {...(availableCredits !== undefined ? { availableCredits } : {})}
                      confirmed={confirmed}
                      onConfirmedChange={setConfirmed}
                      onBuy={() => {
                        setShowIntegrationNote(true)
                      }}
                      onGoToBid={() => {
                        setShowIntegrationNote(true)
                      }}
                    />
                  )}
                </QueryState>
              )}

              {showIntegrationNote && (
                <p role="status" className="text-sm text-muted">
                  La compra inmediata todavia no esta conectada al backend en esta pantalla
                  (HU-64.6, pendiente).
                </p>
              )}

              {auction.status === 'ACTIVE' && product !== undefined && (
                <AuctionBidPanel
                  auction={auction}
                  product={{ name: product.name, description: product.description }}
                  subject={subject}
                  {...(availableCredits === undefined ? {} : { availableCredits })}
                />
              )}
            </>
          )}
        </QueryState>
      </div>
    </div>
  )
}
