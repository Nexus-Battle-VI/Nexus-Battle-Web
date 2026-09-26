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

import { formatDateTime } from '@/lib/format'
import { newIdempotencyKey } from '@/lib/idempotency'
import type { DifficultyLevel } from './api'
import { MissionArt } from './art/MissionArt'
import { MissionDifficultyPicker } from './MissionDifficultyPicker'
import { MissionEstimatePanel, UnusableAbilities } from './MissionEstimatePanel'
import { useMissionEstimate } from './useMissionEstimate'
import { MissionStrategyEditor } from './MissionStrategyEditor'
import { useMissionDifficulties } from './useMissionDifficulties'
import {
  enrollInMission,
  fetchMissionDetail,
  type EnrollmentAttempt,
  type MissionDetail,
} from './missionApi'
import {
  categoryLabel,
  durationLabel,
  heroTypeLabel,
  masterChanceLabel,
  missionStatusLabel,
  probabilityLabel,
  statLabel,
} from './missionPresentation'
import { useTranslation } from 'react-i18next'

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

const RewardList = ({
  title,
  items,
}: {
  readonly title: string
  readonly items: readonly { readonly label: string }[]
}): React.JSX.Element | null =>
  items.length === 0 ? null : (
    <p className="text-sm text-ink">
      <span className="font-medium">{title}:</span> {items.map((item) => item.label).join(', ')}
    </p>
  )

