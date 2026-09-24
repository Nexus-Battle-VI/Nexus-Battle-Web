import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeDollarSign, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import { formatMoney } from '@/lib/format'
import { queryKeys } from '@/shared/query-keys'
import {
  describeAuctionError,
  publishOfficialAuction,
  type OfficialAuctionPublication,
} from './api'
import { validateOfficialAuctionForm, type OfficialAuctionFormValues } from './validation'

const INITIAL_VALUES: OfficialAuctionFormValues = {
  productId: '',
  durationHours: 24,
  currency: 'COP',
  minimumBidAmountMinor: '',
  buyNowAmountMinor: '',
  confirmed: false,
}

const newOperationId = (): string => globalThis.crypto.randomUUID()

export const OfficialAuctionPublisher = (): React.JSX.Element => {
  const queryClient = useQueryClient()
  const [values, setValues] = useState(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const [operationId, setOperationId] = useState(newOperationId)
  const [created, setCreated] = useState<OfficialAuctionPublication | null>(null)
  const errors = submitted ? validateOfficialAuctionForm(values) : {}
  const minimum = Number(values.minimumBidAmountMinor)
  const preview =
    Number.isSafeInteger(minimum) && minimum > 0
      ? formatMoney(minimum, values.currency)
      : 'Sin definir'

  const mutation = useMutation({
    mutationFn: () =>
      publishOfficialAuction(
        {
          productId: values.productId.trim(),
          durationHours: values.durationHours,
          currency: values.currency,
          minimumBidAmountMinor: Number(values.minimumBidAmountMinor),
          ...(values.buyNowAmountMinor === ''
            ? {}
            : { buyNowAmountMinor: Number(values.buyNowAmountMinor) }),
        },
        operationId,
      ),
    onSuccess: async (auction) => {
      setCreated(auction)
      await queryClient.invalidateQueries({ queryKey: queryKeys.auctions.active })
    },
  })

  const reset = (): void => {
    setValues(INITIAL_VALUES)
    setSubmitted(false)
    setCreated(null)
    setOperationId(newOperationId())
    mutation.reset()
  }

  if (created !== null) {
    return (
      <section aria-labelledby="official-created" className="space-y-4">
        <div className="rounded-xl border border-success/40 bg-success/10 p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck aria-hidden="true" className="size-6 text-success" />
            <h1 id="official-created" className="text-xl font-semibold text-ink">
              Publicación oficial activa
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted">
            Marca asignada por Catalog: {created.mark === 'PREMIUM' ? 'Premium' : 'Oficial'}.
          </p>
          <p className="mt-2 font-semibold text-ink">
            Precio mínimo: {formatMoney(created.minimumBidAmountMinor, created.currency)}
          </p>
        </div>
        <Button variant="secondary" onClick={reset}>
          Publicar otro producto oficial
        </Button>
      </section>
    )
  }

  return (
    <section aria-labelledby="official-auction-title" className="space-y-4">
      <header className="rounded-xl border border-brand/40 bg-brand/10 p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck aria-hidden="true" className="size-6 text-brand" />
          <h1 id="official-auction-title" className="text-xl font-semibold text-ink">
            Publicar como Maestro de Juego
          </h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Catalog valida la exclusividad y asigna la etiqueta Oficial o Premium. Esta operación no
          cobra comisión en créditos.
        </p>
      </header>
      <form
        noValidate
        aria-label="Publicación oficial"
        className="grid gap-4 rounded-xl border border-border bg-surface-raised p-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
          if (Object.keys(validateOfficialAuctionForm(values)).length === 0 && !mutation.isPending)
            mutation.mutate()
        }}
      >
        <div className="sm:col-span-2">
          <TextField
            label="Identificador del producto exclusivo"
            required
            value={values.productId}
            error={errors.productId}
            onChange={(event) => {
              setValues({ ...values, productId: event.target.value })
            }}
          />
        </div>
        <SelectField
          label="Duración"
          value={String(values.durationHours)}
          options={[
            { value: '24', label: '24 horas' },
            { value: '48', label: '48 horas' },
          ]}
          onChange={(event) => {
            setValues({ ...values, durationHours: event.target.value === '48' ? 48 : 24 })
          }}
        />
        <SelectField
          label="Moneda"
          value={values.currency}
          error={errors.currency}
          options={['COP', 'USD', 'EUR'].map((currency) => ({ value: currency, label: currency }))}
          onChange={(event) => {
            setValues({ ...values, currency: event.target.value })
          }}
        />
        <TextField
          label="Precio mínimo en unidad menor"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          required
          value={values.minimumBidAmountMinor}
          error={errors.minimumBidAmountMinor}
          hint={`Vista previa: ${preview}`}
          onChange={(event) => {
            setValues({ ...values, minimumBidAmountMinor: event.target.value })
          }}
        />
        <TextField
          label="Compra inmediata en unidad menor (opcional)"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={values.buyNowAmountMinor}
          error={errors.buyNowAmountMinor}
          onChange={(event) => {
            setValues({ ...values, buyNowAmountMinor: event.target.value })
          }}
        />
        <div className="sm:col-span-2 rounded-lg border border-border p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <BadgeDollarSign aria-hidden="true" className="size-5 text-brand" /> Comisión: 0
            créditos
          </p>
          <label className="mt-3 flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={values.confirmed}
              onChange={(event) => {
                setValues({ ...values, confirmed: event.target.checked })
              }}
              className="mt-1 accent-brand"
            />
            <span>Confirmo que Catalog decidirá la elegibilidad y la marca de la publicación.</span>
          </label>
          {errors.confirmed !== undefined && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {errors.confirmed}
            </p>
          )}
          {mutation.error !== null && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {describeAuctionError(mutation.error)}
            </p>
          )}
          <Button type="submit" loading={mutation.isPending} className="mt-4 w-full sm:w-auto">
            Publicar producto oficial
          </Button>
        </div>
      </form>
    </section>
  )
}
