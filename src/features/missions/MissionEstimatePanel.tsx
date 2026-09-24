import type { UseQueryResult } from '@tanstack/react-query'
import clsx from 'clsx'

import type { DifficultyLevel } from './api'
import { difficultyName } from './difficultyPresentation'
import type { EstimateRisk, MissionEstimate } from './missionPlayApi'
import { sentence } from './missionPresentation'

const RISK_STYLE: Readonly<Record<EstimateRisk, string>> = {
  LOW: 'bg-success/15',
  MEDIUM: 'bg-brand/15',
  HIGH: 'bg-warning/20',
  EXTREME: 'bg-danger/15',
}

export interface MissionEstimatePanelProps {
  readonly estimate: UseQueryResult<MissionEstimate>
  /** El nivel que eligió el jugador; sin él solo se muestran las habilidades. */
  readonly difficulty: DifficultyLevel | null
}

/**
 * Probabilidad de éxito ANTES de enviar al héroe (diseño «misiones jugables», P-J7):
 * perder es posible y el jugador lo sabe antes de decidir. Todo llega calculado por
 * Missions; si no hay estimación, se puede enviar al héroe igual.
 */
export const MissionEstimatePanel = ({
  estimate,
  difficulty,
}: MissionEstimatePanelProps): React.JSX.Element | null => {
  const waiting = estimate.fetchStatus === 'idle' && estimate.data === undefined
  if (difficulty === null || waiting) {
    return null
  }
  if (estimate.isPending) {
    return (
      <p role="status" className="text-sm text-muted">
        Calculando la probabilidad de éxito…
      </p>
    )
  }
  if (estimate.isError) {
    return (
      <p role="status" className="text-sm text-muted">
        {estimate.error.message}
      </p>
    )
  }

  const data = estimate.data
  return (
    <section
      aria-label="Probabilidad de éxito"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-3xl font-bold tabular-nums text-ink">{data.successPercent} %</p>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-ink">
            de éxito en {difficultyName(data.difficulty)}
          </span>
          <span
            className={clsx(
              'w-fit rounded-full px-2 py-0.5 text-xs font-medium text-ink',
              RISK_STYLE[data.risk],
            )}
          >
            {data.riskLabel}
          </span>
        </div>
      </div>
      <ul className="grid gap-1 text-sm text-ink sm:grid-cols-2">
        <li>Derrota: {data.defeatPercent} %</li>
        <li>Tiempo agotado: {data.timeoutPercent} %</li>
        <li>Vida más baja, de media: {data.averageMinHealthPercent} %</li>
        <li>Probabilidad de encontrar un Máster: {data.masterAppearancePercent} %</li>
      </ul>
      <p className="text-xs text-muted">
        Estimado con {data.runs} simulaciones de tu héroe, tu estrategia guardada y este nivel. La
        misión real tiene su propia suerte.
      </p>
    </section>
  )
}

/** Las habilidades del héroe que no sirven en misiones, con el motivo (P-J4). */
export const UnusableAbilities = ({
  estimate,
}: {
  readonly estimate: MissionEstimate | undefined
}): React.JSX.Element | null => {
  const unusable = estimate?.abilities.filter((ability) => !ability.usable) ?? []
  if (unusable.length === 0) return null
  return (
    <div role="note" className="rounded-lg border border-warning/60 bg-warning/10 p-3 text-sm">
      <p className="font-medium text-ink">Estas habilidades no funcionan en misiones:</p>
      <ul className="mt-1 list-inside list-disc text-ink">
        {unusable.map((ability) => (
          <li key={ability.abilityId}>
            {ability.name}
            {ability.reason === null ? '' : `: ${sentence(ability.reason)}`}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted">
        Si la estrategia las elige, tu héroe las salta y sigue con la siguiente acción.
      </p>
    </div>
  )
}
