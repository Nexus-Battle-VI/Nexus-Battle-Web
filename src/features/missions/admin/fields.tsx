import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'

import {
  AI_LABELS,
  damageOf,
  type DamageSpec,
  type FighterAi,
  type FighterProfile,
} from './missionContent'
import type { FieldErrors } from './missionContentValidation'
import { useTranslation } from 'react-i18next'

const shown = (value: number | null): string =>
  value === null || Number.isNaN(value) ? '' : String(value)

export interface NumberFieldProps {
  readonly label: string
  readonly value: number | null
  /** `null` solo si `optional`; un texto que no es numero llega como `NaN`. */
  readonly onChange: (value: number | null) => void
  readonly hint?: string
  readonly error?: string | undefined
  readonly min?: number
  readonly max?: number
  readonly step?: number | 'any'
  readonly optional?: boolean
}

/** Campo numerico: vacio es `null` si es opcional y `NaN` si no, para que la validacion lo diga. */
export const NumberField = ({
  label,
  value,
  onChange,
  hint,
  error,
  min,
  max,
  step = 1,
  optional = false,
}: NumberFieldProps): React.JSX.Element => (
  <TextField
    label={label}
    type="number"
    inputMode="decimal"
    value={shown(value)}
    {...(min === undefined ? {} : { min })}
    {...(max === undefined ? {} : { max })}
    step={step}
    {...(hint === undefined ? {} : { hint })}
    error={error}
    onChange={(event) => {
      const raw = event.target.value
      onChange(raw === '' ? (optional ? null : Number.NaN) : Number(raw))
    }}
  />
)

const toPercent = (fraction: number): number => Math.round(fraction * 1_000_000) / 10_000

/**
 * Una fraccion (0 a 1) que el administrador escribe como porcentaje (0 a 100 o
 * hasta `max`). Vacio es `null` si es opcional y `NaN` si no.
 */
export const PercentField = ({
  label,
  value,
  onChange,
  hint,
  error,
  max = 100,
  optional = false,
}: {
  readonly label: string
  readonly value: number | null
  readonly onChange: (fraction: number | null) => void
  readonly hint?: string
  readonly error?: string | undefined
  readonly max?: number
  readonly optional?: boolean
}): React.JSX.Element => (
  <NumberField
    label={label}
    value={value === null || Number.isNaN(value) ? value : toPercent(value)}
    min={0}
    max={max}
    step="any"
    optional={optional}
    {...(hint === undefined ? {} : { hint })}
    error={error}
    onChange={(percent) => {
      onChange(percent === null ? null : percent / 100)
    }}
  />
)

