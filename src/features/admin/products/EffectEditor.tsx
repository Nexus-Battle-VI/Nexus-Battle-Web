import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'

import {
  EFFECT_KINDS,
  EFFECT_KIND_LABELS,
  EFFECT_OPERATIONS,
  EFFECT_OPERATION_LABELS,
  EFFECT_TARGETS,
  EFFECT_TARGET_LABELS,
  STATISTICS,
  STATISTIC_LABELS,
  type EffectKind,
  type EffectOperation,
  type EffectTarget,
  type MagnitudeMode,
  type Statistic,
} from './contract'
import type { EffectDraft } from './draft'
import { MagnitudeFields } from './MagnitudeFields'
import type { FieldErrors } from './validation'

export interface EffectEditorProps {
  readonly title: string
  readonly value: EffectDraft
  readonly onChange: (next: EffectDraft) => void
  readonly errors: FieldErrors
  readonly prefix: string
  readonly onRemove?: () => void
}

/** Modos de magnitud admitidos por cada clase de efecto, segun el dominio. */
const MODES_BY_KIND: Readonly<Record<EffectKind, readonly MagnitudeMode[]>> = {
  STAT_MODIFIER: ['FIXED', 'PERCENTAGE', 'DICE'],
  DAMAGE: ['FIXED', 'PERCENTAGE', 'DICE'],
  HEALING: ['FIXED', 'PERCENTAGE', 'DICE'],
  REFLECT_DAMAGE: ['PERCENTAGE'],
  REVIVE: ['FIXED', 'PERCENTAGE'],
  IMMUNITY: [],
  TEMPORARY_STATUS: [],
}

/**
 * Editor de un efecto.
 *
 * Los campos cambian con la clase elegida porque el contrato es una union
 * discriminada: un efecto de inmunidad no tiene magnitud y uno de daño no tiene
 * codigo. Mostrar el superconjunto dejaria enviar combinaciones que el dominio
 * rechaza, y el error llegaria del servidor en lugar de no poder escribirse.
 */
export const EffectEditor = ({
  title,
  value,
  onChange,
  errors,
  prefix,
  onRemove,
}: EffectEditorProps): React.JSX.Element => {
  const modes = MODES_BY_KIND[value.kind]

  return (
    <fieldset className="rounded-md border border-border bg-surface/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-sm font-semibold text-ink">{title}</legend>
        {onRemove !== undefined && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-medium text-danger hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Quitar efecto
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Clase de efecto"
          value={value.kind}
          options={EFFECT_KINDS.map((kind) => ({ value: kind, label: EFFECT_KIND_LABELS[kind] }))}
          onChange={(event) => {
            const kind = event.target.value as EffectKind
            const allowed = MODES_BY_KIND[kind]
            // Al cambiar de clase, un modo que la nueva no admite dejaria el
            // efecto invalido sin que nada lo indique. Se recoloca en el
            // primero permitido.
            const mode =
              allowed.length === 0 || allowed.includes(value.magnitude.mode)
                ? value.magnitude.mode
                : allowed[0]

            onChange({ ...value, kind, magnitude: { ...value.magnitude, mode: mode ?? 'FIXED' } })
          }}
        />

        <SelectField
          label="Objetivo"
          value={value.target}
          options={EFFECT_TARGETS.map((target) => ({
            value: target,
            label: EFFECT_TARGET_LABELS[target],
          }))}
          onChange={(event) => {
            onChange({ ...value, target: event.target.value as EffectTarget })
          }}
        />

        {value.kind === 'STAT_MODIFIER' && (
          <>
            <SelectField
              label="Estadística"
              value={value.statistic}
              options={STATISTICS.map((statistic) => ({
                value: statistic,
                label: STATISTIC_LABELS[statistic],
              }))}
              onChange={(event) => {
                onChange({ ...value, statistic: event.target.value as Statistic })
              }}
            />
            <SelectField
              label="Operación"
              value={value.operation}
              options={EFFECT_OPERATIONS.map((operation) => ({
                value: operation,
                label: EFFECT_OPERATION_LABELS[operation],
              }))}
              onChange={(event) => {
                onChange({ ...value, operation: event.target.value as EffectOperation })
              }}
            />
          </>
        )}

        {value.kind === 'IMMUNITY' && (
          <TextField
            label="Código de inmunidad"
            value={value.immunityCode}
            error={errors[`${prefix}.immunityCode`]}
            hint="En MAYÚSCULAS, sin espacios. Ej. VENENO."
            onChange={(event) => {
              onChange({ ...value, immunityCode: event.target.value })
            }}
          />
        )}

        {value.kind === 'TEMPORARY_STATUS' && (
          <>
            <TextField
              label="Código de estado"
              value={value.statusCode}
              error={errors[`${prefix}.statusCode`]}
              hint="En MAYÚSCULAS, sin espacios. Ej. ATURDIDO."
              onChange={(event) => {
                onChange({ ...value, statusCode: event.target.value })
              }}
            />
            <TextField
              label="Duración en turnos"
              inputMode="numeric"
              value={value.durationTurns}
              error={errors[`${prefix}.durationTurns`]}
              onChange={(event) => {
                onChange({ ...value, durationTurns: event.target.value })
              }}
            />
          </>
        )}
      </div>

      {modes.length > 0 && (
        <div className="mt-4">
          <MagnitudeFields
            legend={`Magnitud de ${title.toLowerCase()}`}
            value={value.magnitude}
            errors={errors}
            prefix={`${prefix}.magnitude`}
            allowedModes={modes}
            onChange={(magnitude) => {
              onChange({ ...value, magnitude })
            }}
          />
        </div>
      )}
    </fieldset>
  )
}
