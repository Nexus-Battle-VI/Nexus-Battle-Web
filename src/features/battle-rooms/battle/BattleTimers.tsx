import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

import {
  formatRemaining,
  monotonicNow as readMonotonicNow,
  remainingMs,
  timeWarning,
  type ServerClock,
} from './battleClock'
import type { BattleView } from './types'

/** Cadencia del unico temporizador de visualizacion (250 ms). */
const TICK_MS = 250

export interface BattleTimersProps {
  readonly battle: BattleView
  readonly serverClock: ServerClock
  readonly isMyTurn: boolean
  /** Solo se muestran con la batalla sincronizada: un tiempo viejo enganaria. */
  readonly synced: boolean
  /** Reloj monotono inyectable para las pruebas; por defecto `performance.now()`. */
  readonly monotonicNow?: () => number
}

const WARNING_CLASS: Readonly<Record<'none' | 'low' | 'critical', string>> = {
  none: 'text-ink',
  low: 'text-warning',
  critical: 'text-danger',
}

const nameOf = (battle: BattleView): string =>
  battle.currentTurn.displayName ?? `Asiento ${String(battle.currentTurn.seat + 1)}`

/**
 * Temporizadores de la batalla (HU-21, contrato §6.4): SOLO visualizacion.
 * Llegar a 0:00 no hace nada; Combat publica `turnTimedOut` o `battleFinished`.
 *
 * Accesibilidad: cada contador es un `role="timer"` con `aria-live="off"` (no se
 * lee cada segundo) y el digito que cambia va `aria-hidden`; una region `polite`
 * aparte anuncia SOLO los umbrales (10 s y 5 s del turno; 1 min y 10 s de la
 * batalla). El color refuerza el aviso, nunca lo sustituye. Bajo
 * `prefers-reduced-motion` no hay pulso (`motion-safe:`).
 */
export const BattleTimers = ({
  battle,
  serverClock,
  isMyTurn,
  synced,
  monotonicNow = readMonotonicNow,
}: BattleTimersProps): React.JSX.Element | null => {
  const [now, setNow] = useState(() => monotonicNow())
  const announced = useRef({
    turnLow: false,
    turnCritical: false,
    battleLow: false,
    battleCritical: false,
  })
  const [announcement, setAnnouncement] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(monotonicNow())
    }, TICK_MS)

    return () => {
      clearInterval(timer)
    }
  }, [monotonicNow])

  const deadlines = battle.deadlines
  const turnRemaining =
    deadlines === undefined ? 0 : remainingMs(deadlines.turnEndsAt, serverClock, now)
  const battleRemaining =
    deadlines === undefined ? 0 : remainingMs(deadlines.battleEndsAt, serverClock, now)

  useEffect(() => {
    if (!synced || deadlines === undefined) {
      return
    }

    const flags = announced.current

    if (turnRemaining <= 10_000 && !flags.turnLow) {
      flags.turnLow = true
      setAnnouncement(isMyTurn ? 'Quedan 10 segundos de tu turno' : 'Quedan 10 segundos del turno')
    } else if (turnRemaining <= 5_000 && !flags.turnCritical) {
      flags.turnCritical = true
      setAnnouncement(isMyTurn ? 'Quedan 5 segundos de tu turno' : 'Quedan 5 segundos del turno')
    } else if (battleRemaining <= 60_000 && !flags.battleLow) {
      flags.battleLow = true
      setAnnouncement('Queda 1 minuto de batalla')
    } else if (battleRemaining <= 10_000 && !flags.battleCritical) {
      flags.battleCritical = true
      setAnnouncement('Quedan 10 segundos de batalla')
    }
  }, [synced, deadlines, turnRemaining, battleRemaining, isMyTurn])

  if (deadlines === undefined || !synced) {
    return null
  }

  const turnTone = timeWarning(turnRemaining)
  const battleTone = timeWarning(battleRemaining)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      <p
        role="timer"
        aria-live="off"
        aria-label={isMyTurn ? 'Tiempo de tu turno' : `Tiempo del turno de ${nameOf(battle)}`}
        className={clsx('font-semibold tabular-nums', WARNING_CLASS[turnTone])}
      >
        <span aria-hidden="true">
          {isMyTurn ? 'Tu turno' : `Turno de ${nameOf(battle)}`}: {formatRemaining(turnRemaining)}
        </span>
      </p>
      <p
        role="timer"
        aria-live="off"
        aria-label="Tiempo de batalla"
        className={clsx('tabular-nums', WARNING_CLASS[battleTone])}
      >
        <span aria-hidden="true">Tiempo de batalla: {formatRemaining(battleRemaining)}</span>
      </p>
      {turnRemaining === 0 && <p className="text-muted">Esperando a Combat…</p>}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
