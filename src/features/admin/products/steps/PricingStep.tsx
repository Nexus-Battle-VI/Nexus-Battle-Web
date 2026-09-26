import { useTranslation } from 'react-i18next'

import { CheckboxField } from '@/components/ui/form/CheckboxField'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'

import { CURRENCIES, initialFunctionalStatusLabel, type Currency } from '../contract'
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
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <SelectField
          label={t('admin:products.pricing.availability')}
          value={draft.printRunMode}
          options={[
            { value: 'LIMITED', label: t('admin:products.pricing.limited') },
            { value: 'INFINITE', label: t('admin:products.pricing.infinite') },
          ]}
          hint={t('admin:products.pricing.availabilityHint')}
          onChange={(event) => {
            onChange({ printRunMode: event.target.value as 'LIMITED' | 'INFINITE' })
          }}
        />

        {infinito ? (
          <div className="flex items-end">
            <p className="text-xs text-muted">
              {t('admin:products.pricing.infiniteBefore')}{' '}
              <strong className="text-ink">{t('admin:products.badge.infinite')}</strong>{' '}
              {t('admin:products.pricing.infiniteAfter')}
            </p>
          </div>
        ) : (
          <TextField
            label={t('admin:products.pricing.units')}
            required
            inputMode="numeric"
            value={draft.printRun}
            error={errors.printRun}
            hint={t('admin:products.pricing.unitsHint')}
            onChange={(event) => {
              onChange({ printRun: event.target.value })
            }}
          />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <TextField
          label={t('admin:products.pricing.credits')}
          required
          inputMode="numeric"
          value={draft.creditsPrice}
          error={errors.creditsPrice}
          hint={t('admin:products.pricing.creditsHint')}
          onChange={(event) => {
            onChange({ creditsPrice: event.target.value })
          }}
        />
      </div>

      {!infinito && parsed !== null && parsed >= 1 && (
        <p className="text-xs text-muted">
          {t('admin:products.pricing.initialState')}{' '}
          <strong className="text-ink">{initialFunctionalStatusLabel(parsed)}</strong>{' '}
          {t('admin:products.pricing.with')} <strong className="text-ink">{parsed}</strong>{' '}
          {t('admin:products.pricing.unitsAvailable', { count: parsed })}.
        </p>
      )}

      <CheckboxField
        label={t('admin:products.pricing.premium')}
        hint={t('admin:products.pricing.premiumHint')}
        checked={draft.premium}
        onChange={(event) => {
          onChange({ premium: event.target.checked })
        }}
      />

      {draft.premium && (
        <div className="grid gap-6 md:grid-cols-2">
          <TextField
            label={t('admin:products.pricing.realMoney')}
            required
            inputMode="numeric"
            value={draft.realMoneyAmount}
            error={errors.realMoneyAmount}
            hint={t('admin:products.pricing.realMoneyHint')}
            onChange={(event) => {
              onChange({ realMoneyAmount: event.target.value })
            }}
          />

          <SelectField
            label={t('admin:products.pricing.currency')}
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
