import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/ui/Avatar'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { fetchCanonicalProduct } from '@/features/catalog/api'
import { formatMoney } from '@/lib/format'
import { HttpError } from '@/lib/http'
import { countLabel, formatInteger } from '@/shared/i18n/format'
import { i18n } from '@/shared/i18n/i18n'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { describeFollowError } from './api'
import { AuctionBidHistory } from './AuctionBidHistory'
import { AuctionCountdown } from './AuctionCountdown'
import { AuctionBidPanel } from './bidding/AuctionBidPanel'
import { AutoBidPanel } from './auto-bid/AutoBidPanel'
import {
  describeBuyNowFailure,
  describeAuctionCancellationFailure,
  cancelAuction,
  executeBuyNow,
  fetchAuctionDetail,
  fetchBuyerCredits,
  isRetryableBuyNowError,
  isRetryableAuctionCancellationError,
  type AuctionDetail,
  type AuctionCancellationConfirmation,
  type BuyNowConfirmation,
} from './detail-api'
import { newIdempotencyKey } from './idempotencyKey'
import { ImmediatePurchaseCard } from './immediate-purchase/ImmediatePurchaseCard'
import { AuctionCancellationCard } from './cancellation/AuctionCancellationCard'
import { useWatchlist } from './useWatchlist'

const MAX_AUTOMATIC_RETRIES = 3

/** Mismo criterio que `priceOf`/`buyNowPriceOf` de `AuctionMarketplace.tsx`: CREDITS nunca se trata como moneda ISO. */
const minimumPriceLabel = (auction: AuctionDetail): string =>
  auction.priceKind === 'REAL_MONEY'
    ? formatMoney(auction.minimumBidAmountMinor, auction.currency)
    : countLabel(i18n.t, 'common:count.credits', auction.minimumBidCredits)

/** `null` si el publicador no configuro compra inmediata. */
const buyNowPriceLabel = (auction: AuctionDetail): string | null =>
  auction.priceKind === 'REAL_MONEY'
    ? auction.buyNowAmountMinor === null
      ? null
      : formatMoney(auction.buyNowAmountMinor, auction.currency)
    : auction.buyNowCredits === null
      ? null
      : countLabel(i18n.t, 'common:count.credits', auction.buyNowCredits)

const linkClass =
  'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors border border-border text-ink hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

type ShareFeedback = 'copied' | 'error' | null

/** El enlace compartido siempre apunta al detalle limpio, sin estado temporal de la UI. */
const buildAuctionShareUrl = (auctionId: string): string =>
  new URL(`/auction/${encodeURIComponent(auctionId)}`, window.location.origin).toString()

