import { useState } from 'react'

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
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-ink">Resumen de la compra</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {summary.lines.map((line) => (
            <li key={line.sku} className="flex justify-between gap-3 text-sm">
              <span className="text-ink">
                {line.name ?? line.sku} <span className="text-muted">x{line.quantity}</span>
              </span>
              <span data-testid={`resumen-subtotal-${line.sku}`} className="text-ink tabular-nums">
                {formatMoney(line.subtotal, summary.currency)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
          Total a pagar{' '}
          <span
            data-testid="resumen-total"
            className="text-base font-semibold text-ink tabular-nums"
          >
            {formatMoney(summary.total, summary.currency)}
          </span>
        </p>
      </div>

      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          setTouched(true)

          if (!hasErrors && !disabled && !isPaying) {
            onPay(card)
          }
        }}
      >
        {FIELDS.map(({ field, label, placeholder }) => (
          /*
            El mensaje de error va FUERA del `label`. Dentro, su texto pasaria
            a formar parte del nombre accesible del campo, que quedaria como
            «Numero de tarjeta El numero de tarjeta solo admite...». Se enlaza
            con `aria-describedby`, que es lo que existe para esto.
          */
          <div key={field} className="flex flex-col gap-1">
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
                  touched && errors[field] !== undefined ? `error-${field}` : undefined
                }
                onChange={(event) => {
                  setCard({ ...card, [field]: event.target.value })
                }}
                className="rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              />
            </label>
            {touched && errors[field] !== undefined && (
              <span id={`error-${field}`} className="text-xs text-danger">
                {errors[field]}
              </span>
            )}
          </div>
        ))}

        {error !== undefined && error !== null && (
          <p role="alert" className="text-sm text-danger">
            {error instanceof Error ? error.message : 'No se pudo completar la compra.'}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={isPaying} disabled={disabled}>
            Confirmar pago
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isPaying}>
            Volver al carrito
          </Button>
        </div>

        <p className="text-xs text-muted">
          Pasarela simulada: esta operacion no ejecuta ningun movimiento financiero real.
        </p>
      </form>
    </section>
  )
}
