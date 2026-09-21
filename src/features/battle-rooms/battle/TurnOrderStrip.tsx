import { useId } from 'react'
import clsx from 'clsx'

import { combatantName } from './presentation'
import type { BattleView, TurnOrderEntry } from './types'

export interface TurnOrderStripProps {
  readonly battle: BattleView
  readonly isSelf: (entry: TurnOrderEntry) => boolean
  readonly isCurrent: (entry: TurnOrderEntry) => boolean
}

/**
 * Orden de turnos en una franja compacta: `1 Bruno · Actual → 2 Ana (tú)`. Es informacion
 * SECUNDARIA (fija durante toda la batalla): se renderiza `battle.turnOrder` tal cual llega, sin
 * calcular ni reordenar nada. Con hasta seis participantes cabe en una fila en escritorio y
 * baja de linea (sin desplazamiento horizontal) en pantallas estrechas.
 */
export const TurnOrderStrip = ({
  battle,
  isSelf,
  isCurrent,
}: TurnOrderStripProps): React.JSX.Element => {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface-raised px-4 py-2.5"
    >
      <h2 id={headingId} className="text-xs font-semibold uppercase tracking-widest text-muted">
        Turnos
      </h2>
      <ol aria-label="Orden de turnos" className="flex flex-wrap items-center gap-y-2">
        {battle.turnOrder.map((entry, index) => (
          <li key={entry.position} className="flex items-center">
            {index > 0 && (
              <span aria-hidden="true" className="px-2 text-muted">
                →
              </span>
            )}
            <span
              className={clsx(
                'inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm',
                isCurrent(entry)
                  ? 'border-brand bg-brand/10 font-semibold text-ink'
                  : 'border-border text-ink',
              )}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface text-xs text-muted">
                {entry.position + 1}
              </span>
              <span className="truncate">
                {combatantName(entry)}
                {isSelf(entry) ? ' (tú)' : ''}
              </span>
              {isCurrent(entry) && (
                <span className="text-xs font-semibold uppercase tracking-wide text-ink">
                  Actual
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
