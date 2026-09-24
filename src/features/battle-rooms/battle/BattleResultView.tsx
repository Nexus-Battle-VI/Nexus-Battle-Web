import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router'

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

const RESULT_TEXT: Readonly<Record<ParticipantResult, string>> = {
  WON: 'Ganó',
  LOST: 'Perdió',
  NO_WINNER: 'Empate',
}

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

  useEffect(() => {
    headlineRef.current?.focus()
  }, [])

  return (
    <section
      aria-labelledby="battle-result-headline"
      className={clsx(
        'flex flex-col gap-4 rounded-xl border-2 border-muted bg-surface p-5 shadow-lg',
        'motion-safe:transition-shadow motion-safe:duration-500',
      )}
    >
      <p role="status" className="sr-only">
        {presentation.headline}
      </p>
      <h2
        id="battle-result-headline"
        ref={headlineRef}
        tabIndex={-1}
        className={clsx('text-center text-3xl font-black', TONE_CLASS[presentation.tone])}
      >
        {presentation.headline}
      </h2>
      <div className="flex flex-col gap-1 text-center">
        <p className="text-sm text-ink">{presentation.cause}</p>
        {winners !== null && <p className="text-sm font-semibold text-ink">{winners}</p>}
        {presentation.detail !== null && (
          <p className="text-xs text-muted">{presentation.detail}</p>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-3" aria-label="Marcador final por equipo">
        {presentation.standings.map((standing) => (
          <li
            key={standing.teamLabel}
            className="flex flex-col items-center rounded-lg border border-muted p-3"
          >
            <span className="text-sm font-bold text-ink">Equipo {standing.teamLabel}</span>
            <span className="text-xs tabular-nums text-muted">{standing.text}</span>
            {standing.eliminated && (
              <span className="text-xs font-semibold text-danger">Eliminado</span>
            )}
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-1" aria-label="Resultado por participante">
        {result.participants.map((participant) => (
          <li
            key={`${participant.teamLabel}-${String(participant.seat)}`}
            className="flex items-baseline justify-between gap-2 text-sm"
          >
            <span className="text-ink">{participantOutcomeName(participant)}</span>
            <span className="text-xs font-semibold text-muted">
              Equipo {participant.teamLabel} · {RESULT_TEXT[participant.result]}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-center">
        <Link
          to="/play"
          className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand"
        >
          Volver a Jugar Online
        </Link>
      </div>
    </section>
  )
}
