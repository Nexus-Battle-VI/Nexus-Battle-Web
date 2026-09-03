import { CheckboxField } from '@/components/ui/form/CheckboxField'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'

import { CURRENCIES, initialFunctionalStatus, type Currency } from '../contract'
import type { StepProps } from './BasicsStep'

/**
 * Paso 3: cuantas unidades existen y como se comercializa.
 *
 * LA MODALIDAD SE ELIGE, NO SE CODIFICA. El contrato reserva `-1` para tiraje
 * infinito, pero pedirle ese numero a una persona invita a escribir `0` o `-5`
 * y a descubrir el 422 despues. La pantalla pregunta cual de las dos
 * modalidades es, y la traduccion a `-1` la hace el codigo en un solo sitio.
 *
 * Con infinito NO se pide cantidad: un campo que el servicio va a ignorar solo
 * puede confundir sobre lo que se esta configurando.
 */
export const PricingStep = ({ draft, onChange, errors }: StepProps): React.JSX.Element => {
  const infinito = draft.printRunMode === 'INFINITE'
  const printRun = draft.printRun.trim()
  const parsed = /^\d+$/.test(printRun) ? Number(printRun) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <SelectField
          label="Disponibilidad"
          value={draft.printRunMode}
          options={[
            { value: 'LIMITED', label: 'Tiraje limitado (cantidad exacta)' },
            { value: 'INFINITE', label: 'Tiraje infinito (sin límite)' },
          ]}
          hint="Un tiraje limitado deja de estar disponible al agotarse; el infinito nunca se agota."
          onChange={(event) => {
            onChange({ printRunMode: event.target.value as 'LIMITED' | 'INFINITE' })
          }}
        />

        {infinito ? (
          <div className="flex items-end">
            <p className="text-xs text-muted">
              Sin contador de unidades. El producto permanecerá siempre como{' '}
              <strong className="text-ink">Disponible (infinito)</strong> y cada adquisición se
              registrará solo en el inventario del jugador.
            </p>
          </div>
        ) : (
          <TextField
            label="Cantidad de unidades"
            required
            inputMode="numeric"
            value={draft.printRun}
            error={errors.printRun}
            hint="Entero mayor o igual que 1. Es el total emitible en todo el sistema."
            onChange={(event) => {
              onChange({ printRun: event.target.value })
            }}
          />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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

      {!infinito && parsed !== null && parsed >= 1 && (
        <p className="text-xs text-muted">
          Con esta cantidad el producto nacerá en estado{' '}
          <strong className="text-ink">{initialFunctionalStatus(parsed)}</strong> con{' '}
          <strong className="text-ink">{parsed}</strong>{' '}
          {parsed === 1 ? 'unidad disponible' : 'unidades disponibles'}.
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
