import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { useSession } from '@/shared/session'
import { queryKeys } from '@/shared/query-keys'

import { ActiveMissionsPanel } from './ActiveMissionsPanel'
import { MissionArt } from './art/MissionArt'
import { fetchMissionBoard, type MissionCategory, type PlayerMissionStatus } from './missionApi'
import { categoryLabel, durationLabel, missionStatusLabel } from './missionPresentation'
import { useTranslation } from 'react-i18next'

const CATEGORIES: readonly MissionCategory[] = ['STORY', 'CHALLENGE', 'EXPLORATION']
const STATUSES: readonly PlayerMissionStatus[] = [
  'AVAILABLE',
  'LOCKED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'ABANDONED',
]

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
    <section aria-label={t('missions:board.title')} className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">{t('missions:board.title')}</h1>
        <p className="text-sm text-muted">{t('missions:board.subtitle')}</p>
        <Link
          to="/missions/history"
          className="mt-2 inline-block text-sm text-brand hover:underline"
        >
          {t('missions:board.viewHistory')}
        </Link>
      </header>

      <ActiveMissionsPanel />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink">
          {t('missions:board.category')}
          <select
            value={category ?? ''}
            onChange={(event) => {
              setCategory((event.target.value || null) as MissionCategory | null)
            }}
            className="rounded-md border border-border bg-surface px-3 py-2"
          >
            <option value="">{t('missions:board.all')}</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {categoryLabel[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink">
          {t('missions:board.status')}
          <select
            value={status ?? ''}
            onChange={(event) => {
              setStatus((event.target.value || null) as PlayerMissionStatus | null)
            }}
            className="rounded-md border border-border bg-surface px-3 py-2"
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
          variant="secondary"
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
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((mission) => (
            <li key={mission.missionId}>
              <Card title={mission.name} className="h-full">
                <MissionArt
                  imageRef={mission.imageRef}
                  category={mission.category}
                  className="mb-3 h-24 rounded-md"
                />
                <div className="flex flex-col gap-3 text-sm">
                  <p className="text-muted">{mission.summary}</p>
                  <p className="text-ink">
                    {categoryLabel[mission.category]} · {missionStatusLabel[mission.playerStatus]} ·{' '}
                    {durationLabel(mission.estimatedDuration)}
                  </p>
                  {mission.recommendedPower !== null && (
                    <p className="text-muted">
                      {t('missions:board.recommendedPower', { power: mission.recommendedPower })}
                    </p>
                  )}
                  {mission.highlightedRewards.length > 0 && (
                    <p className="text-muted">
                      {t('missions:board.rewards', {
                        list: mission.highlightedRewards.map((reward) => reward.label).join(', '),
                      })}
                    </p>
                  )}
                  {mission.lockReason !== null && <p className="text-ink">{mission.lockReason}</p>}
                  {mission.activeEnrollmentId !== null && (
                    <Link
                      to={`/missions/progress/${encodeURIComponent(mission.activeEnrollmentId)}`}
                      className="w-fit font-medium text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      {t('missions:board.followActive')}
                    </Link>
                  )}
                  <Link
                    to={`/missions/${encodeURIComponent(mission.missionId)}`}
                    className="w-fit rounded-md text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {t('missions:board.viewDetail', { mission: mission.name })}
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </QueryState>
    </section>
  )
}
