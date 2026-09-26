import { useTranslation } from 'react-i18next'

import { PRODUCT_TYPE_LABELS, initialFunctionalStatusLabel } from '../contract'
import type { ProductDraft } from '../draft'
import { i18n } from '@/shared/i18n/i18n'
import { countLabel } from '@/shared/i18n/format'

export interface ReviewStepProps {
  readonly draft: ProductDraft
}

interface SummaryRow {
  readonly label: string
  readonly value: string
}

const describePrintRun = (raw: string): string => {
  const value = Number(raw.trim())

  if (value === -1) {
    return i18n.t('admin:products.review.infinite')
  }

  if (value === 1) {
    return i18n.t('admin:products.review.unique')
  }

  return countLabel(i18n.t, 'admin:products.review.units', value)
}

/**
 * Paso 4: lo que se va a crear, en las palabras del producto.
 *
 * NO ES UN VOLCADO DEL FORMULARIO. Traduce: el tipo aparece con su nombre, el
 * tiraje `-1` como «infinito» y el estado inicial ya proyectado. Repetir los
 * valores crudos obligaria a quien confirma a hacer esa traduccion de cabeza,
 * que es justo donde se cuelan los errores que este paso existe para evitar.
 */
export const ReviewStep = ({ draft }: ReviewStepProps): React.JSX.Element => {
  const printRun = Number(draft.printRun.trim())
  const { t } = useTranslation()

  const rows: readonly SummaryRow[] = [
    { label: t('admin:products.review.name'), value: draft.name.trim() },
    {
      label: t('admin:products.review.type'),
      value: draft.type === '' ? '—' : PRODUCT_TYPE_LABELS[draft.type],
    },
    { label: t('admin:products.review.description'), value: draft.description.trim() },
    { label: t('admin:products.review.image'), value: draft.imageUrl.trim() },
    { label: t('admin:products.review.printRun'), value: describePrintRun(draft.printRun) },
    {
      label: t('admin:products.review.credits'),
      value: t('admin:products.review.creditsValue', { value: draft.creditsPrice.trim() }),
    },
    {
      label: t('admin:products.review.premium'),
      value: draft.premium ? t('common:yes') : t('common:no'),
    },
    ...(draft.premium
      ? [
          {
            label: t('admin:products.review.realMoney'),
            value: `${draft.realMoneyAmount.trim()} ${draft.realMoneyCurrency}`,
          },
        ]
      : []),
    {
      label: t('admin:products.review.initialStatus'),
      value: initialFunctionalStatusLabel(printRun),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y divide-border rounded-md border border-border">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              {row.label}
            </dt>
            <dd className="min-w-0 break-words text-sm text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-muted">{t('admin:products.review.note')}</p>
    </div>
  )
}
