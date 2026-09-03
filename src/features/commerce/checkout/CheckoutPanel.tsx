import { useId, useState } from 'react'
import { CreditCard, ShoppingBag } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/format'
import type { CheckoutSummary, PaymentResult } from './api'
import {
  EMPTY_CARD,
  validateCard,
  type CardErrors,
  type CardField,
  type CardForm,
} from './validation'

export interface CheckoutPanelProps {
  readonly summary: CheckoutSummary
  readonly onPay: (card: CardForm) => void
  readonly onCancel: () => void
  readonly isPaying?: boolean
  readonly error?: unknown
  /** Resultado de una compra completada. Cuando llega, se muestra en su lugar. */
  readonly result?: PaymentResult | null
  readonly processing?: boolean
  readonly disabled?: boolean
}

const FIELDS: readonly { field: CardField; label: string; placeholder: string }[] = [
  { field: 'holder', label: 'Nombre del titular', placeholder: 'Como aparece en la tarjeta' },
  { field: 'number', label: 'Numero de tarjeta', placeholder: '4111 1111 1111 1111' },
  { field: 'expiry', label: 'Vencimiento', placeholder: 'MM/AA' },
  { field: 'securityCode', label: 'Codigo de seguridad', placeholder: '123' },
]

/**
 * Resumen de compra y formulario de pago simulado (HU-59).
 *
 * El resumen se pinta con lo que devuelve el servicio en el momento de abrir
 * el pago, no con una copia guardada antes: CA-02 exige que contenga «los
 * productos actuales», y cualquier copia anterior podria estar desfasada.
 *
 * **Ningun dato de la tarjeta sale de este componente** salvo hacia el
 * servicio: no se guarda en estado global, ni en almacenamiento local, ni se
 * registra. Al completarse la compra, el formulario se descarta.
 */