/** Daño fijo o en dados (1d6 = un dado de seis caras). */
export const DamageField = ({
  value,
  onChange,
  error,
}: {
  readonly value: DamageSpec
  readonly onChange: (damage: DamageSpec) => void
  readonly error?: string | undefined
}): React.JSX.Element => {
  const { t } = useTranslation()
  const damage = damageOf(value)
  return (
    <div className="flex flex-col gap-2">
      <SelectField
        label={t('admin:missions.fields.damage')}
        value={damage.mode}
        options={[
          { value: 'FIXED', label: t('admin:missions.fields.damageFixed') },
          { value: 'DICE', label: t('admin:missions.fields.damageDice') },
        ]}
        onChange={(event) => {
          onChange(
            event.target.value === 'DICE'
              ? { mode: 'DICE', count: 1, sides: 6 }
              : { mode: 'FIXED', amount: 1 },
          )
        }}
      />
      {damage.mode === 'FIXED' ? (
        <NumberField
          label={t('admin:missions.fields.damagePoints')}
          value={damage.amount}
          min={0}
          error={error}
          onChange={(amount) => {
            onChange({ mode: 'FIXED', amount: amount ?? Number.NaN })
          }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={t('admin:missions.fields.dice')}
            value={damage.count}
            min={1}
            max={100}
            error={error}
            onChange={(count) => {
              onChange({ ...damage, count: count ?? Number.NaN })
            }}
          />
          <NumberField
            label={t('admin:missions.fields.diceSides')}
            value={damage.sides}
            min={2}
            max={8000}
            onChange={(sides) => {
              onChange({ ...damage, sides: sides ?? Number.NaN })
            }}
          />
        </div>
      )}
    </div>
  )
}

/** Vida, ataque, defensa, daño, comportamiento y, en un jefe, su furia. */
export const FighterFields = ({
  profile,
  onChange,
  errors,
  path,
  aiOptions,
}: {
  readonly profile: FighterProfile
  readonly onChange: (profile: FighterProfile) => void
  readonly errors: FieldErrors
  readonly path: string
  readonly aiOptions: readonly FighterAi[]
}): React.JSX.Element => {
  const { t } = useTranslation()
  const set = (changes: Partial<FighterProfile>): void => {
    onChange({ ...profile, ...changes })
  }
  const ai = profile.ai ?? 'AGGRESSIVE'
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <NumberField
        label={t('admin:missions.fields.health')}
        value={profile.maxHealth}
        min={1}
        error={errors[`${path}.maxHealth`]}
        onChange={(maxHealth) => {
          set({ maxHealth: maxHealth ?? Number.NaN })
        }}
      />
      <NumberField
        label={t('admin:missions.fields.attack')}
        value={profile.attack}
        min={0}
        error={errors[`${path}.attack`]}
        onChange={(attack) => {
          set({ attack: attack ?? Number.NaN })
        }}
      />
      <NumberField
        label={t('admin:missions.fields.defense')}
        value={profile.defense}
        min={0}
        error={errors[`${path}.defense`]}
        onChange={(defense) => {
          set({ defense: defense ?? Number.NaN })
        }}
      />
      <SelectField
        label={t('admin:missions.fields.behavior')}
        value={ai}
        options={aiOptions.map((option) => ({ value: option, label: AI_LABELS[option] }))}
        onChange={(event) => {
          set({ ai: event.target.value as FighterAi })
        }}
      />
      <div className="sm:col-span-2">
        <DamageField
          value={profile.damage}
          error={errors[`${path}.damage`]}
          onChange={(damage) => {
            set({ damage })
          }}
        />
      </div>
      {ai === 'BOSS' && (
        <>
          <NumberField
            label={t('admin:missions.fields.enrageBelow')}
            value={profile.enrageBelowPercent ?? 50}
            min={1}
            max={100}
            error={errors[`${path}.enrageBelowPercent`]}
            onChange={(enrageBelowPercent) => {
              set({ enrageBelowPercent: enrageBelowPercent ?? Number.NaN })
            }}
          />
          <NumberField
            label={t('admin:missions.fields.enrageBonus')}
            value={profile.enrageAttackBonus ?? 0}
            min={0}
            error={errors[`${path}.enrageAttackBonus`]}
            onChange={(enrageAttackBonus) => {
              set({ enrageAttackBonus: enrageAttackBonus ?? Number.NaN })
            }}
          />
        </>
      )}
    </div>
  )
}

/** Un elemento de una lista editable, con su titulo y su boton de quitar. */
export const ItemBox = ({
  title,
  onRemove,
  removeLabel,
  children,
}: {
  readonly title: string
  readonly onRemove?: () => void
  readonly removeLabel?: string
  readonly children: ReactNode
}): React.JSX.Element => {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface/40 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {onRemove !== undefined && (
          <Button variant="secondary" onClick={onRemove}>
            {removeLabel ?? t('admin:missions.fields.remove')}
          </Button>
        )}
      </header>
      {children}
    </section>
  )
}

/** Error de una lista entera (no de un campo), anunciado como alerta. */
export const ListError = ({
  message,
}: {
  readonly message: string | undefined
}): React.JSX.Element | null =>
  message === undefined ? null : (
    <p role="alert" className="text-xs text-danger">
      {message}
    </p>
  )