/** Solo lo que se entrega de verdad (P-J2): experiencia, botín del jefe y épicas. */
const RewardsCard = ({ detail }: { readonly detail: MissionDetail }): React.JSX.Element => {
  const { t } = useTranslation()
  const epics = detail.masterEncounter.candidates.flatMap((candidate) =>
    candidate.epic === null ? [] : [{ master: candidate.name, epic: candidate.epic.name }],
  )
  const nothing =
    detail.rewards.experience !== true &&
    detail.rewards.potential.length === 0 &&
    epics.length === 0
  return (
    <Card title={t('missions:detail.rewardsTitle')}>
      <div className="flex flex-col gap-3 text-sm text-ink">
        {detail.rewards.experience === true && <p>{t('missions:detail.rewardsExperience')}</p>}
        {detail.rewards.potential.length > 0 && (
          <div>
            <h3 className="font-medium">{t('missions:detail.bossLoot')}</h3>
            <ul className="mt-1 list-inside list-disc">
              {detail.rewards.potential.map((reward) => (
                <li key={reward.label}>
                  {reward.label} · {probabilityLabel(reward.probability)}
                  {reward.rolls > 1
                    ? t('missions:detail.rollsSuffix', { count: String(reward.rolls) })
                    : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
        {epics.length > 0 && (
          <div>
            <h3 className="font-medium">{t('missions:detail.masterEpics')}</h3>
            <ul className="mt-1 list-inside list-disc">
              {epics.map((item) => (
                <li key={item.master}>
                  {t('missions:detail.epicMaster', { epic: item.epic, master: item.master })}
                </li>
              ))}
            </ul>
          </div>
        )}
        <RewardList title={t('missions:detail.guaranteed')} items={detail.rewards.guaranteed} />
        <RewardList
          title={t('missions:detail.objectiveBonuses')}
          items={detail.rewards.objectiveBonuses}
        />
        <RewardList title={t('missions:detail.firstTime')} items={detail.rewards.firstTime} />
        {nothing && <p className="text-muted">{t('missions:detail.noRewardsYet')}</p>}
      </div>
    </Card>
  )
}

const MissionDetailContent = ({ missionId }: { readonly missionId: string }): React.JSX.Element => {
  const { t } = useTranslation()
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
  const estimate = useMissionEstimate({
    missionId,
    heroId: selectedHero === undefined ? null : heroId,
    difficulty,
    strategyVersion,
    ready: strategyReady,
  })
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
        : { missionId, heroId, difficulty, strategyVersion, idempotencyKey: newIdempotencyKey() }
    attemptRef.current = attempt
    enrollment.mutate(attempt)
  }

  const prerequisites =
    detail?.prerequisiteMissions ??
    detail?.prerequisites.map((prerequisite) => ({
      missionId: prerequisite,
      name: prerequisite,
    })) ??
    []

  return (
    <section aria-label={t('missions:detail.label')} className="flex flex-col gap-6">
      <Link to="/missions" className="w-fit text-sm text-brand hover:underline">
        {t('missions:detail.backToBoard')}
      </Link>
      <QueryState isLoading={mission.isPending} error={mission.error}>
        {detail !== undefined && (
          <>
            <header className="flex flex-col gap-3">
              <MissionArt
                imageRef={detail.imageRef ?? null}
                category={detail.category}
                className="h-40 rounded-lg"
              />
              <div>
                <p className="text-sm text-muted">{categoryLabel[detail.category]}</p>
                <h1 className="text-2xl font-semibold text-ink">{detail.name}</h1>
                <p className="mt-2 text-sm text-muted">{detail.narrative}</p>
                <p className="mt-2 text-sm text-ink">
                  {t('missions:detail.statusDuration', {
                    status: missionStatusLabel[detail.playerStatus],
                    duration: durationLabel(detail.estimatedDuration),
                  })}
                  {detail.recommendedPower === null
                    ? ''
                    : t('missions:detail.recommendedPowerSuffix', {
                        power: String(detail.recommendedPower),
                      })}
                </p>
              </div>
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title={t('missions:detail.objectivesTitle')}>
                <ul className="list-inside list-disc space-y-2 text-sm text-ink">
                  {detail.objectives.map((objective) => (
                    <li key={objective.id}>
                      {objective.text}{' '}
                      {objective.primary
                        ? t('missions:detail.primary')
                        : t('missions:detail.secondary')}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title={t('missions:detail.encountersTitle')}>
                <ul className="list-inside list-disc space-y-2 text-sm text-ink">
                  {detail.enemies.map((enemy) => (
                    <li key={enemy.name}>
                      {enemy.name} × {enemy.count}
                      {enemy.description === null ? '' : ` — ${enemy.description}`}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm font-medium text-ink">
                  {t('missions:detail.finalBoss', { name: detail.finalBoss.name })}
                </p>
                {detail.finalBoss.description !== null && (
                  <p className="text-sm text-muted">{detail.finalBoss.description}</p>
                )}
                {detail.finalBoss.heroType !== null && (
                  <p className="text-sm text-muted">
                    {t('missions:detail.type', { type: heroTypeLabel(detail.finalBoss.heroType) })}
                  </p>
                )}
                {Object.entries(detail.finalBoss.stats).length > 0 && (
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 text-sm text-muted">
                    {Object.entries(detail.finalBoss.stats).map(([name, value]) => (
                      <div key={name} className="flex justify-between gap-2">
                        <dt>{statLabel(name)}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {detail.masterEncounter.candidates.length > 0 && (
                  <div className="mt-3 text-sm text-ink">
                    <h3 className="font-medium">{t('missions:detail.possibleMasters')}</h3>
                    <p className="text-muted">
                      {t('missions:detail.masterChanceIntro', {
                        percent: probabilityLabel(detail.masterEncounter.probability),
                      })}
                    </p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {detail.masterEncounter.candidates.map((candidate) => (
                        <li key={`${candidate.name}-${candidate.heroType}`}>
                          <p className="font-medium">
                            {candidate.name} · {heroTypeLabel(candidate.heroType)}
                          </p>
                          <p className="text-muted">
                            {masterChanceLabel(candidate.probabilityByHeroType)}
                          </p>
                          {candidate.epic === null ? (
                            <p className="text-muted">{t('missions:detail.epicNotDeliverable')}</p>
                          ) : (
                            <p className="text-muted">
                              {t('missions:detail.epicLine', { name: candidate.epic.name })}
                              {candidate.epic.generalEffect === null
                                ? ''
                                : ` · ${candidate.epic.generalEffect}`}
                              {candidate.epic.epicEffect === null
                                ? ''
                                : ` · ${candidate.epic.epicEffect}`}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
              <RewardsCard detail={detail} />
              <Card title={t('missions:detail.requirementsTitle')}>
                {prerequisites.length === 0 ? (
                  <p className="text-sm text-muted">{t('missions:detail.noPrerequisites')}</p>
                ) : (
                  <ul className="list-inside list-disc text-sm text-ink">
                    {prerequisites.map((prerequisite) => (
                      <li key={prerequisite.missionId}>{prerequisite.name}</li>
                    ))}
                  </ul>
                )}
                {detail.lockReason !== null && (
                  <p className="mt-3 text-sm text-ink">{detail.lockReason}</p>
                )}
              </Card>
            </div>

            <Card
              title={t('missions:detail.startTitle')}
              description={t('missions:detail.startDescription')}
            >
              <div className="flex flex-col gap-5">
                <QueryState
                  isLoading={heroes.isPending}
                  error={heroes.error}
                  isEmpty={heroList.length === 0}
                  emptyMessage={t('missions:detail.noHeroesAvailable')}
                >
                  <label className="flex max-w-md flex-col gap-1 text-sm text-ink">
                    {t('missions:detail.heroLabel')}
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
                      <option value="">{t('missions:detail.chooseHero')}</option>
                      {heroList.map((hero) => (
                        <option key={hero.heroId} value={hero.heroId}>
                          {hero.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </QueryState>
                {selectedHero !== undefined && (
                  <>
                    <MissionStrategyEditor
                      key={selectedHero.heroId}
                      missionId={missionId}
                      hero={selectedHero}
                      onVersionChange={handleStrategyVersionChange}
                      abilityChecks={estimate.data?.abilities}
                    />
                    <UnusableAbilities estimate={estimate.data} />
                  </>
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
                {selectedHero !== undefined && (
                  <MissionEstimatePanel estimate={estimate} difficulty={difficulty} />
                )}
                {enrollment.error !== null && (
                  <p role="alert" className="text-sm text-danger">
                    {enrollment.error.message}
                  </p>
                )}
                {enrollment.data !== undefined && (
                  <div role="status" className="flex flex-col gap-1 text-sm text-ink">
                    <p className="font-semibold">{t('missions:detail.started')}</p>
                    {enrollment.data.endsAt !== null && (
                      <p>
                        {t('missions:detail.endsAt', {
                          date: formatDateTime(enrollment.data.endsAt),
                        })}
                      </p>
                    )}
                    <Link
                      to={`/missions/progress/${encodeURIComponent(enrollment.data.enrollmentId)}`}
                      className="w-fit font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      {t('missions:detail.follow')}
                    </Link>
                  </div>
                )}
                <Button disabled={!canSubmit} loading={enrollment.isPending} onClick={submit}>
                  {enrollment.isError
                    ? t('missions:detail.retryEnroll')
                    : t('missions:detail.startButton')}
                </Button>
              </div>
            </Card>
          </>
        )}
      </QueryState>
    </section>
  )
}

export const MissionDetailPage = (): React.JSX.Element => {
  const { missionId } = useParams()
  const { t } = useTranslation()
  if (missionId === undefined) {
    return <p role="alert">{t('missions:detail.missingId')}</p>
  }
  return <MissionDetailContent key={missionId} missionId={missionId} />
}
