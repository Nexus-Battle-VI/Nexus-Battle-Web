import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock3, Coins, Gavel, PackageCheck } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { TextField } from '@/components/ui/form/TextField'
import { useOwnedInventory } from '@/features/player-inventory/useOwnedInventory'
import { queryKeys } from '@/shared/query-keys'
import { describeAuctionError, publishAuction, type AuctionPublication } from './api'
import { validateAuctionForm, type AuctionFormValues } from './validation'

const newOperationId = (): string => globalThis.crypto.randomUUID()

const remaining = (closesAt: string, now = Date.now()): string => {
  const milliseconds = Math.max(0, new Date(closesAt).getTime() - now)
  const totalMinutes = Math.floor(milliseconds / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours === 0 && minutes === 0 ? 'Finalizando' : `${String(hours)} h ${String(minutes)} min`
}

const ActiveAuctionResult = ({ auction }: { auction: AuctionPublication }): React.JSX.Element => {
  const [label, setLabel] = useState(() => remaining(auction.closesAt))

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
            Subasta activa
          </h2>
          <p className="text-sm text-muted">Tu producto ya está visible para otros jugadores.</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Comisión cobrada</dt>
          <dd className="font-semibold text-ink">{auction.publicationFeeCredits} créditos</dd>
        </div>
        <div>
          <dt className="text-muted">Precio mínimo</dt>
          <dd className="font-semibold text-ink">{auction.minimumBidCredits} créditos</dd>
        </div>
        <div>
          <dt className="text-muted">Tiempo restante</dt>
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

export const AuctionPage = (): React.JSX.Element => {
  const queryClient = useQueryClient()
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
            Publicar en subasta
          </h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Selecciona un producto disponible, define tus precios y revisa la comisión antes de
          confirmar.
        </p>
      </header>

      {created !== null && (
        <>
          <ActiveAuctionResult auction={created} />
          <Button className="self-start" variant="secondary" onClick={reset}>
            Publicar otro producto
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
              <legend className="px-1 font-semibold text-ink">1. Producto elegible</legend>
              <QueryState
                isLoading={inventory.isLoading}
                error={inventory.error}
                isEmpty={inventory.data !== undefined && products.length === 0}
                emptyMessage="No tienes productos activos disponibles para publicar."
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
                            {product.type} · {item.quantity} disponible
                            {item.quantity === 1 ? '' : 's'}
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
              <legend className="px-1 font-semibold text-ink">2. Duración y precios</legend>
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
                      <strong className="block text-sm text-ink">{hours} horas</strong>
                      <span className="text-xs text-muted">
                        Comisión: {hours === 24 ? 1 : 3} créditos
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Precio mínimo de puja"
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
                  label="Compra inmediata (opcional)"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={values.buyNowCredits}
                  error={errors.buyNowCredits}
                  hint="Debe superar el precio mínimo."
                  onChange={(event) => {
                    setValues({ ...values, buyNowCredits: event.target.value })
                  }}
                />
              </div>
            </fieldset>
          </div>

          <aside className="rounded-xl border border-border bg-surface-raised p-5 lg:sticky lg:top-4">
            <h2 className="font-semibold text-ink">3. Confirmación</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Producto</dt>
                <dd className="text-right font-medium text-ink">
                  {selected?.product?.name ?? 'Sin seleccionar'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Duración</dt>
                <dd className="font-medium text-ink">{values.durationHours} horas</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Comisión</dt>
                <dd className="flex items-center gap-1 font-semibold text-ink">
                  <Coins aria-hidden="true" className="size-4 text-brand" />
                  {fee} créditos
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Cierre</dt>
                <dd className="flex items-center gap-1 font-medium text-ink">
                  <Clock3 aria-hidden="true" className="size-4" />
                  Al completar la duración
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
              <span>Confirmo el cobro de {fee} créditos y el bloqueo temporal del producto.</span>
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
              Publicar subasta
            </Button>
            <p className="mt-3 text-xs text-muted">
              El servicio volverá a validar propiedad, uso, saldo, sanciones y límite activo.
            </p>
          </aside>
        </form>
      )}
    </section>
  )
}
