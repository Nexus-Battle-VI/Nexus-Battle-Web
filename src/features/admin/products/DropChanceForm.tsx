import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/form/TextField'

import {
  configureProductDropChance,
  describeDropChanceFailure,
  type AdministeredProduct,
} from './api'

export interface DropChanceFormProps {
  readonly productId: string
  readonly productName: string
  /** `null` cuando el producto todavia no tiene tasa configurada (historico). */
  readonly initialDropChanceBasisPoints: number | null
  /** Envio inyectable, mismo patron que `EditProductForm.onSubmit`. */
  readonly onSubmit?: (
    productId: string,
    dropChanceBasisPoints: number,
  ) => Promise<AdministeredProduct>
  readonly onSuccess: (updated: AdministeredProduct) => void
  readonly onCancel: () => void
}

/**
 * Formulario minimo para fijar la probabilidad de caida Versus de un
 * ARMA/ARMADURA/ITEM ya existente (HU-30, correccion post-incidente):
 * `PATCH /v1/admin/products/{id}/drop-chance`.
 *
 * SEPARADO de `EditProductForm` a proposito: ese edita nombre/descripcion/
 * imagen (`PATCH .../details`), que es un contrato distinto. Mezclar los dos
 * formularios obligaria a decidir que pasa si alguien cambia ambos a la vez,
 * cuando el dominio los trata como dos operaciones independientes.
 *
 * El porcentaje se escribe en 0..100 (igual que el paso 2 del asistente de
 * creacion); la conversion a basis points (`x100`) ocurre al enviar, nunca
 * antes -mismo criterio que `payload.ts`.
 */
export const DropChanceForm = ({
  productId,
  productName,
  initialDropChanceBasisPoints,
  onSubmit = configureProductDropChance,
  onSuccess,
  onCancel,
}: DropChanceFormProps): React.JSX.Element => {
  const { t } = useTranslation()
  const [percent, setPercent] = useState(
    initialDropChanceBasisPoints === null ? '' : String(initialDropChanceBasisPoints / 100),
  )
  const [formError, setFormError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (basisPoints: number) => onSubmit(productId, basisPoints),
    onSuccess,
  })

  const submit = (event: React.SyntheticEvent): void => {
    event.preventDefault()
    mutation.reset()

    const trimmed = percent.trim()

    if (trimmed === '' || !/^\d+$/.test(trimmed)) {
      setFormError(t('admin:products.errors.integer'))
      return
    }

    const value = Number(trimmed)

    if (value < 0 || value > 100) {
      setFormError(t('admin:products.errors.max', { max: '100' }))
      return
    }

    setFormError(null)
    mutation.mutate(value * 100)
  }

  return (
    <form
      onSubmit={submit}
      aria-label={t('admin:products.manage.dropChanceTitle', { name: productName })}
      className="mt-4 space-y-4 rounded-lg border border-border bg-surface/60 p-4"
    >
      {initialDropChanceBasisPoints === null ? (
        <p role="alert" className="text-sm text-danger">
          {t('admin:products.manage.dropChanceMissing')}
        </p>
      ) : (
        <p className="text-sm text-muted">
          {t('admin:products.manage.dropChanceCurrent', {
            value: String(initialDropChanceBasisPoints / 100),
          })}
        </p>
      )}

      <TextField
        label={t('admin:products.attrs.dropChancePercent')}
        required
        type="number"
        min={0}
        max={100}
        hint={t('admin:products.attrs.dropChancePercentHint')}
        value={percent}
        onChange={(event) => {
          setPercent(event.target.value)
        }}
      />

      {formError !== null && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}

      {mutation.isError && (
        <p role="alert" className="text-sm text-danger">
          {describeDropChanceFailure(mutation.error)}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={mutation.isPending}>
          {mutation.isPending
            ? t('admin:products.manage.dropChanceSaving')
            : t('admin:products.manage.dropChanceSave')}
        </Button>
        <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={onCancel}>
          {t('admin:products.manage.dropChanceCancel')}
        </Button>
      </div>
    </form>
  )
}