export const CheckoutPanel = ({
  summary,
  onPay,
  onCancel,
  isPaying = false,
  error,
  result = null,
  processing = false,
  disabled = false,
}: CheckoutPanelProps): React.JSX.Element => {
  const headingId = useId()
  const [card, setCard] = useState<CardForm>(EMPTY_CARD)
  const [touched, setTouched] = useState(false)

  const errors: CardErrors = validateCard(card)
  const hasErrors = Object.keys(errors).length > 0

  if (processing) {
    return (
      <section
        aria-label="Compra en proceso"
        className="rounded-lg border border-border bg-surface-raised p-5"
      >
        <h2 className="text-lg font-semibold text-ink">Compra en proceso</h2>
        <p role="status" className="mt-2 text-sm text-muted">
          Estamos verificando el resultado de tu compra. Esta pantalla se actualizará
          automáticamente.
        </p>
        {error instanceof Error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error.message}
          </p>
        )}
      </section>
    )
  }

  if (result?.status === 'COMPLETED') {
    return (
      <section
        aria-label="Compra completada"
        className="rounded-lg border border-border bg-surface-raised p-5"
      >
        <h2 className="text-lg font-semibold text-ink">Compra completada</h2>
        <p className="mt-2 text-sm text-muted">
          Referencia{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
            {result.paymentReference}
          </code>
          , tarjeta terminada en {result.maskedCard}.
        </p>
        <p className="mt-2 text-sm text-ink">
          Total pagado{' '}
          <span className="font-semibold tabular-nums">
            {formatMoney(result.order.total, result.order.currency)}
          </span>
          .
        </p>
        {/*
          CA-03 pide que la evidencia confirme que no hubo movimiento
          financiero real. El servicio lo declara en su respuesta, y aqui se
          muestra: asi la evidencia esta a la vista y no en una nota aparte.
        */}
        <p className="mt-2 text-xs text-muted">
          {result.realMoneyMoved
            ? 'Atencion: el servicio informa de un movimiento financiero real.'
            : 'Pago simulado: no se ejecuto ningun movimiento financiero real.'}
        </p>
        <Button className="mt-4" onClick={onCancel}>
          Seguir comprando
        </Button>
      </section>
    )
  }

  return (
    <section
      aria-label="Pago de la compra"
      className="flex max-h-[calc(100dvh-8rem)] min-h-0 flex-col overflow-y-auto rounded-2xl border border-border bg-surface-raised md:grid md:h-[min(34rem,calc(100dvh-8rem))] md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:overflow-hidden"
    >
      <section
        aria-labelledby={`${headingId}-summary`}
        className="flex min-h-0 shrink-0 flex-col border-b border-border bg-surface/60 p-5 md:border-r md:border-b-0"
      >
        <header className="flex shrink-0 items-center gap-3">
          <span className="rounded-xl bg-brand/10 p-2.5 text-brand">
            <ShoppingBag aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={`${headingId}-summary`} className="text-base font-semibold text-ink">
              Resumen de la compra
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {summary.itemCount} {summary.itemCount === 1 ? 'unidad' : 'unidades'}
            </p>
          </div>
        </header>
        <ul
          aria-label="Productos de la compra"
          tabIndex={0}
          className="mt-4 max-h-40 min-h-0 space-y-1 overflow-y-auto overscroll-contain pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:max-h-none md:flex-1"
        >
          {summary.lines.map((line) => (
            <li
              key={line.productId ?? line.sku}
              className="flex items-start justify-between gap-3 border-b border-border/60 py-3 text-sm last:border-0"
            >
              <div className="min-w-0">
                <p className="font-medium wrap-break-word text-ink">{line.name ?? line.sku}</p>
                <p className="mt-1 text-xs text-muted">
                  {line.quantity} × {formatMoney(line.unitPrice, summary.currency)}
                </p>
              </div>
              <span
                data-testid={`resumen-subtotal-${line.sku}`}
                className="shrink-0 font-medium whitespace-nowrap text-ink tabular-nums"
              >
                {formatMoney(line.subtotal, summary.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/10 p-4">
          <span className="text-sm text-muted">Total a pagar</span>
          <strong
            data-testid="resumen-total"
            className="text-lg font-semibold whitespace-nowrap text-ink tabular-nums"
          >
            {formatMoney(summary.total, summary.currency)}
          </strong>
        </div>
      </section>

      <form
        aria-labelledby={`${headingId}-payment`}
        noValidate
        className="flex min-h-0 shrink-0 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          setTouched(true)

          if (!hasErrors && !disabled && !isPaying) {
            onPay(card)
          }
        }}
      >
        <header className="shrink-0 border-b border-border px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 text-ink">
            <CreditCard aria-hidden="true" className="size-5 text-brand" />
            <h2 id={`${headingId}-payment`} className="text-base font-semibold">
              Datos de pago
            </h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Pasarela simulada: esta operacion no ejecuta ningun movimiento financiero real.
          </p>
        </header>

        <div className="grid grid-cols-2 content-start gap-3 px-5 py-4 md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain">
          {FIELDS.map(({ field, label, placeholder }) => (
            /*
            El mensaje de error va FUERA del `label`. Dentro, su texto pasaria
            a formar parte del nombre accesible del campo, que quedaria como
            «Numero de tarjeta El numero de tarjeta solo admite...». Se enlaza
            con `aria-describedby`, que es lo que existe para esto.
          */
            <div
              key={field}
              className={
                field === 'holder' || field === 'number' ? 'col-span-2 min-w-0' : 'min-w-0'
              }
            >
              <label className="flex flex-col gap-1 text-xs text-muted">
                {label}
                <input
                  type="text"
                  inputMode={field === 'holder' ? 'text' : 'numeric'}
                  value={card[field]}
                  placeholder={placeholder}
                  // Sin autocompletado: esta pasarela es academica y no cobra
                  // nada. Invitar al navegador a rellenar una tarjeta real seria
                  // pedir un dato sensible para un flujo que no lo necesita.
                  autoComplete="off"
                  disabled={isPaying || disabled}
                  aria-invalid={touched && errors[field] !== undefined}
                  aria-describedby={
                    touched && errors[field] !== undefined
                      ? `${headingId}-error-${field}`
                      : undefined
                  }
                  onChange={(event) => {
                    setCard({ ...card, [field]: event.target.value })
                  }}
                  className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                />
              </label>
              {touched && errors[field] !== undefined && (
                <span id={`${headingId}-error-${field}`} className="mt-1 block text-xs text-danger">
                  {errors[field]}
                </span>
              )}
            </div>
          ))}

          {error !== undefined && error !== null && (
            <p
              role="alert"
              className="col-span-2 rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger"
            >
              {error instanceof Error ? error.message : 'No se pudo completar la compra.'}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border px-5 py-4">
          <Button type="submit" loading={isPaying} disabled={disabled} className="w-full">
            Confirmar pago
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isPaying}
            className="w-full"
          >
            Volver al carrito
          </Button>
        </div>
      </form>
    </section>
  )
}
