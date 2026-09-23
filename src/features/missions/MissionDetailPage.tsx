import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { fetchAvailableHeroes } from '@/features/player-inventory/heroSelectionApi'
import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'
import { queryKeys } from '@/shared/query-keys'

import type { DifficultyLevel } from './api'
import { MissionDifficultyPicker } from './MissionDifficultyPicker'
import { MissionStrategyEditor } from './MissionStrategyEditor'
import { useMissionDifficulties } from './useMissionDifficulties'
import { enrollInMission, fetchMissionDetail, type EnrollmentAttempt } from './missionApi'
import { categoryLabel, durationLabel, missionStatusLabel } from './missionPresentation'

const isExpiredAttempt = (error: unknown): boolean =>
  error instanceof HttpError &&
  typeof error.body === 'object' &&
  error.body !== null &&
  'code' in error.body &&
  error.body.code === 'ENROLLMENT_EXPIRED'

const isStrategyMismatch = (error: unknown): boolean =>
  error instanceof HttpError &&
  error.status === 409 &&
  typeof error.body === 'object' &&
  error.body !== null &&
  'code' in error.body &&
  error.body.code === 'STRATEGY_VERSION_MISMATCH'

const MissionDetailContent = ({ missionId }: { readonly missionId: string }): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  const queryClient = useQueryClient()
  const [heroId, setHeroId] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null)
  const [strategyVersion, setStrategyVersion] = useState<number | null>(null)
  const [strategyReady, setStrategyReady] = useState(false)
  const attemptRef = useRef<EnrollmentAttempt | null>(null)
  const handleStrategyVersionChange = useCallback(
    (version: number | null, ready: boolean): void => {
      setStrategyVersion(version)
      setStrategyReady(ready)
      attemptRef.current = null
    },
    [],
  )
  const mission = useQuery({
    queryKey: queryKeys.missions.detail(subject, missionId),
    queryFn: ({ signal }) => fetchMissionDetail(missionId, signal),
    enabled: subject !== null,
  })
  const heroes = useQuery({
    queryKey: queryKeys.missions.availableHeroes(subject),
    queryFn: ({ signal }) => fetchAvailableHeroes(signal),
    enabled: subject !== null,
  })
  const difficulties = useMissionDifficulties(missionId)
  const enrollment = useMutation({
    mutationFn: enrollInMission,
    onSuccess: () => {
      attemptRef.current = null
      void queryClient.invalidateQueries({ queryKey: ['missions'] })
    },
    onError: (error) => {
      if (isExpiredAttempt(error)) attemptRef.current = null
      if (isStrategyMismatch(error)) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.missions.strategy(subject, missionId, heroId),
        })
      }
      void queryClient.invalidateQueries({ queryKey: ['missions', 'board'] })
    },
  })

  const detail = mission.data
  const heroList = heroes.data ?? []
  const selectedHero = heroList.find((hero) => hero.heroId === heroId)
  const difficultyAllowed =
    difficulty !== null &&
    !difficulties.isError &&
    difficulties.data?.items.some((item) => item.difficulty === difficulty && item.unlocked) ===
      true
  const canSubmit =
    detail?.canEnroll === true &&
    selectedHero !== undefined &&
    strategyReady &&
    difficultyAllowed &&
    !enrollment.isPending &&
    enrollment.data === undefined

  const submit = (): void => {
    if (!canSubmit) return
    const previous = attemptRef.current
    const attempt: EnrollmentAttempt =
      previous?.missionId === missionId &&
      previous.heroId === heroId &&
      previous.difficulty === difficulty &&
      previous.strategyVersion === strategyVersion
        ? previous
        : { missionId, heroId, difficulty, strategyVersion, idempotencyKey: crypto.randomUUID() }
    attemptRef.current = attempt
    enrollment.mutate(attempt)
  }

  return (
    <section aria-label="Detalle de misión" className="flex flex-col gap-6">
      <Link to="/missions" className="w-fit text-sm text-brand hover:underline">
        ← Volver al tablón
      </Link>
      <QueryState isLoading={mission.isPending} error={mission.error}>
        {detail !== undefined && (
          <>
            <header>
              <p className="text-sm text-muted">{categoryLabel[detail.category]}</p>
              <h1 className="text-2xl font-semibold text-ink">{detail.name}</h1>
              <p className="mt-2 text-sm text-muted">{detail.narrative}</p>
              <p className="mt-2 text-sm text-ink">
                {missionStatusLabel[detail.playerStatus]} · Duración estimada:{' '}
                {durationLabel(detail.estimatedDuration)}
                {detail.recommendedPower === null
                  ? ''
                  : ` · Poder recomendado: ${String(detail.recommendedPower)}`}
              </p>
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Objetivos">
                <ul className="list-inside list-disc space-y-2 text-sm text-ink">
                  {detail.objectives.map((objective) => (
                    <li key={objective.id}>
                      {objective.text} {objective.primary ? '(principal)' : '(secundario)'}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="Encuentros">
                <ul className="list-inside list-disc space-y-2 text-sm text-ink">
                  {detail.enemies.map((enemy) => (
                    <li key={enemy.name}>
                      {enemy.name} × {enemy.count}
                      {enemy.description === null ? '' : ` — ${enemy.description}`}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm font-medium text-ink">
                  Jefe final: {detail.finalBoss.name}
                </p>
                {detail.finalBoss.description !== null && (
                  <p className="text-sm text-muted">{detail.finalBoss.description}</p>
                )}
                {detail.finalBoss.heroType !== null && (
                  <p className="text-sm text-muted">Tipo: {detail.finalBoss.heroType}</p>
                )}
                {Object.entries(detail.finalBoss.stats).length > 0 && (
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 text-sm text-muted">
                    {Object.entries(detail.finalBoss.stats).map(([name, value]) => (
                      <div key={name} className="flex justify-between gap-2">
                        <dt>{name}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {detail.masterEncounter.candidates.length > 0 && (
                  <div className="mt-3 text-sm text-ink">
                    <h3 className="font-medium">Encuentro con Máster</h3>
                    <p className="text-muted">
                      Probabilidad máxima configurada:{' '}
                      {new Intl.NumberFormat('es-CO', {
                        style: 'percent',
                        maximumFractionDigits: 1,
                      }).format(detail.masterEncounter.probability)}
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {detail.masterEncounter.candidates.map((candidate) => (
                        <li key={`${candidate.name}-${candidate.heroType}`}>
                          {candidate.name} ({candidate.heroType}) · Épico: {candidate.epic.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
              <Card title="Recompensas">
                <RewardList title="Garantizadas" items={detail.rewards.guaranteed} />
                <RewardList title="Posibles" items={detail.rewards.potential} />
                <RewardList title="Por objetivos" items={detail.rewards.objectiveBonuses} />
                <RewardList title="Primera vez" items={detail.rewards.firstTime} />
              </Card>
              <Card title="Requisitos">
                {detail.prerequisites.length === 0 ? (
                  <p className="text-sm text-muted">Sin misiones previas.</p>
                ) : (
                  <ul className="list-inside list-disc text-sm text-ink">
                    {detail.prerequisites.map((prerequisite) => (
                      <li key={prerequisite}>{prerequisite}</li>
                    ))}
                  </ul>
                )}
                {detail.lockReason !== null && (
                  <p className="mt-3 text-sm text-ink">{detail.lockReason}</p>
                )}
              </Card>
            </div>

            <Card
              title="Iniciar misión"
              description="El servicio validará el héroe, su equipamiento y el nivel elegido."
            >
              <div className="flex flex-col gap-5">
                <QueryState
                  isLoading={heroes.isPending}
                  error={heroes.error}
                  isEmpty={heroList.length === 0}
                  emptyMessage="Aún no tienes héroes disponibles en tu inventario."
                >
                  <label className="flex max-w-md flex-col gap-1 text-sm text-ink">
                    Héroe
                    <select
                      value={heroId}
                      onChange={(event) => {
                        setHeroId(event.target.value)
                        setStrategyVersion(null)
                        setStrategyReady(false)
                        attemptRef.current = null
                        enrollment.reset()
                      }}
                      className="rounded-md border border-border bg-surface px-3 py-2"
                    >
                      <option value="">Elige un héroe</option>
                      {heroList.map((hero) => (
                        <option key={hero.heroId} value={hero.heroId}>
                          {hero.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </QueryState>
                {selectedHero !== undefined && (
                  <MissionStrategyEditor
                    key={selectedHero.heroId}
                    missionId={missionId}
                    hero={selectedHero}
                    onVersionChange={handleStrategyVersionChange}
                  />
                )}
                <MissionDifficultyPicker
                  missionId={missionId}
                  value={difficulty}
                  onChange={(value) => {
                    setDifficulty(value)
                    attemptRef.current = null
                    enrollment.reset()
                  }}
                />
                {enrollment.error !== null && (
                  <p role="alert" className="text-sm text-danger">
                    {enrollment.error.message}
                  </p>
                )}
                {enrollment.data !== undefined && (
                  <p role="status" className="text-sm text-ink">
                    Matrícula {enrollment.data.enrollmentId} creada: {enrollment.data.status}.
                    {enrollment.data.endsAt === null
                      ? ''
                      : ` Finaliza ${new Date(enrollment.data.endsAt).toLocaleString('es-CO')}.`}
                  </p>
                )}
                <Button disabled={!canSubmit} loading={enrollment.isPending} onClick={submit}>
                  {enrollment.isError ? 'Reintentar matrícula' : 'Iniciar misión'}
                </Button>
              </div>
            </Card>
          </>
        )}
      </QueryState>
    </section>
  )
}

const RewardList = ({
  title,
  items,
}: {
  readonly title: string
  readonly items: readonly { readonly label: string }[]
}): React.JSX.Element | null =>
  items.length === 0 ? null : (
    <p className="mt-2 text-sm text-ink">
      <span className="font-medium">{title}:</span> {items.map((item) => item.label).join(', ')}
    </p>
  )

export const MissionDetailPage = (): React.JSX.Element => {
  const { missionId } = useParams()
  if (missionId === undefined) return <p role="alert">Falta el identificador de la misión.</p>
  return <MissionDetailContent key={missionId} missionId={missionId} />
}
