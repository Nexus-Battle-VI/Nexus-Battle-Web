import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import '../battle-rooms.css'
import { PowerMeter } from '../PowerMeter'
import { BattlePixelIcon } from '../BattlePixelIcon'
import { HealthBar } from './HealthBar'
import { combatantName } from './presentation'
import { combatantPower } from './skillPresentation'
import type { BattleView, HealthView, TurnOrderEntry } from './types'

export interface BattleStatusListProps {
  readonly battle: BattleView
  readonly entries: readonly TurnOrderEntry[]
  readonly isCurrent: (entry: TurnOrderEntry) => boolean
  readonly healthOf: (entry: TurnOrderEntry) => HealthView | null | undefined
}

/**
 * Columna izquierda del HUD de batalla (remaster visual Sprint 3, 2a pasada,
 * seccion 26 del brief): estado COMPACTO de cada combatiente. Reutiliza
 * `HealthBar`/`PowerMeter` -- LOS MISMOS componentes de produccion que antes
 * vivian dentro de cada tarjeta de la arena (mismos `data-testid`, mismo
 * texto, mismo `role="meter"`, ningun calculo nuevo) -- solo cambia DONDE se
 * montan: aqui, no superpuestos al heroe, para que este quede sin caja ni
 * medidor encima (seccion 20 del brief).
 */
export const BattleStatusList = ({
  battle,
  entries,
  isCurrent,
  healthOf,
}: BattleStatusListProps): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <ul className="br-hud-status" aria-label={t('battle:battle.combatants')}>
      {entries.map((entry) => {
        const health = healthOf(entry)
        const power = combatantPower(battle, entry)
        const name = combatantName(entry)
        const active = isCurrent(entry)

        return (
          <li
            key={entry.position}
            className={clsx('br-status-row', active && 'br-status-row--active')}
          >
            <p className="br-status-name">
              <span className="min-w-0 truncate">{name}</span>
              {active && (
                <BattlePixelIcon icon="target" size="sm" className="h-3.5 w-auto shrink-0" />
              )}
            </p>
            {health !== undefined && <HealthBar name={name} health={health} />}
            {power !== null && <PowerMeter power={power} heroName={name} />}
          </li>
        )
      })}
    </ul>
  )
}
