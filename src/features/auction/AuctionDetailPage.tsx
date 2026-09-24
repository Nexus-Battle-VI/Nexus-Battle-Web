import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { fetchCanonicalProduct } from '@/features/catalog/api'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { describeFollowError } from './api'
import { AuctionBidPanel } from './bidding/AuctionBidPanel'
import { AutoBidPanel } from './auto-bid/AutoBidPanel'
import {
  describeBuyNowFailure,
  executeBuyNow,
  fetchAuctionDetail,
  fetchBuyerCredits,
  isRetryableBuyNowError,
  type BuyNowConfirmation,
} from './detail-api'
import { newIdempotencyKey } from './idempotencyKey'
import { ImmediatePurchaseCard } from './immediate-purchase/ImmediatePurchaseCard'
import { useWatchlist } from './useWatchlist'

const MAX_AUTOMATIC_RETRIES = 3

/**
 * Vista de detalle de una subasta para quien la va a COMPRAR (HU-64.1,
 * integrada aqui porque "Integrado en pantalla de detalle de subasta" es una
 * de sus propias condiciones de finalizacion). Distinta de `AuctionPage.tsx`
 * -el formulario del VENDEDOR para publicar, HU-62-, que no lista ni muestra
 * subastas ajenas.
 *
 * Es el punto de union para varios flujos del comprador que hoy no tienen
 * ninguna pantalla propia en este repositorio:
 * - HU-64 (compra inmediata): el `ImmediatePurchaseCard` de abajo, con datos
 *   REALES y el boton "Comprar ahora" conectado al endpoint real (HU-64.6,
 *   `POST /v1/auctions/:auctionId/buy-now`, HU-64.4).
 * - HU-63 (pujar): el `AuctionBidPanel` de abajo presenta el registro de pujas
 *   y sus respuestas del contrato real, integrado junto a la compra inmediata.
 * - HU-67 (puja automatica): el `AutoBidPanel` de abajo llama al mismo
 *   contrato real que ya prueba Auction (`POST /v1/auctions/:auctionId/auto-bid`,
 *   HU-67.5), junto al registro de pujas manual.
 */
export const AuctionDetailPage = (): React.JSX.Element => {
  const { auctionId = '' } = useParams()
  const navigate = useNavigate()
  const subject = useSession((state) => state.subject)
  const queryClient = useQueryClient()
  const [confirmed, setConfirmed] = useState(false)
  const [transaction, setTransaction] = useState<BuyNowConfirmation | null>(null)
  const [followError, setFollowError] = useState<string | null>(null)

  const { items: watchlistItems, follow, unfollow, isSaving: isSavingFollow } = useWatchlist()
  const isFollowing = watchlistItems.some((item) => item.auction.id === auctionId)

  const toggleFollow = async (): Promise<void> => {
    setFollowError(null)
    try {
      if (isFollowing) {
        unfollow(auctionId)
      } else {
        await follow(auctionId)
      }
    } catch (cause: unknown) {
      setFollowError(describeFollowError(cause))
    }
  }

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

  /**
   * Resincroniza con el servidor tras cualquier resultado que pueda haber
   * cambiado su estado -exito, o un rechazo por conflicto (otro comprador se
   * adelanto)-, en vez de confiar en lo que esta pantalla asumia antes de
   * llamar al backend.
   */
  const resyncWithServer = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.auction.detail(auctionId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.wallet.me })
  }

  const buyNowMutation = useMutation({
    mutationFn: (idempotencyKey: string) => executeBuyNow(auctionId, idempotencyKey),
    retry: (failureCount, error) =>
      isRetryableBuyNowError(error) && failureCount < MAX_AUTOMATIC_RETRIES,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    onSuccess: (confirmation) => {
      setTransaction(confirmation)
      resyncWithServer()
    },
    onError: resyncWithServer,
  })

  const purchaseStage =
    transaction !== null
      ? 'success'
      : buyNowMutation.isPending
        ? 'processing'
        : buyNowCredits === null
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
              {auction.status === 'ACTIVE' && !isSeller && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant={isFollowing ? 'secondary' : 'primary'}
                    loading={isSavingFollow}
                    onClick={() => {
                      void toggleFollow()
                    }}
                  >
                    {isFollowing ? 'Dejar de seguir' : 'Seguir esta subasta'}
                  </Button>
                  {followError !== null && (
                    <p role="alert" className="text-sm text-danger">
                      {followError}
                    </p>
                  )}
                </div>
              )}
              {
                /*
                 * `transaction` manda sobre `auction.status`: al completar la
                 * compra se invalida la consulta y el servidor ya reporta la
                 * subasta como cerrada (`SOLD`), pero la pantalla debe seguir
                 * mostrando la confirmacion, no el aviso generico de "ya no
                 * esta activa".
                 */
                transaction === null && auction.status !== 'ACTIVE' ? (
                  <Card
                    title="Esta subasta ya no esta activa"
                    description={`Estado actual: ${auction.status}.`}
                  >
                    {null}
                  </Card>
                ) : transaction === null && isSeller ? (
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
                        {...(transaction !== null
                          ? {
                              transaction: {
                                id: transaction.transactionId,
                                debitedCredits: transaction.debitedCredits,
                                remainingCredits: transaction.remainingCredits,
                              },
                            }
                          : {})}
                        confirmed={confirmed}
                        onConfirmedChange={setConfirmed}
                        onBuy={() => {
                          buyNowMutation.mutate(newIdempotencyKey())
                        }}
                        onGoToBid={() => {
                          /* El panel de pujar (`AuctionBidPanel`, HU-63.8) ya vive en esta
                           * misma pantalla, justo debajo: no hace falta navegar a ningun lado. */
                        }}
                        onViewPending={() => {
                          void navigate('/auction/pending-claims')
                        }}
                      />
                    )}
                  </QueryState>
                )
              }

              {buyNowMutation.isError && (
                <p role="alert" className="text-sm text-danger">
                  {describeBuyNowFailure(buyNowMutation.error)}
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

              {auction.status === 'ACTIVE' && (
                <AutoBidPanel
                  auction={auction}
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
