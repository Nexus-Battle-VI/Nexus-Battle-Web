import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { useSession } from '@/shared/session'
import { queryKeys } from '@/shared/query-keys'

import { ActiveMissionsPanel } from './ActiveMissionsPanel'
import { MissionArt } from './art/MissionArt'
import {
  fetchMissionBoard,
  type MissionCard as MissionBoardItem,
  type MissionCategory,
  type PlayerMissionStatus,
} from './missionApi'
import { MissionPixelIcon } from './MissionPixelIcon'
import { categoryLabel, durationLabel, missionStatusLabel } from './missionPresentation'
import { CATEGORY_ICON, STATUS_BADGE } from './missionsRemasterPresentation'
import './missions.css'

const CATEGORIES: readonly MissionCategory[] = ['STORY', 'CHALLENGE', 'EXPLORATION']
const STATUSES: readonly PlayerMissionStatus[] = [
  'AVAILABLE',
  'LOCKED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'ABANDONED',
]

const MissionCard = ({ mission }: { readonly mission: MissionBoardItem }): React.JSX.Element => {
  const { t } = useTranslation()
  return (
    <article
      aria-labelledby={`mision-${mission.missionId}`}
      className={clsx('msn-card', mission.playerStatus === 'LOCKED' && 'msn-card--locked')}
    >
      <div className="msn-scene h-36">
        <MissionArt imageRef={mission.imageRef} category={mission.category} className="h-full" />
        <div className="msn-card-scene-badges">
          <span className="msn-badge msn-badge--gold">
            <MissionPixelIcon icon={CATEGORY_ICON[mission.category]} size="sm" />
            {categoryLabel[mission.category]}
          </span>
          <span className={clsx('msn-badge', STATUS_BADGE[mission.playerStatus])}>
            {mission.playerStatus === 'LOCKED' && <MissionPixelIcon icon="lock" size="sm" />}
            {missionStatusLabel[mission.playerStatus]}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 text-sm">
        <h2 id={`mision-${mission.missionId}`} className="msn-card-title">
          {mission.name}
        </h2>
        <p className="text-muted">{mission.summary}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-ink">
          <li className="flex items-center gap-1.5">
            <MissionPixelIcon icon="timer" size="sm" />
            {durationLabel(mission.estimatedDuration)}
          </li>
          {mission.recommendedPower !== null && (
            <li className="flex items-center gap-1.5">
              <MissionPixelIcon icon="power" size="sm" />
              {t('missions:board.recommendedPower', { power: mission.recommendedPower })}
            </li>
          )}
        </ul>
        {mission.highlightedRewards.length > 0 && (
          <p className="flex items-start gap-1.5 text-muted">
            <MissionPixelIcon icon="chest" size="sm" />
            <span>
              {t('missions:board.rewards', {
                list: mission.highlightedRewards.map((reward) => reward.label).join(', '),
              })}
            </span>
          </p>
        )}
        {mission.lockReason !== null && (
          <p className="flex items-start gap-1.5 text-ink">
            <MissionPixelIcon icon="lock" size="sm" />
            <span>{mission.lockReason}</span>
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {mission.activeEnrollmentId !== null && (
            <Link
              to={`/missions/progress/${encodeURIComponent(mission.activeEnrollmentId)}`}
              className="msn-btn-link msn-btn-primary"
            >
              <MissionPixelIcon icon="timer" size="sm" />
              {t('missions:board.followActive')}
            </Link>
          )}
          <Link
            to={`/missions/${encodeURIComponent(mission.missionId)}`}
            className={clsx(
              'msn-btn-link',
              mission.activeEnrollmentId === null && 'msn-btn-primary',
            )}
          >
            <MissionPixelIcon icon="map" size="sm" />
            {t('missions:board.viewDetail', { mission: mission.name })}
          </Link>
        </div>
      </div>
    </article>
  )
}

export const MissionBoardPage = (): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  const [category, setCategory] = useState<MissionCategory | null>(null)
  const [status, setStatus] = useState<PlayerMissionStatus | null>(null)
  const board = useQuery({
    queryKey: queryKeys.missions.board(subject, category, status),
    queryFn: ({ signal }) => fetchMissionBoard({ category, status }, signal),
    enabled: subject !== null,
  })
  const items = board.data?.items ?? []
  const { t } = useTranslation()

  return (
    <section
      aria-label={t('missions:board.title')}
      className="msn-page msn-page--board flex flex-col gap-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="msn-eyebrow">{t('missions:remaster.boardEyebrow')}</p>
          <h1 className="msn-title">{t('missions:board.title')}</h1>
          <p className="msn-lead text-sm">{t('missions:board.subtitle')}</p>
        </div>
        <Link to="/missions/history" className="msn-btn-link">
          <MissionPixelIcon icon="history" size="sm" />
          {t('missions:board.viewHistory')}
        </Link>
      </header>

      <ActiveMissionsPanel />

      <div className="msn-panel msn-panel--strong flex flex-wrap items-end gap-4 rounded-[14px] p-4">
        <div
          role="group"
          aria-label={t('missions:board.category')}
          className="flex flex-col gap-1 text-sm"
        >
          <span aria-hidden="true" className="text-ink">
            {t('missions:board.category')}
          </span>
          <div className="msn-tabs">
            <button
              type="button"
              className="msn-tab"
              aria-pressed={category === null}
              onClick={() => {
                setCategory(null)
              }}
            >
              {t('missions:board.all')}
            </button>
            {CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                className="msn-tab"
                aria-pressed={category === value}
                onClick={() => {
                  setCategory(value)
                }}
              >
                <MissionPixelIcon icon={CATEGORY_ICON[value]} size="sm" />
                {categoryLabel[value]}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm text-ink">
          {t('missions:board.status')}
          <select
            value={status ?? ''}
            onChange={(event) => {
              setStatus((event.target.value || null) as PlayerMissionStatus | null)
            }}
            className="min-h-[38px] px-3 py-2"
          >
            <option value="">{t('missions:board.allStatuses')}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {missionStatusLabel[value]}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="missions-secondary"
          disabled={board.isFetching}
          onClick={() => void board.refetch()}
        >
          {t('missions:board.refresh')}
        </Button>
      </div>

      <QueryState
        isLoading={board.isPending}
        error={board.error}
        isEmpty={items.length === 0}
        emptyMessage={t('missions:board.noResults')}
      >
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((mission) => (
            <li key={mission.missionId}>
              <MissionCard mission={mission} />
            </li>
          ))}
        </ul>
      </QueryState>
    </section>
  )
}
