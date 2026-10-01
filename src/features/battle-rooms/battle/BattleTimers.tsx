import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { BattlePixelIcon } from '../BattlePixelIcon'
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
    // 5a pasada (secciones 32-36 del brief): el chip izquierdo dice SIEMPRE
    // "TURNO" (nunca el nombre -- "Turno de Bruno" ya esta arriba, en
    // "Nexus · Arena", evita repetir el nombre dos veces). El derecho dice
    // "BATALLA" (corto, para no truncar "Tiempo de batalla..."). Ambos
    // `aria-label` (accesibles, no visibles) SI siguen diciendo de quien es
    // el turno -- ese dato no se pierde, solo deja de repetirse visualmente.
    <div className="br-timers-block">
      <div className="br-timers-strip">
        <p
          role="timer"
          aria-live="off"
          aria-label={
            isMyTurn
              ? t('battle:timers.turnYours')
              : t('battle:timers.turnOf', { name: nameOf(battle) })
          }
          className={clsx('br-timer-chip br-timer-chip--turn', WARNING_CLASS[turnTone])}
        >
          <span aria-hidden="true" className="br-timer-chip-label">
            {t('battle:timers.turnShortLabel')}
          </span>
          <span aria-hidden="true" className="br-timer-chip-value tabular-nums">
            {formatRemaining(turnRemaining)}
          </span>
        </p>
        <BattlePixelIcon icon="timer" size="sm" className="br-timer-icon" />
        <p
          role="timer"
          aria-live="off"
          aria-label={t('battle:timers.battle')}
          className={clsx('br-timer-chip br-timer-chip--battle', WARNING_CLASS[battleTone])}
        >
          <span aria-hidden="true" className="br-timer-chip-label">
            {t('battle:timers.battleShortLabel')}
          </span>
          <span aria-hidden="true" className="br-timer-chip-value tabular-nums">
            {formatRemaining(battleRemaining)}
          </span>
        </p>
      </div>
      {/* Linea propia, centrada, SOLO cuando el estado realmente lo pide --
          nunca un hueco fantasma reservado dentro de la fila de chips
          (seccion 35-36 del brief). */}
      {turnRemaining === 0 && (
        <p className="br-timer-waiting text-muted">{t('battle:timers.waitingCombat')}</p>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
