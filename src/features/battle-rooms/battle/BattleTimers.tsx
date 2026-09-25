import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import {
  formatRemaining,
  monotonicNow as readMonotonicNow,
  remainingMs,
  timeWarning,
  type ServerClock,
} from './battleClock'
import type { BattleView } from './types'
import { i18n } from '@/shared/i18n/i18n'

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
  battle.currentTurn.displayName ??
  i18n.t('battle:seat', { seat: String(battle.currentTurn.seat + 1) })

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
  const { t } = useTranslation()
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
      setAnnouncement(isMyTurn ? t('battle:timers.turn10Yours') : t('battle:timers.turn10'))
    } else if (turnRemaining <= 5_000 && !flags.turnCritical) {
      flags.turnCritical = true
      setAnnouncement(isMyTurn ? t('battle:timers.turn5Yours') : t('battle:timers.turn5'))
    } else if (battleRemaining <= 60_000 && !flags.battleLow) {
      flags.battleLow = true
      setAnnouncement(t('battle:timers.battle60'))
    } else if (battleRemaining <= 10_000 && !flags.battleCritical) {
      flags.battleCritical = true
      setAnnouncement(t('battle:timers.battle10'))
    }
  }, [synced, deadlines, turnRemaining, battleRemaining, isMyTurn, t])

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
        aria-label={
          isMyTurn
            ? t('battle:timers.turnYours')
            : t('battle:timers.turnOf', { name: nameOf(battle) })
        }
        className={clsx('font-semibold tabular-nums', WARNING_CLASS[turnTone])}
      >
        <span aria-hidden="true">
          {t('battle:timers.turnValue', {
            label: isMyTurn
              ? t('battle:turn.yours')
              : t('battle:turn.of', { name: nameOf(battle) }),
            time: formatRemaining(turnRemaining),
          })}
        </span>
      </p>
      <p
        role="timer"
        aria-live="off"
        aria-label={t('battle:timers.battle')}
        className={clsx('tabular-nums', WARNING_CLASS[battleTone])}
      >
        <span aria-hidden="true">
          {t('battle:timers.battleValue', { time: formatRemaining(battleRemaining) })}
        </span>
      </p>
      {turnRemaining === 0 && <p className="text-muted">{t('battle:timers.waitingCombat')}</p>}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
