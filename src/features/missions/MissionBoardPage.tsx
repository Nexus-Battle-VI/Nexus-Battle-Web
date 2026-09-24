import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { useSession } from '@/shared/session'
import { queryKeys } from '@/shared/query-keys'

import { fetchMissionBoard, type MissionCategory, type PlayerMissionStatus } from './missionApi'
import { categoryLabel, durationLabel, missionStatusLabel } from './missionPresentation'

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

  return (
    <section aria-label="Misiones" className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Misiones</h1>
        <p className="text-sm text-muted">
          Elige una misión y revisa sus objetivos antes de iniciar.
        </p>
        <Link
          to="/missions/history"
          className="mt-2 inline-block text-sm text-brand hover:underline"
        >
          Ver mi historial
        </Link>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Categoría
          <select
            value={category ?? ''}
            onChange={(event) => {
              setCategory((event.target.value || null) as MissionCategory | null)
            }}
            className="rounded-md border border-border bg-surface px-3 py-2"
          >
            <option value="">Todas</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {categoryLabel[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink">
          Estado
          <select
            value={status ?? ''}
            onChange={(event) => {
              setStatus((event.target.value || null) as PlayerMissionStatus | null)
            }}
            className="rounded-md border border-border bg-surface px-3 py-2"
          >
            <option value="">Todos</option>
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
          Actualizar
        </Button>
      </div>

      <QueryState
        isLoading={board.isPending}
        error={board.error}
        isEmpty={items.length === 0}
        emptyMessage="No hay misiones para estos filtros."
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((mission) => (
            <li key={mission.missionId}>
              <Card title={mission.name} className="h-full">
                <div className="flex flex-col gap-3 text-sm">
                  <p className="text-muted">{mission.summary}</p>
                  <p className="text-ink">
                    {categoryLabel[mission.category]} · {missionStatusLabel[mission.playerStatus]} ·{' '}
                    {durationLabel(mission.estimatedDuration)}
                  </p>
                  {mission.recommendedPower !== null && (
                    <p className="text-muted">Poder recomendado: {mission.recommendedPower}</p>
                  )}
                  {mission.highlightedRewards.length > 0 && (
                    <p className="text-muted">
                      Recompensas:{' '}
                      {mission.highlightedRewards.map((reward) => reward.label).join(', ')}
                    </p>
                  )}
                  {mission.lockReason !== null && <p className="text-ink">{mission.lockReason}</p>}
                  {mission.activeEnrollmentId !== null && (
                    <p className="text-muted">Matrícula activa: {mission.activeEnrollmentId}</p>
                  )}
                  <Link
                    to={`/missions/${encodeURIComponent(mission.missionId)}`}
                    className="w-fit rounded-md text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    Ver detalle de {mission.name}
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
