import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { HttpError } from '@/lib/http'
import { queryKeys } from '@/shared/query-keys'
import { ECOMMERCE_PATH } from '@/routes/routes'
import { PendingClaimCard, type PendingClaimDisplayStatus } from './PendingClaimCard'
import {
  claimBatch,
  claimItem,
  fetchPendingClaims,
  type ClaimBatchItemStatus,
  type ClaimBatchResult,
  type PendingClaim,
} from './api'
import { i18n } from '@/shared/i18n/i18n'
import { currentLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'
import { countLabel } from '@/shared/i18n/format'
import { localizedMessages } from '@/shared/i18n/messages'

const AUCTION_PATH = '/auction'

type BatchStep = 'idle' | 'confirming'

/** Motivo de fallo por item, en el idioma activo (se traduce al leerse). */
const BATCH_FAILURE_LABEL: Readonly<
  Record<Exclude<ClaimBatchItemStatus, 'CLAIMED' | 'ALREADY_CLAIMED'>, string>
> = localizedMessages({
  NOT_OWNED: 'auction:claims.batchLabels.NOT_OWNED',
  NOT_FOUND: 'auction:claims.batchLabels.NOT_FOUND',
  EXPIRED: 'auction:claims.batchLabels.EXPIRED',
  INVENTORY_UNAVAILABLE: 'auction:claims.batchLabels.INVENTORY_UNAVAILABLE',
  ERROR: 'auction:claims.batchLabels.ERROR',
})

const isBatchSuccess = (status: ClaimBatchItemStatus): boolean =>
  status === 'CLAIMED' || status === 'ALREADY_CLAIMED'

const describeClaimError = (error: unknown): string => {
  if (error instanceof HttpError) {
    if (error.isForbidden) return i18n.t('auction:claims.errors.forbidden')
    if (error.isNotFound) return i18n.t('auction:claims.errors.notFound')
    if (error.status === 409) return i18n.t('auction:claims.errors.conflict')
    if (error.status === 422) return i18n.t('auction:claims.errors.expired')

    return describeFailure(error, i18n.t, currentLanguage())
  }

  return i18n.t('auction:claims.errors.failed')
}

/**
 * Productos ganados pendientes de reclamo (HU-69.7).
 *
 * Consume el contrato REAL de Auction (HU-69.1 a HU-69.4), verificado en
 * `pending-claims/api.ts`: el issue de esta Task nombraba Commerce, plantilla
 * generica desactualizada.
 *
 * El reclamo en bloque (`POST .../claim-batch`) SIEMPRE responde 200: un item
 * en NOT_OWNED/EXPIRED/INVENTORY_UNAVAILABLE/ERROR no revierte ni oculta los
 * demas. Por eso el resultado se recorre item por item (`summary` abajo) en
 * vez de tratarse como exito o fallo global.
 */
export const PendingClaimsPage = (): React.JSX.Element => {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [batchStep, setBatchStep] = useState<BatchStep>('idle')
  const [expiredAuctionIds, setExpiredAuctionIds] = useState<ReadonlySet<string>>(new Set())
  const [batchResult, setBatchResult] = useState<ClaimBatchResult | null>(null)

  const claimsQuery = useQuery({
    queryKey: queryKeys.auction.pendingClaims,
    queryFn: ({ signal }) => fetchPendingClaims(signal),
  })

  const claims = claimsQuery.data ?? []
  const pendingClaims = claims.filter((claim) => claim.claimStatus === 'PENDING')

  const invalidatePendingClaims = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.auction.pendingClaims })
  }

  const claimMutation = useMutation({
    mutationFn: claimItem,
    onSuccess: () => {
      // Limpia el resumen de un lote anterior: si ya se reclamo individualmente,
      // el banner de "Reclamaste X de Y..." de una tanda previa queda
      // desactualizado y confunde mas de lo que ayuda.
      setBatchResult(null)
      invalidatePendingClaims()
    },
    onError: (error, auctionId) => {
      if (error instanceof HttpError && error.status === 422) {
        setExpiredAuctionIds((previous) => new Set(previous).add(auctionId))
      }
    },
  })

  const batchMutation = useMutation({
    mutationFn: claimBatch,
    onSuccess: (result) => {
      setBatchResult(result)
      setExpiredAuctionIds((previous) => {
        const next = new Set(previous)

        for (const item of result.results) {
          if (item.status === 'EXPIRED') next.add(item.auctionId)
        }

        return next
      })
      setSelectedIds(new Set())
      setBatchStep('idle')
      invalidatePendingClaims()
    },
  })

  const toggleSelected = (auctionId: string): void => {
    setSelectedIds((previous) => {
      const next = new Set(previous)

      if (next.has(auctionId)) next.delete(auctionId)
      else next.add(auctionId)

      return next
    })
  }

  const allSelected =
    pendingClaims.length > 0 && pendingClaims.every((claim) => selectedIds.has(claim.auctionId))

  const toggleSelectAll = (): void => {
    setSelectedIds(allSelected ? new Set() : new Set(pendingClaims.map((claim) => claim.auctionId)))
  }

  const openBatchConfirmation = (): void => {
    setBatchResult(null)
    setBatchStep('confirming')
  }

  const handleConfirmBatch = (): void => {
    if (batchMutation.isPending) return

    batchMutation.mutate({ auctionIds: [...selectedIds] })
  }

  const displayStatusFor = (claim: PendingClaim): PendingClaimDisplayStatus =>
    expiredAuctionIds.has(claim.auctionId) ? 'EXPIRED' : claim.claimStatus

  const summary = useMemo(() => {
    if (batchResult === null) return null

    const claimed = batchResult.results.filter((item) => isBatchSuccess(item.status))
    const failed = batchResult.results.filter((item) => !isBatchSuccess(item.status))

    return { claimed, failed, total: batchResult.results.length }
  }, [batchResult])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <Breadcrumb
        items={[
          { label: t('auction:crumbs.home'), to: ECOMMERCE_PATH },
          { label: t('auction:claims.crumbAuctions'), to: AUCTION_PATH },
          { label: t('auction:claims.title') },
        ]}
      />

      <div>
        <h1 className="text-xl font-semibold text-ink">{t('auction:claims.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('auction:claims.intro')}</p>
      </div>

      {claimMutation.isError && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {describeClaimError(claimMutation.error)}
        </p>
      )}

      {batchMutation.isError && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {t('auction:claims.batchFailed')}
        </p>
      )}

      {summary !== null && (
        <div
          role={summary.failed.length === 0 ? 'status' : 'alert'}
          className={clsx(
            'space-y-1 rounded-lg border p-3 text-sm text-ink',
            summary.failed.length === 0
              ? 'border-success bg-success/10'
              : 'border-warning bg-warning/10',
          )}
        >
          <p className="font-medium">
            {summary.failed.length === 0
              ? countLabel(t, 'auction:claims.claimedAll', summary.claimed.length)
              : t('auction:claims.claimedSome', {
                  claimed: String(summary.claimed.length),
                  total: String(summary.total),
                })}
          </p>
          {summary.failed.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted">
              {summary.failed.map((item) => (
                <li key={item.auctionId}>
                  {t('auction:claims.failedItem', {
                    id: item.auctionId,
                    reason:
                      item.status === 'CLAIMED' || item.status === 'ALREADY_CLAIMED'
                        ? item.status
                        : BATCH_FAILURE_LABEL[item.status],
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <QueryState
        isLoading={claimsQuery.isPending}
        error={claimsQuery.error}
        isEmpty={claims.length === 0}
        emptyMessage={t('auction:claims.empty')}
      >
        {pendingClaims.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="size-4 accent-[var(--color-brand)]"
              />
              {t('auction:claims.selectAll')}
            </label>
            <span className="text-xs text-muted">
              {t('auction:claims.selectedCount', {
                selected: String(selectedIds.size),
                total: String(pendingClaims.length),
              })}
            </span>
            <Button
              variant="primary"
              className="ml-auto"
              disabled={selectedIds.size === 0}
              onClick={openBatchConfirmation}
            >
              {t('auction:claims.collectAll')}
            </Button>
          </div>
        )}

        {batchStep === 'confirming' && (
          <div
            role="group"
            aria-labelledby="pending-claims-batch-confirm-title"
            className="mb-4 space-y-3 rounded-lg border border-brand bg-brand/5 p-4"
          >
            <p id="pending-claims-batch-confirm-title" className="text-sm font-medium text-ink">
              {t('auction:claims.confirmBatch', { total: String(selectedIds.size) })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                loading={batchMutation.isPending}
                onClick={handleConfirmBatch}
              >
                {t('auction:claims.confirmYes')}
              </Button>
              <Button
                variant="secondary"
                disabled={batchMutation.isPending}
                onClick={() => {
                  setBatchStep('idle')
                }}
              >
                {t('common:cancel')}
              </Button>
            </div>
          </div>
        )}

        {batchMutation.isPending && (
          <p role="status" aria-live="polite" className="mb-4 text-sm text-muted">
            {t('auction:claims.claimingSelected')}
          </p>
        )}

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {claims.map((claim) => (
            <PendingClaimCard
              key={claim.auctionId}
              claim={claim}
              displayStatus={displayStatusFor(claim)}
              selected={selectedIds.has(claim.auctionId)}
              claiming={claimMutation.isPending && claimMutation.variables === claim.auctionId}
              onToggleSelected={toggleSelected}
              onClaim={(auctionId) => {
                if (claimMutation.isPending) return

                claimMutation.mutate(auctionId)
              }}
            />
          ))}
        </ul>
      </QueryState>
    </div>
  )
}
