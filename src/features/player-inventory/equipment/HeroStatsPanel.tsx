import clsx from 'clsx'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { countLabel } from '@/shared/i18n/format'

import type { EquippedEffect, HeroEquipment } from './api'
import { describeEquipmentEffect, statisticLabel } from './effectPresentation'
import { describeMagnitudeRange, formatMagnitude } from './magnitude'

export interface HeroStatsPanelProps {
  readonly equipment: HeroEquipment
}

/**
 * Tabla de estadisticas base → efectivas (RF-28, §24, §25).
 *
 * El frontend NO calcula: muestra `baseStats`, `effectiveStats` y `deltas` tal
 * como los devuelve el backend. El daño se presenta como magnitud (dado, caras
 * y rango base), nunca como un "daño final": ese lo decide Combat.
 */
export const HeroStatsTable = ({ equipment }: HeroStatsPanelProps): React.JSX.Element => {
  const { t } = useTranslation()
  const { baseStats, effectiveStats, deltas } = equipment
  const deltaBy = new Map(deltas.map((delta) => [delta.statistic, delta]))

  const numericRows: readonly { key: string; base: number; effective: number }[] = [
    { key: 'ATTACK', base: baseStats.attack ?? 0, effective: effectiveStats.attack ?? 0 },
    { key: 'DEFENSE', base: baseStats.defense, effective: effectiveStats.defense },
    { key: 'HEALTH', base: baseStats.health, effective: effectiveStats.health },
    { key: 'POWER', base: baseStats.power, effective: effectiveStats.power },
  ]
  const damageRange = describeMagnitudeRange(effectiveStats.damage)
  const healingRange = describeMagnitudeRange(effectiveStats.healing, 'use')

  return (
    <div className="min-w-0">
      <h3 className="text-xs font-semibold text-muted">{t('inventory:stats.title')}</h3>
      <table className="mt-1 w-full text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="py-0.5 text-left font-normal">{t('inventory:stats.attribute')}</th>
            <th className="py-0.5 text-right font-normal">{t('inventory:stats.base')}</th>
            <th className="py-0.5 text-right font-normal">{t('inventory:stats.effective')}</th>
            <th className="py-0.5 text-right font-normal">{t('inventory:stats.delta')}</th>
          </tr>
        </thead>
        <tbody>
          {numericRows.map((row) => {
            const delta = deltaBy.get(row.key)
            return (
              <tr key={row.key} className="border-t border-border/60">
                <td className="py-1 text-ink">{statisticLabel(row.key)}</td>
                <td className="py-1 text-right tabular-nums text-muted">{row.base}</td>
                <td className="py-1 text-right tabular-nums font-semibold text-ink">
                  {row.effective}
                </td>
                <td
                  className={clsx(
                    'py-1 text-right tabular-nums',
                    delta !== undefined && delta.delta > 0 && 'text-success',
                    delta !== undefined && delta.delta < 0 && 'text-danger',
                    (delta === undefined || delta.delta === 0) && 'text-muted',
                  )}
                  data-testid={`delta-${row.key}`}
                >
                  {delta === undefined
                    ? '—'
                    : `${delta.delta > 0 ? '+' : ''}${String(delta.delta)}`}
                </td>
              </tr>
            )
          })}
          <tr className="border-t border-border/60">
            <td className="py-1 align-top text-ink">{t('inventory:stats.damage')}</td>
            <td className="py-1 text-right" colSpan={3}>
              <span className="block font-semibold tabular-nums text-ink">
                {formatMagnitude(effectiveStats.damage)}
              </span>
              {damageRange !== null && (
                <span className="block text-xs text-muted">{damageRange}</span>
              )}
            </td>
          </tr>
          {effectiveStats.healing !== null && (
            <tr className="border-t border-border/60">
              <td className="py-1 align-top text-ink">{t('inventory:stats.healing')}</td>
              <td className="py-1 text-right" colSpan={3}>
                <span className="block font-semibold tabular-nums text-ink">
                  {formatMagnitude(effectiveStats.healing)}
                </span>
                {healingRange !== null && (
                  <span className="block text-xs text-muted">{healingRange}</span>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-muted">{t('inventory:stats.combatNote')}</p>
    </div>
  )
}

const effectScope = (effect: EquippedEffect, t: TFunction): string => {
  if (effect.appliedToStats) return t('inventory:effects.applied')
  if (effect.durationTurns !== undefined) {
    return countLabel(t, 'inventory:effects.turns', effect.durationTurns)
  }
  return effect.hasActivationCondition
    ? t('inventory:effects.conditional')
    : t('inventory:effects.inCombat')
}

/**
 * Efectos del equipamiento en palabras. Distingue los que ya estan reflejados
 * en las estadisticas de los que quedan para el motor de combate. Con muchos
 * efectos la lista tiene scroll propio: ninguno se oculta.
 */
export const EquipmentEffectsList = ({ equipment }: HeroStatsPanelProps): React.JSX.Element => {
  const { t } = useTranslation()
  const { activeEffects } = equipment

  return (
    <div className="min-w-0">
      <h3 className="text-xs font-semibold text-muted">{t('inventory:effects.title')}</h3>
      {activeEffects.length === 0 ? (
        <p className="mt-1 text-xs text-muted">{t('inventory:effects.none')}</p>
      ) : (
        <ul
          className={clsx(
            'mt-1 flex flex-col gap-1 text-sm',
            activeEffects.length > 4 && 'max-h-40 overflow-y-auto pr-1',
          )}
        >
          {activeEffects.map((effect, index) => (
            <li
              key={`${effect.sourceSlot}-${String(index)}`}
              className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded border border-border px-2 py-1"
            >
              <span className="text-ink">{describeEquipmentEffect(effect)}</span>
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-xs text-muted">
                {effectScope(effect, t)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Estadisticas + efectos juntos (vista de seleccion de heroe, HU-07). */
export const HeroStatsPanel = ({ equipment }: HeroStatsPanelProps): React.JSX.Element => (
  <div className="flex flex-col gap-3">
    <HeroStatsTable equipment={equipment} />
    <EquipmentEffectsList equipment={equipment} />
  </div>
)
