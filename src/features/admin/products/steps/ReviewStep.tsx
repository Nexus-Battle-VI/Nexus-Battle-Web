import { PRODUCT_TYPE_LABELS, initialFunctionalStatus } from '../contract'
import type { ProductDraft } from '../draft'

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
    return 'Infinito (-1)'
  }

  if (value === 1) {
    return '1 unidad (producto único)'
  }

  return `${String(value)} unidades`
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

  const rows: readonly SummaryRow[] = [
    { label: 'Nombre', value: draft.name.trim() },
    { label: 'Tipo', value: draft.type === '' ? '—' : PRODUCT_TYPE_LABELS[draft.type] },
    { label: 'Descripción', value: draft.description.trim() },
    { label: 'Imagen', value: draft.imageUrl.trim() },
    { label: 'Tiraje', value: describePrintRun(draft.printRun) },
    { label: 'Precio en créditos', value: `${draft.creditsPrice.trim()} créditos` },
    { label: 'Premium', value: draft.premium ? 'Sí' : 'No' },
    ...(draft.premium
      ? [
          {
            label: 'Precio en moneda real',
            value: `${draft.realMoneyAmount.trim()} ${draft.realMoneyCurrency}`,
          },
        ]
      : []),
    { label: 'Estado inicial', value: initialFunctionalStatus(printRun) },
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

      <p className="text-xs text-muted">
        Al confirmar, Catalog valida los atributos contra el esquema del tipo, persiste el producto
        y registra el evento de auditoría. Si algo falla, no se crea nada.
      </p>
    </div>
  )
}
