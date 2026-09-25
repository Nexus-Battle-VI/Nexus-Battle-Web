import { Link } from 'react-router'

import { countdownLabel, useCountdown } from '@/shared/countdown'

import { MissionArt } from './art/MissionArt'
import { difficultyName } from './difficultyPresentation'
import type { ActiveMission } from './missionPlayApi'
import { useActiveMissions } from './useActiveMissions'

/** La barra la llena el porcentaje que calcula Missions: aquí no se mide el tiempo. */
export const ProgressBar = ({
  percent,
  label,
}: {
  readonly percent: number
  readonly label: string
}): React.JSX.Element => (
  <div
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={percent}
    className="h-2 w-full overflow-hidden rounded-full bg-border"
  >
    <div
      className="h-full rounded-full bg-brand motion-safe:transition-[width] motion-safe:duration-700"
      style={{ width: `${String(percent)}%` }}
    />
  </div>
)

const ActiveMissionRow = ({
  mission,
  receivedAt,
}: {
  readonly mission: ActiveMission
  readonly receivedAt: number
}): React.JSX.Element => {
  const remaining = useCountdown(mission.remainingSeconds, receivedAt)
  const timeText =
    remaining === null
      ? 'Confirmando la reserva del héroe…'
      : remaining > 0
        ? `Termina en ${countdownLabel(remaining)}`
        : 'Terminando: el reporte llega en unos segundos'

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <MissionArt imageRef={mission.imageRef} category={mission.category} className="h-16" />
      <div className="flex flex-col gap-2 p-3 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold text-ink">{mission.missionName}</p>
          <p className="text-muted">{difficultyName(mission.difficulty)}</p>
        </div>
        {mission.heroName !== null && <p className="text-muted">Héroe: {mission.heroName}</p>}
        <ProgressBar
          percent={mission.progressPercent}
          label={`Progreso de ${mission.missionName}`}
        />
        <p role="timer" aria-live="off" className="tabular-nums text-ink">
          {timeText}
        </p>
        <Link
          to={`/missions/progress/${encodeURIComponent(mission.enrollmentId)}`}
          className="w-fit text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
        >
          Seguir la misión
        </Link>
      </div>
    </li>
  )
}

/**
 * Panel de misiones activas (curso 7.8.9; diseño «misiones jugables», P-J6): qué
 * héroe está en qué misión, cuánto le falta y un acceso a su bitácora. Sin
 * misiones en curso no ocupa espacio.
 */
export const ActiveMissionsPanel = (): React.JSX.Element | null => {
  const active = useActiveMissions()
  const items = active.data?.items ?? []
  if (items.length === 0) return null

  return (
    <section aria-labelledby="misiones-en-curso" className="flex flex-col gap-3">
      <h2 id="misiones-en-curso" className="text-lg font-semibold text-ink">
        Misiones en curso
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((mission) => (
          <ActiveMissionRow
            key={mission.enrollmentId}
            mission={mission}
            receivedAt={active.dataUpdatedAt}
          />
        ))}
      </ul>
    </section>
  )
}
