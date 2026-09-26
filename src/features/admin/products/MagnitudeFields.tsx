import { useTranslation } from 'react-i18next'

import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'

import { MAGNITUDE_MODE_LABELS, type MagnitudeMode } from './contract'
import type { MagnitudeDraft } from './draft'
import type { FieldErrors } from './validation'

export interface MagnitudeFieldsProps {
  readonly legend: string
  readonly value: MagnitudeDraft
  readonly onChange: (next: MagnitudeDraft) => void
  readonly errors: FieldErrors
  /** Raiz de las claves de error, p. ej. `effects.0.magnitude`. */
  readonly prefix: string
  readonly allowedModes: readonly MagnitudeMode[]
  readonly disabled?: boolean
}

/**
 * Editor de una magnitud.
 *
 * SOLO MUESTRA LOS CAMPOS DEL MODO ELEGIDO, y no es cosmetica: el dominio
 * rechaza una magnitud que traiga claves de otro modo, asi que enseñar los seis
 * campos a la vez invitaria a rellenar algo que invalida la peticion.
 *
 * `allowedModes` existe porque no todos los efectos admiten los tres modos:
 * reflejar daño solo tiene sentido en porcentaje, y un valor base de combate no
 * admite porcentaje.
 */
export const MagnitudeFields = ({
  legend,
  value,
  onChange,
  errors,
  prefix,
  allowedModes,
  disabled = false,
}: MagnitudeFieldsProps): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <fieldset className="grid gap-4 sm:grid-cols-3" disabled={disabled}>
      <legend className="sr-only">{legend}</legend>

      <SelectField
        label={t('admin:products.magnitude.label')}
        value={value.mode}
        error={errors[`${prefix}.mode`]}
        options={allowedModes.map((mode) => ({ value: mode, label: MAGNITUDE_MODE_LABELS[mode] }))}
        onChange={(event) => {
          onChange({ ...value, mode: event.target.value as MagnitudeMode })
        }}
      />

      {value.mode === 'FIXED' && (
        <TextField
          label={t('admin:products.magnitude.amount')}
          inputMode="numeric"
          value={value.amount}
          error={errors[`${prefix}.amount`]}
          hint={t('admin:products.magnitude.amountHint')}
          onChange={(event) => {
            onChange({ ...value, amount: event.target.value })
          }}
        />
      )}

      {value.mode === 'PERCENTAGE' && (
        <TextField
          label={t('admin:products.magnitude.basisPoints')}
          inputMode="numeric"
          value={value.basisPoints}
          error={errors[`${prefix}.basisPoints`]}
          hint={t('admin:products.magnitude.basisPointsHint')}
          onChange={(event) => {
            onChange({ ...value, basisPoints: event.target.value })
          }}
        />
      )}

      {value.mode === 'DICE' && (
        <>
          <TextField
            label={t('admin:products.magnitude.diceCount')}
            inputMode="numeric"
            value={value.diceCount}
            error={errors[`${prefix}.diceCount`]}
            onChange={(event) => {
              onChange({ ...value, diceCount: event.target.value })
            }}
          />
          <TextField
            label={t('admin:products.magnitude.diceSides')}
            inputMode="numeric"
            value={value.diceSides}
            error={errors[`${prefix}.diceSides`]}
            hint={t('admin:products.magnitude.diceSidesHint')}
            onChange={(event) => {
              onChange({ ...value, diceSides: event.target.value })
            }}
          />
        </>
      )}
    </fieldset>
  )
}
