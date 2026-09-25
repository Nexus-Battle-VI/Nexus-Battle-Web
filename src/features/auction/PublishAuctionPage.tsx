import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock3, Coins, Gavel, PackageCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { TextField } from '@/components/ui/form/TextField'
import { useOwnedInventory } from '@/features/player-inventory/useOwnedInventory'
import { queryKeys } from '@/shared/query-keys'
import { describeAuctionError, publishAuction, type AuctionPublication } from './api'
import { validateAuctionForm, type AuctionFormValues } from './validation'
import { i18n } from '@/shared/i18n/i18n'
import { countLabel } from '@/shared/i18n/format'

const newOperationId = (): string => globalThis.crypto.randomUUID()

const remaining = (closesAt: string, now = Date.now()): string => {
  const milliseconds = Math.max(0, new Date(closesAt).getTime() - now)
  const totalMinutes = Math.floor(milliseconds / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours === 0 && minutes === 0
    ? i18n.t('auction:publish.remainingEnding')
    : i18n.t('auction:publish.remaining', { hours: String(hours), minutes: String(minutes) })
}

const ActiveAuctionResult = ({ auction }: { auction: AuctionPublication }): React.JSX.Element => {
  const [label, setLabel] = useState(() => remaining(auction.closesAt))
  const { t } = useTranslation()

  useEffect(() => {
    const update = (): void => {
      setLabel(remaining(auction.closesAt))
    }
    const timer = globalThis.setInterval(update, 60_000)
    return () => {
      globalThis.clearInterval(timer)
    }
  }, [auction.closesAt])

  return (
    <section
      aria-labelledby="auction-created"
      className="rounded-xl border border-success/40 bg-success/10 p-5"
    >
      <div className="flex items-center gap-3">
        <PackageCheck aria-hidden="true" className="size-6 text-success" />
        <div>
          <h2 id="auction-created" className="font-semibold text-ink">
            {t('auction:publish.activeTitle')}
          </h2>
          <p className="text-sm text-muted">{t('auction:publish.activeBody')}</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">{t('auction:publish.feeCharged')}</dt>
          <dd className="font-semibold text-ink">
            {countLabel(t, 'common:count.credits', auction.publicationFeeCredits)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t('auction:publish.minimumPrice')}</dt>
          <dd className="font-semibold text-ink">
            {countLabel(t, 'common:count.credits', auction.minimumBidCredits)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t('auction:publish.timeLeft')}</dt>
          <dd role="timer" className="font-semibold text-ink">
            {label}
          </dd>
        </div>
      </dl>
    </section>
  )
}

const INITIAL_VALUES: AuctionFormValues = {
  productId: '',
  durationHours: 24,
  minimumBidCredits: '',
  buyNowCredits: '',
  confirmed: false,
}

/** Formulario del vendedor para publicar un producto propio en subasta (HU-62.5). */
export const PublishAuctionPage = (): React.JSX.Element => {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const inventory = useOwnedInventory({ page: 1, term: '', type: null })
  const products = useMemo(
    () =>
      (inventory.data?.items ?? []).filter(
        (item) =>
          item.quantity > 0 && item.product !== null && item.product.lifecycleStatus === 'ACTIVE',
      ),
    [inventory.data],
  )
  const [values, setValues] = useState<AuctionFormValues>(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const [operationId, setOperationId] = useState(newOperationId)
  const [created, setCreated] = useState<AuctionPublication | null>(null)
  const errors = submitted ? validateAuctionForm(values) : {}
  const selected = products.find((item) => item.product?.productId === values.productId)
  const fee = values.durationHours === 24 ? 1 : 3

  const mutation = useMutation({
    mutationFn: () =>
      publishAuction(
        {
          productId: values.productId,
          durationHours: values.durationHours,
          minimumBidCredits: Number(values.minimumBidCredits),
          ...(values.buyNowCredits === '' ? {} : { buyNowCredits: Number(values.buyNowCredits) }),
        },
        operationId,
      ),
    onSuccess: async (auction) => {
      setCreated(auction)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.auctions.active }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'me', 'items'] }),
      ])
    },
  })

  const reset = (): void => {
    setValues(INITIAL_VALUES)
    setSubmitted(false)
    setCreated(null)
    setOperationId(newOperationId())
    mutation.reset()
  }

  return (
    <section
      aria-labelledby="auction-title"
      className="mx-auto flex w-full max-w-6xl flex-col gap-4"
    >
      <header className="rounded-xl border border-border bg-surface-raised p-5">
        <div className="flex items-center gap-3">
          <Gavel aria-hidden="true" className="size-6 text-brand" />
          <h1 id="auction-title" className="text-xl font-semibold text-ink">
            {t('auction:publish.title')}
          </h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted">{t('auction:publish.subtitle')}</p>
      </header>

      {created !== null && (
        <>
          <ActiveAuctionResult auction={created} />
          <Button className="self-start" variant="secondary" onClick={reset}>
            {t('auction:publish.another')}
          </Button>
        </>
      )}

      {created === null && (
        <form
          noValidate
          className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-start"
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(true)
            if (Object.keys(validateAuctionForm(values)).length === 0 && !mutation.isPending)
              mutation.mutate()
          }}
        >
          <div className="flex flex-col gap-4">
            <fieldset className="rounded-xl border border-border bg-surface-raised p-5">
              <legend className="px-1 font-semibold text-ink">{t('auction:publish.step1')}</legend>
              <QueryState
                isLoading={inventory.isLoading}
                error={inventory.error}
                isEmpty={inventory.data !== undefined && products.length === 0}
                emptyMessage={t('auction:publish.noProducts')}
              >
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {products.map((item) => {
                    const product = item.product
                    if (product === null) return null
                    return (
                      <label
                        key={item.itemId}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-checked:border-brand has-checked:bg-brand/10"
                      >
                        <input
                          type="radio"
                          name="auction-product"
                          value={product.productId}
                          checked={values.productId === product.productId}
                          onChange={() => {
                            setValues({ ...values, productId: product.productId })
                          }}
                          className="mt-1 accent-brand"
                        />
                        <span>
                          <strong className="block text-sm text-ink">{product.name}</strong>
                          <span className="text-xs text-muted">
                            {product.type} ·{' '}
                            {countLabel(t, 'auction:publish.available', item.quantity)}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </QueryState>
              {errors.productId !== undefined && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {errors.productId}
                </p>
              )}
            </fieldset>

            <fieldset className="rounded-xl border border-border bg-surface-raised p-5">
              <legend className="px-1 font-semibold text-ink">{t('auction:publish.step2')}</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {([24, 48] as const).map((hours) => (
                  <label
                    key={hours}
                    className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-checked:border-brand has-checked:bg-brand/10"
                  >
                    <input
                      type="radio"
                      name="duration"
                      checked={values.durationHours === hours}
                      onChange={() => {
                        setValues({ ...values, durationHours: hours })
                      }}
                      className="accent-brand"
                    />
                    <span>
                      <strong className="block text-sm text-ink">
                        {countLabel(t, 'auction:hours', hours)}
                      </strong>
                      <span className="text-xs text-muted">
                        {t('auction:publish.fee', {
                          credits: countLabel(t, 'common:count.credits', hours === 24 ? 1 : 3),
                        })}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField
                  label={t('auction:publish.minimumBid')}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  required
                  value={values.minimumBidCredits}
                  error={errors.minimumBidCredits}
                  onChange={(event) => {
                    setValues({ ...values, minimumBidCredits: event.target.value })
                  }}
                />
                <TextField
                  label={t('auction:publish.buyNow')}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={values.buyNowCredits}
                  error={errors.buyNowCredits}
                  hint={t('auction:publish.buyNowHint')}
                  onChange={(event) => {
                    setValues({ ...values, buyNowCredits: event.target.value })
                  }}
                />
              </div>
            </fieldset>
          </div>

          <aside className="rounded-xl border border-border bg-surface-raised p-5 lg:sticky lg:top-4">
            <h2 className="font-semibold text-ink">{t('auction:publish.step3')}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t('auction:publish.product')}</dt>
                <dd className="text-right font-medium text-ink">
                  {selected?.product?.name ?? t('auction:publish.unselected')}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t('auction:publish.duration')}</dt>
                <dd className="font-medium text-ink">
                  {countLabel(t, 'auction:hours', values.durationHours)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t('auction:publish.feeLabel')}</dt>
                <dd className="flex items-center gap-1 font-semibold text-ink">
                  <Coins aria-hidden="true" className="size-4 text-brand" />
                  {countLabel(t, 'common:count.credits', fee)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t('auction:publish.closing')}</dt>
                <dd className="flex items-center gap-1 font-medium text-ink">
                  <Clock3 aria-hidden="true" className="size-4" />
                  {t('auction:publish.closingValue')}
                </dd>
              </div>
            </dl>
            <label className="mt-5 flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={values.confirmed}
                onChange={(event) => {
                  setValues({ ...values, confirmed: event.target.checked })
                }}
                className="mt-1 accent-brand"
              />
              <span>
                {t('auction:publish.confirm', {
                  credits: countLabel(t, 'common:count.credits', fee),
                })}
              </span>
            </label>
            {errors.confirmed !== undefined && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {errors.confirmed}
              </p>
            )}
            {mutation.error !== null && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
              >
                {describeAuctionError(mutation.error)}
              </p>
            )}
            <Button type="submit" loading={mutation.isPending} className="mt-5 w-full">
              {t('auction:publish.submit')}
            </Button>
            <p className="mt-3 text-xs text-muted">{t('auction:publish.revalidate')}</p>
          </aside>
        </form>
      )}
    </section>
  )
}
