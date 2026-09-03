import { CheckboxField } from '@/components/ui/form/CheckboxField'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'

import { CURRENCIES, initialFunctionalStatus, type Currency } from '../contract'
import type { StepProps } from './BasicsStep'

/**
 * Paso 3: cuantas unidades existen y como se comercializa.
 *
 * EL TIRAJE TIENE UN VALOR ESPECIAL Y HAY QUE DECIRLO EN LA PANTALLA. `-1` no
 * es «menos una unidad»: significa tiraje infinito. Un formulario que solo
 * exija «entero» dejaria escribir `0` o `-5`, que el servicio rechaza con 422;
 * la ayuda lo explica antes y el resumen confirma como quedo interpretado.
 */
export const PricingStep = ({ draft, onChange, errors }: StepProps): React.JSX.Element => {
  const printRun = draft.printRun.trim()
  const parsed = /^-?\d+$/.test(printRun) ? Number(printRun) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <TextField
          label="Tiraje"
          required
          inputMode="numeric"
          value={draft.printRun}
          error={errors.printRun}
          hint="Número de unidades emitibles. Escribe -1 para tiraje infinito."
          onChange={(event) => {
            onChange({ printRun: event.target.value })
          }}
        />

        <TextField
          label="Precio en créditos"
          required
          inputMode="numeric"
          value={draft.creditsPrice}
          error={errors.creditsPrice}
          hint="Entero mayor o igual que 0."
          onChange={(event) => {
            onChange({ creditsPrice: event.target.value })
          }}
        />
      </div>

      {parsed !== null && (parsed === -1 || parsed >= 1) && (
        <p className="text-xs text-muted">
          Con este tiraje el producto nacerá en estado{' '}
          <strong className="text-ink">{initialFunctionalStatus(parsed)}</strong>
          {parsed === -1 ? ' y podrá adquirirse sin límite.' : '.'}
        </p>
      )}

      <CheckboxField
        label="Producto premium"
        hint="Habilita el precio en moneda real. Un producto premium queda bloqueado para reventa en Subasta."
        checked={draft.premium}
        onChange={(event) => {
          onChange({ premium: event.target.checked })
        }}
      />

      {draft.premium && (
        <div className="grid gap-6 md:grid-cols-2">
          <TextField
            label="Precio en moneda real"
            required
            inputMode="numeric"
            value={draft.realMoneyAmount}
            error={errors.realMoneyAmount}
            hint="Entero en la unidad mínima de la moneda. Mínimo 1."
            onChange={(event) => {
              onChange({ realMoneyAmount: event.target.value })
            }}
          />

          <SelectField
            label="Moneda"
            value={draft.realMoneyCurrency}
            options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
            onChange={(event) => {
              onChange({ realMoneyCurrency: event.target.value as Currency })
            }}
          />
        </div>
      )}
    </div>
  )
}