const isShareAbort = (cause: unknown): boolean =>
  typeof cause === 'object' && cause !== null && 'name' in cause && cause.name === 'AbortError'

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
 * - HU-88 (detalle completo): vendedor, modalidad de pago e historial
 *   publico de pujas, con la informacion que Auction ya expone (PR #78/#79).
 *   Las subastas oficiales (GAME_MASTER/REAL_MONEY) no admiten pujas ni
 *   compra inmediata en Web todavia -el backend no expone ese flujo para
 *   ellas-, asi que esos paneles se ocultan y solo se muestra su precio.
 */
export const AuctionDetailPage = (): React.JSX.Element => {
  const { auctionId = '' } = useParams()
  // `?buyNow=1` llega desde "Comprar ahora" del marketplace: abre el paso de confirmacion.
  const [searchParams] = useSearchParams()
  const buyNowIntent = searchParams.get('buyNow') === '1'
  const navigate = useNavigate()
  const { t } = useTranslation()
  const subject = useSession((state) => state.subject)
  const queryClient = useQueryClient()
  const [confirmed, setConfirmed] = useState(false)
  const [transaction, setTransaction] = useState<BuyNowConfirmation | null>(null)
  const [cancellation, setCancellation] = useState<AuctionCancellationConfirmation | null>(null)
  const [followError, setFollowError] = useState<string | null>(null)
  const [shareFeedback, setShareFeedback] = useState<ShareFeedback>(null)

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

  const shareAuction = async (): Promise<void> => {
    setShareFeedback(null)
    const url = buildAuctionShareUrl(auctionId)
    const payload = {
      title: t('auction:detail.shareTitle'),
      text: t('auction:detail.shareText'),
      url,
    }

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(payload)
      } catch (cause: unknown) {
        // Cerrar el dialogo nativo es una cancelacion normal, no un error para la persona usuaria.
        if (!isShareAbort(cause)) {
          setShareFeedback('error')
        }
      }
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setShareFeedback('copied')
    } catch {
      setShareFeedback('error')
    }
  }

  const auctionQuery = useQuery({
    queryKey: queryKeys.auction.detail(auctionId),
    queryFn: ({ signal }) => fetchAuctionDetail(auctionId, signal),
    enabled: auctionId !== '',
  })

  const auction = auctionQuery.data
  // HU-88: 404/403 del detalle tienen su propia tarjeta -nunca el error
  // generico de `QueryState`- y nunca se confunden entre si ni con la
  // ausencia de perfil de vendedor (eso degrada dentro de un detalle 200).
  const notFound = auctionQuery.error instanceof HttpError && auctionQuery.error.isNotFound
  const forbidden = auctionQuery.error instanceof HttpError && auctionQuery.error.isForbidden

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

  /**
   * La variable de mutacion ES la Idempotency-Key: React Query la conserva
   * en todos los retries de este click; cada nueva confirmacion genera otra.
   */
  const cancellationMutation = useMutation({
    mutationFn: (idempotencyKey: string) => cancelAuction(auctionId, idempotencyKey),
    retry: (failureCount, error) =>
      isRetryableAuctionCancellationError(error) && failureCount < MAX_AUTOMATIC_RETRIES,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    onSuccess: (confirmation) => {
      setCancellation(confirmation)
      void queryClient.invalidateQueries({ queryKey: queryKeys.auction.detail(auctionId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.auctions.active })
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auction.detail(auctionId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.auctions.active })
    },
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
          { label: t('auction:crumbs.home'), to: '/ecommerce' },
          { label: t('auction:crumbs.auction'), to: '/auction' },
          { label: product?.name ?? t('auction:crumbs.detail') },
        ]}
      />

      <div className="mt-6 space-y-6">
        {notFound ? (
          <Card
            title={t('auction:detail.notFound.title')}
            description={t('auction:detail.notFound.description')}
          >
            <Link to="/auction" className={linkClass}>
              {t('auction:detail.notFound.backToMarketplace')}
            </Link>
          </Card>
        ) : forbidden ? (
          <Card
            title={t('auction:detail.forbidden.title')}
            description={t('auction:detail.forbidden.description')}
          >
            {null}
          </Card>
        ) : (
          <QueryState isLoading={auctionQuery.isPending} error={auctionQuery.error}>
            {auction !== undefined && (
              <>
                {/* Visible para cualquier rol, vendedor incluido: no depende del panel de puja. */}
                <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-baseline gap-2">
                    <dt className="text-muted">{t('auction:detail.timeRemaining')}</dt>
                    <dd className="font-semibold text-ink">
                      {/* El cierre lo decide Auction: fuera de ACTIVE no hay cuenta que mostrar. */}
                      {auction.status === 'ACTIVE' ? (
                        <AuctionCountdown closesAt={auction.closesAt} />
                      ) : (
                        t('auction:countdown.ended')
                      )}
                    </dd>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <dt className="text-muted">{t('auction:detail.bids')}</dt>
                    <dd className="font-semibold text-ink">{formatInteger(auction.bidCount)}</dd>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <dt className="text-muted">{t('auction:market.minimumPrice')}</dt>
                    <dd className="font-semibold text-ink">{minimumPriceLabel(auction)}</dd>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <dt className="text-muted">{t('auction:market.buyNow')}</dt>
                    <dd className="font-semibold text-ink">
                      {buyNowPriceLabel(auction) ?? t('auction:market.buyNowNone')}
                    </dd>
                  </div>
                </dl>

                {/* HU-88: vendedor publico, nunca el sellerId crudo. */}
                <section aria-labelledby="auction-seller-title" className="space-y-1">
                  <h2 id="auction-seller-title" className="text-sm font-medium text-muted">
                    {t('auction:detail.seller.title')}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {auction.sellerDisplayName !== null && (
                      <Avatar
                        avatarUrl={auction.sellerAvatarUrl}
                        alt={auction.sellerDisplayName}
                        initials={auction.sellerDisplayName.charAt(0).toUpperCase()}
                        size="md"
                      />
                    )}
                    <span className="font-semibold text-ink">
                      {auction.sellerDisplayName ?? t('auction:detail.seller.unavailable')}
                    </span>
                    {auction.publisherType === 'GAME_MASTER' && (
                      <span
                        aria-label={t('auction:market.officialLabel', {
                          mark: t(
                            auction.officialMark === 'PREMIUM'
                              ? 'auction:marks.PREMIUM'
                              : 'auction:marks.OFFICIAL',
                          ),
                        })}
                        className="rounded-full border border-brand/40 bg-brand/10 px-2 py-1 text-xs font-semibold text-brand"
                      >
                        {t(
                          auction.officialMark === 'PREMIUM'
                            ? 'auction:marks.PREMIUM'
                            : 'auction:marks.OFFICIAL',
                        )}
                      </span>
                    )}
                  </div>
                </section>

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="secondary" onClick={() => void shareAuction()}>
                    {t('auction:detail.share')}
                  </Button>
                  {auction.status === 'ACTIVE' && !isSeller && (
                    <>
                      <Button
                        variant={isFollowing ? 'secondary' : 'primary'}
                        loading={isSavingFollow}
                        onClick={() => {
                          void toggleFollow()
                        }}
                      >
                        {isFollowing
                          ? t('auction:watchlist.unfollow')
                          : t('auction:watchlist.followThis')}
                      </Button>
                      {followError !== null && (
                        <p role="alert" className="text-sm text-danger">
                          {followError}
                        </p>
                      )}
                    </>
                  )}
                </div>
                {shareFeedback !== null && (
                  <p
                    role={shareFeedback === 'error' ? 'alert' : 'status'}
                    className={
                      shareFeedback === 'error' ? 'text-sm text-danger' : 'text-sm text-muted'
                    }
                  >
                    {t(
                      shareFeedback === 'copied'
                        ? 'auction:detail.shareCopied'
                        : 'auction:detail.shareError',
                    )}
                  </p>
                )}
                {
                  /*
                   * `transaction` manda sobre `auction.status`: al completar la
                   * compra se invalida la consulta y el servidor ya reporta la
                   * subasta como cerrada (`SOLD`), pero la pantalla debe seguir
                   * mostrando la confirmacion, no el aviso generico de "ya no
                   * esta activa".
                   */
                  transaction === null && cancellation === null && auction.status !== 'ACTIVE' ? (
                    <Card
                      title={t('auction:detail.notActive')}
                      description={t('auction:detail.currentStatus', { status: auction.status })}
                    >
                      {null}
                    </Card>
                  ) : transaction === null && isSeller ? (
                    auction.publisherType === 'PLAYER' ? (
                      <Card
                        title={t('auction:detail.ownTitle')}
                        description={t('auction:detail.ownDescription')}
                      >
                        <AuctionCancellationCard
                          publicationFeeCredits={auction.publicationFeeCredits}
                          bidCount={auction.bidCount}
                          loading={cancellationMutation.isPending}
                          confirmation={cancellation}
                          error={
                            cancellationMutation.isError
                              ? describeAuctionCancellationFailure(cancellationMutation.error)
                              : null
                          }
                          onCancel={() => {
                            cancellationMutation.mutate(newIdempotencyKey())
                          }}
                        />
                      </Card>
                    ) : (
                      <Card
                        title={t('auction:detail.ownTitle')}
                        description={t('auction:detail.ownDescription')}
                      >
                        {null}
                      </Card>
                    )
                  ) : auction.publisherType ===
                    'GAME_MASTER' ? null /* HU-88: compra inmediata en dinero real aun no tiene flujo en Web. */ : (
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
                          focusConfirmation={buyNowIntent}
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

                {auction.status === 'ACTIVE' &&
                  !isSeller &&
                  auction.publisherType === 'PLAYER' &&
                  product !== undefined && (
                    <AuctionBidPanel
                      auction={auction}
                      product={{ name: product.name, description: product.description }}
                      subject={subject}
                      {...(availableCredits === undefined ? {} : { availableCredits })}
                    />
                  )}

                {auction.status === 'ACTIVE' && !isSeller && auction.publisherType === 'PLAYER' && (
                  <AutoBidPanel
                    auction={auction}
                    subject={subject}
                    {...(availableCredits === undefined ? {} : { availableCredits })}
                  />
                )}

                <AuctionBidHistory auctionId={auction.id} />
              </>
            )}
          </QueryState>
        )}
      </div>
    </div>
  )
}
