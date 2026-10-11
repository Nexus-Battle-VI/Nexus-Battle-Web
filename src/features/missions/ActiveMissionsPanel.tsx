import clsx from 'clsx'
import { Link } from 'react-router'

import { countdownLabel, useCountdown } from '@/shared/countdown'

import { MissionArt } from './art/MissionArt'
import { difficultyName } from './difficultyPresentation'
import { MissionPixelIcon } from './MissionPixelIcon'
import type { ActiveMission } from './missionPlayApi'
import { useActiveMissions } from './useActiveMissions'
import { useTranslation } from 'react-i18next'

/** La barra la llena el porcentaje que calcula Missions: aquí no se mide el tiempo. */
export const ProgressBar = ({
  percent,
  label,
  tone = 'progress',
}: {
  readonly percent: number
  readonly label: string
  readonly tone?: 'progress' | 'health'
}): React.JSX.Element => (
  <div
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={percent}
    className={clsx('msn-meter w-full', tone === 'health' && 'msn-meter--health')}
  >
    <div
      className="motion-safe:transition-[width] motion-safe:duration-700"
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
  const { t } = useTranslation()
  const timeText =
    remaining === null
      ? t('missions:panel.confirmingReservation')
      : remaining > 0
        ? t('missions:panel.endsIn', { time: countdownLabel(remaining) })
        : t('missions:panel.finishingUp')

  return (
    <li className="msn-card">
      <div className="msn-scene h-20">
        <MissionArt imageRef={mission.imageRef} category={mission.category} className="h-full" />
      </div>
      <div className="flex flex-col gap-2 p-3 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="msn-section-title">{mission.missionName}</p>
          <p className="msn-badge msn-badge--gold">{difficultyName(mission.difficulty)}</p>
        </div>
        {mission.heroName !== null && (
          <p className="flex items-center gap-1.5 text-muted">
            <MissionPixelIcon icon="hero" size="sm" />
            {t('missions:panel.hero', { name: mission.heroName })}
          </p>
        )}
        <ProgressBar
          percent={mission.progressPercent}
          label={t('missions:panel.progressOf', { mission: mission.missionName })}
        />
        <p className="flex items-center gap-1.5 text-ink">
          <MissionPixelIcon icon="timer" size="sm" />
          <span role="timer" aria-live="off" className="tabular-nums">
            {timeText}
          </span>
        </p>
        <Link
          to={`/missions/progress/${encodeURIComponent(mission.enrollmentId)}`}
          className="msn-btn-link msn-btn-primary w-fit"
        >
          {t('missions:panel.follow')}
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
  const { t } = useTranslation()
  const items = active.data?.items ?? []
  if (items.length === 0) return null

  return (
    <section aria-labelledby="misiones-en-curso" className="flex flex-col gap-3">
      <h2 id="misiones-en-curso" className="msn-section-title text-xl">
        {t('missions:panel.title')}
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
