import type { ReactNode } from 'react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { FieldShell } from '@/components/ui/form/FieldShell'
import { FIELD_CLASS } from '@/components/ui/form/fieldStyles'
import { SelectField } from '@/components/ui/form/SelectField'
import { RefreshCw } from '@/components/ui/icons'

import { formatInstantUtc, formatPeriodRange } from './metricsFormat'
import type { PeriodDraft, RangePreset } from './period'
import type { MetricsPeriod } from './types'

const PRESETS: readonly RangePreset[] = ['30', '7', '90', 'custom']

const FIELD_COLUMN = 'min-w-0 flex-[1_1_11rem]'

export interface PeriodFiltersProps {
  readonly draft: PeriodDraft
  /** El periodo del contrato ya resuelto por Auction; `null` mientras no hay respuesta. */
  readonly loaded: { readonly period: MetricsPeriod; readonly asOf: string } | null
  readonly invalidPeriod: boolean
  readonly refreshing: boolean
  readonly onPresetChange: (preset: RangePreset) => void
  readonly onDateChange: (field: 'from' | 'to', value: string) => void
  readonly onApply: () => void
  readonly onRefresh: () => void
}

const DateField = ({
  label,
  value,
  invalid,
  describedBy,
  onChange,
}: {
  readonly label: string
  readonly value: string
  readonly invalid: boolean
  readonly describedBy: string | undefined
  readonly onChange: (value: string) => void
}): ReactNode => (
  <div className={FIELD_COLUMN}>
    <FieldShell label={label}>
      {({ id }) => (
        <input
          id={id}
          type="date"
          value={value}
          className={FIELD_CLASS}
          aria-invalid={invalid}
          {...(describedBy === undefined ? {} : { 'aria-describedby': describedBy })}
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
      )}
    </FieldShell>
  </div>
)

/**
 * Filtros de periodo: rango predefinido, desde/hasta, "Aplicar" y "Actualizar".
 *
 * El error de periodo invalido se muestra UNA vez, debajo de la fila (no dentro de cada
 * campo), y ambos campos lo referencian con `aria-describedby`: `desde` y `hasta` fallan
 * juntos, porque la regla es sobre el rango.
 */
export const PeriodFilters = ({
  draft,
  loaded,
  invalidPeriod,
  refreshing,
  onPresetChange,
  onDateChange,
  onApply,
  onRefresh,
}: PeriodFiltersProps): React.JSX.Element => {
  const { t } = useTranslation()
  const errorId = useId()

  return (
    <section aria-label={t('auctionMetrics:filters.group')} className="am-panel p-5">
      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          onApply()
        }}
      >
        <div className={FIELD_COLUMN}>
          <SelectField
            label={t('auctionMetrics:filters.range')}
            value={draft.preset}
            onChange={(event) => {
              onPresetChange(event.target.value as RangePreset)
            }}
            options={PRESETS.map((preset) => ({
              value: preset,
              label: t(`auctionMetrics:filters.preset.${preset}`),
            }))}
          />
        </div>
        <DateField
          label={t('auctionMetrics:filters.from')}
          value={draft.from}
          invalid={invalidPeriod}
          describedBy={invalidPeriod ? errorId : undefined}
          onChange={(value) => {
            onDateChange('from', value)
          }}
        />
        <DateField
          label={t('auctionMetrics:filters.to')}
          value={draft.to}
          invalid={invalidPeriod}
          describedBy={invalidPeriod ? errorId : undefined}
          onChange={(value) => {
            onDateChange('to', value)
          }}
        />
        <Button type="submit" className="am-btn-primary">
          {t('auctionMetrics:filters.apply')}
        </Button>
        <Button
          variant="secondary"
          className="am-btn-secondary"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw aria-hidden className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          {t('auctionMetrics:filters.refresh')}
        </Button>
      </form>

      {invalidPeriod && (
        <p id={errorId} role="alert" className="mt-3 text-xs text-danger">
          {t('auctionMetrics:filters.invalidPeriod')}
        </p>
      )}

      {loaded !== null && (
        <p className="mt-3 text-xs text-muted">
          {t('auctionMetrics:filters.period')}{' '}
          <b className="font-semibold text-ink">
            {formatPeriodRange(loaded.period.from, loaded.period.to)}
          </b>{' '}
          · {t('auctionMetrics:filters.asOf')} {formatInstantUtc(loaded.asOf)}
        </p>
      )}
    </section>
  )
}
