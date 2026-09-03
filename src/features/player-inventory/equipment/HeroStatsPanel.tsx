import type { HeroEquipment } from './api'
import { formatMagnitude } from './magnitude'

const STAT_LABELS: Readonly<Record<string, string>> = {
  POWER: 'Poder',
  HEALTH: 'Vida',
  DEFENSE: 'Defensa',
  ATTACK: 'Ataque',
}

export interface HeroStatsPanelProps {
  readonly equipment: HeroEquipment
}

/**
 * Panel de estadísticas base → efectivas y efectos del equipamiento (RF-28,
 * §24, §25).
 *
 * El frontend NO calcula: muestra `baseStats`, `effectiveStats` y `deltas` tal
 * como los devuelve el backend. Distingue visualmente los efectos que ya están
 * reflejados en las estadísticas de los que quedan para el motor de combate.
 */
export const HeroStatsPanel = ({ equipment }: HeroStatsPanelProps): React.JSX.Element => {
  const { baseStats, effectiveStats, deltas, activeEffects } = equipment
  const deltaBy = new Map(deltas.map((delta) => [delta.statistic, delta]))

  const numericRows: readonly { key: string; base: number; effective: number }[] = [
    { key: 'ATTACK', base: baseStats.attack ?? 0, effective: effectiveStats.attack ?? 0 },
    { key: 'DEFENSE', base: baseStats.defense, effective: effectiveStats.defense },
    { key: 'HEALTH', base: baseStats.health, effective: effectiveStats.health },
    { key: 'POWER', base: baseStats.power, effective: effectiveStats.power },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-semibold text-muted">Estadísticas</h3>
        <table className="mt-1 w-full text-xs">
          <thead>
            <tr className="text-muted">
              <th className="text-left font-normal">Atributo</th>
              <th className="text-right font-normal">Base</th>
              <th className="text-right font-normal">Efectiva</th>
              <th className="text-right font-normal">Δ</th>
            </tr>
          </thead>
          <tbody>
            {numericRows.map((row) => {
              const delta = deltaBy.get(row.key)
              return (
                <tr key={row.key}>
                  <td className="text-ink">{STAT_LABELS[row.key] ?? row.key}</td>
                  <td className="text-right tabular-nums text-muted">{row.base}</td>
                  <td className="text-right tabular-nums text-ink">{row.effective}</td>
                  <td className="text-right tabular-nums text-ink" data-testid={`delta-${row.key}`}>
                    {delta === undefined
                      ? '—'
                      : `${delta.delta > 0 ? '+' : ''}${String(delta.delta)}`}
                  </td>
                </tr>
              )
            })}
            <tr>
              <td className="text-ink">Daño</td>
              <td className="text-right tabular-nums text-muted" colSpan={3}>
                {formatMagnitude(effectiveStats.damage)}
              </td>
            </tr>
            {effectiveStats.healing !== null && (
              <tr>
                <td className="text-ink">Sanación</td>
                <td className="text-right tabular-nums text-muted" colSpan={3}>
                  {formatMagnitude(effectiveStats.healing)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted">Efectos del equipamiento</h3>
        {activeEffects.length === 0 ? (
          <p className="mt-1 text-xs text-muted">Sin efectos: no hay piezas equipadas.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-1 text-xs">
            {activeEffects.map((effect, index) => (
              <li
                key={`${effect.sourceSlot}-${String(index)}`}
                className="rounded border border-border px-2 py-1"
              >
                <span className="text-ink">
                  {[effect.kind, effect.statistic, effect.operation, effect.target]
                    .filter((part) => part !== undefined)
                    .join(' · ')}
                </span>
                {effect.magnitude !== undefined && (
                  <span className="ml-1 tabular-nums text-muted">
                    {formatMagnitude(effect.magnitude)}
                  </span>
                )}
                <span className="ml-2 rounded-full bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                  {effect.appliedToStats
                    ? 'aplicado a stats'
                    : effect.durationTurns !== undefined
                      ? `${String(effect.durationTurns)} turno(s) · en combate`
                      : effect.hasActivationCondition
                        ? 'condicional · en combate'
                        : 'en combate'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
