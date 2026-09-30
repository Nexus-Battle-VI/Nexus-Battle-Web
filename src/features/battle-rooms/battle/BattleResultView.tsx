import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { localizedMessages } from '@/shared/i18n/messages'

import '../battle-rooms.css'
import { BattlePixelIcon } from '../BattlePixelIcon'
import {
  describeResult,
  participantOutcomeName,
  winnerLine,
  type ResultTone,
} from './resultPresentation'
import type { BattleResult, ParticipantResult } from './types'

const TONE_CLASS: Readonly<Record<ResultTone, string>> = {
  won: 'text-success',
  lost: 'text-danger',
  'no-winner': 'text-warning',
  neutral: 'text-ink',
}

const RESULT_TEXT: Readonly<Record<ParticipantResult, string>> = localizedMessages({
  WON: 'battle:result.outcome.WON',
  LOST: 'battle:result.outcome.LOST',
  NO_WINNER: 'battle:result.outcome.NO_WINNER',
})

export interface BattleResultViewProps {
  readonly result: BattleResult
  /** Sujeto autenticado (el `sub` de la sesion); `null` si no se conoce. */
  readonly subject: string | null
}

/**
 * Vista de alto impacto del fin de partida (HU-21, §7.6 del documento oficial).
 * Muestra EXACTAMENTE lo que Combat publico: el resultado, su causa y el marcador
 * final. Web no declara ganador, no compara vidas y no entrega recompensas (D4:
 * ningun credito se muestra como concedido).
 *
 * Accesibilidad: es una `region` con nombre en el titular, el foco pasa al
 * titular al aparecer, un `role="status"` anuncia el titular UNA vez y el color
 * solo refuerza (siempre hay texto). La animacion de entrada respeta
 * `prefers-reduced-motion`.
 */
export const BattleResultView = ({ result, subject }: BattleResultViewProps): React.JSX.Element => {
  const presentation = describeResult(result, subject)
  const winners = winnerLine(result)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    headlineRef.current?.focus()
  }, [])

  return (
    <section
      aria-labelledby="battle-result-headline"
      className={clsx(
        // 5a pasada (secciones 60-64 del brief): densidad vertical reducida
        // (padding/gaps mas chicos) para caber a 1366x768/100% sin scroll --
        // el ANCHO no se toca (seccion 64), solo el alto.
        'br-result-card flex flex-col gap-2 p-3.5 sm:p-4',
        'motion-safe:transition-shadow motion-safe:duration-500',
      )}
    >
      {presentation.tone === 'won' && (
        <BattlePixelIcon icon="victory" size="md" className="mx-auto" />
      )}
      {presentation.tone === 'lost' && (
        <BattlePixelIcon icon="defeat" size="md" className="mx-auto" />
      )}
      <p role="status" className="sr-only">
        {presentation.headline}
      </p>
      <h2
        id="battle-result-headline"
        ref={headlineRef}
        tabIndex={-1}
        style={{ fontFamily: 'var(--font-game-display)' }}
        className={clsx('text-center text-2xl font-black', TONE_CLASS[presentation.tone])}
      >
        {presentation.headline}
      </h2>
      <div className="flex flex-col gap-0.5 text-center">
        <p className="text-sm text-ink">{presentation.cause}</p>
        {winners !== null && <p className="text-sm font-semibold text-ink">{winners}</p>}
        {presentation.detail !== null && (
          <p className="text-xs text-muted">{presentation.detail}</p>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-2" aria-label={t('battle:result.scoreboard')}>
        {presentation.standings.map((standing) => {
          // Ganador segun EXACTAMENTE lo que publico Combat (`winnerTeamLabel`,
          // sin comparar vidas ni recalcular nada aqui): seccion 62 del brief,
          // diferenciar mas claramente equipo ganador de equipo eliminado.
          const isWinner = result.winnerTeamLabel === standing.teamLabel

          return (
            <li
              key={standing.teamLabel}
              className={clsx(
                'br-standing flex flex-col items-center gap-0.5 rounded-lg border border-muted p-2',
                isWinner && 'br-standing--winner',
                standing.eliminated && 'br-standing--eliminated',
              )}
            >
              {isWinner && <BattlePixelIcon icon="victory" size="sm" />}
              {standing.eliminated && <BattlePixelIcon icon="defeat" size="sm" />}
              <span className="text-sm font-bold text-ink">
                {t('battle:team', { team: standing.teamLabel })}
              </span>
              <span className="text-xs tabular-nums text-muted">{standing.text}</span>
              {isWinner && (
                <span className="text-xs font-semibold" style={{ color: 'var(--br-accent)' }}>
                  {t('battle:result.winnerTeam')}
                </span>
              )}
              {standing.eliminated && (
                <span className="text-xs font-semibold text-danger">
                  {t('battle:result.eliminated')}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <ul className="flex flex-col gap-1" aria-label={t('battle:result.byParticipant')}>
        {result.participants.map((participant) => (
          <li
            key={`${participant.teamLabel}-${String(participant.seat)}`}
            className="flex items-baseline justify-between gap-2 text-sm"
          >
            <span className="text-ink">{participantOutcomeName(participant)}</span>
            <span className="text-xs font-semibold text-muted">
              {t('battle:result.participantLine', {
                team: participant.teamLabel,
                result: RESULT_TEXT[participant.result],
              })}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-center">
        <Link
          to="/play"
          className="br-btn-primary inline-flex items-center justify-center text-sm font-semibold text-ink"
        >
          {t('battle:backToPlay')}
        </Link>
      </div>
    </section>
  )
}
