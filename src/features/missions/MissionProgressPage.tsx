import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import {
  fetchAvailableHeroes,
  type AvailableHero,
} from '@/features/player-inventory/heroSelectionApi'
import { countdownLabel, useCallAt, useCountdown } from '@/shared/countdown'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { ProgressBar } from './ActiveMissionsPanel'
import { MissionArt } from './art/MissionArt'
import { difficultyName } from './difficultyPresentation'
import { MissionDiorama } from './diorama/MissionDiorama'
import { fetchMissionDetail } from './missionApi'
import { fetchMissionProgress, type MissionProgress, type ProgressEntry } from './missionPlayApi'
import { MissionPixelIcon } from './MissionPixelIcon'
import { progressLine } from './progressPresentation'
import { useTranslation } from 'react-i18next'
import './missions.css'

/** Una respuesta que no es una lista (servicio caido, version anterior) no rompe la escena. */
const isHeroList = (value: unknown): value is readonly AvailableHero[] => Array.isArray(value)

/** Si nada se revela antes, se vuelve a preguntar a este ritmo. */
const FALLBACK_REFRESH_MS = 30_000

const HeroHealth = ({
  hero,
}: {
  readonly hero: MissionProgress['hero']
}): React.JSX.Element | null => {
  const { t } = useTranslation()
  if (hero.maxHealth === null || hero.health === null) return null
  const name = hero.name ?? t('missions:progressPage.yourHero')
  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex justify-between text-ink">
        <span className="flex items-center gap-1.5">
          <MissionPixelIcon icon="heal" size="sm" />
          {t('missions:progressPage.heroHealth', { name })}
        </span>
        <span className="tabular-nums">
          {hero.health} / {hero.maxHealth}
        </span>
      </div>
      <ProgressBar
        percent={(hero.health * 100) / hero.maxHealth}
        label={t('missions:progressPage.heroHealth', { name })}
        tone="health"
      />
    </div>
  )
}

const Status = ({
  progress,
  receivedAt,
}: {
  readonly progress: MissionProgress
  readonly receivedAt: number
}): React.JSX.Element => {
  const { t } = useTranslation()
  const remaining = useCountdown(progress.finished ? null : progress.remainingSeconds, receivedAt)

  if (progress.finished) {
    return (
      <div role="status" className="flex flex-col gap-2 text-sm text-ink">
        <p className="font-semibold">{t('missions:progressPage.finished')}</p>
        {progress.reportAvailable ? (
          <Link
            to={`/missions/reports/${encodeURIComponent(progress.enrollmentId)}`}
            className="msn-btn-link msn-btn-primary w-fit"
          >
            <MissionPixelIcon icon="report" size="sm" />
            {t('missions:progressPage.viewReport')}
          </Link>
        ) : (
          <p className="text-muted">{t('missions:progressPage.preparingReport')}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <ProgressBar
        percent={progress.progressPercent}
        label={t('missions:progressPage.missionProgress')}
      />
      <p className="flex items-center gap-1.5 text-ink">
        <MissionPixelIcon icon="timer" size="sm" />
        <span role="timer" aria-live="off" className="tabular-nums">
          {remaining === null
            ? t('missions:panel.confirmingReservation')
            : remaining > 0
              ? t('missions:panel.endsIn', { time: countdownLabel(remaining) })
              : t('missions:panel.finishingUp')}
        </span>
      </p>
    </div>
  )
}

const ProgressContent = ({
  enrollmentId,
}: {
  readonly enrollmentId: string
}): React.JSX.Element => {
  const { t } = useTranslation()
  const subject = useSession((state) => state.subject)
  const queryClient = useQueryClient()
  const [entries, setEntries] = useState<readonly ProgressEntry[]>([])
  const lastSeq = useRef(0)
  const progress = useQuery({
    queryKey: queryKeys.missions.progress(subject, enrollmentId),
    // Solo lo revelado desde la última entrada que ya se tiene.
    queryFn: ({ signal }) => fetchMissionProgress(enrollmentId, lastSeq.current, signal),
    enabled: subject !== null,
    refetchInterval: (query) =>
      query.state.data?.finished === true && query.state.data.reportAvailable
        ? false
        : FALLBACK_REFRESH_MS,
  })

  useEffect(() => {
    const page = progress.data
    if (page === undefined) return
    const fresh = page.entries.filter((entry) => entry.seq > lastSeq.current)
    lastSeq.current = page.lastSeq
    if (fresh.length > 0) {
      setEntries((previous) => [...previous, ...fresh])
    }
    if (page.finished) {
      // Al terminar cambian el tablón y las misiones en curso.
      void queryClient.invalidateQueries({ queryKey: ['missions', 'active'] })
      void queryClient.invalidateQueries({ queryKey: ['missions', 'board'] })
    }
  }, [progress.data, queryClient])

  const { refetch } = progress
  const refresh = useCallback(() => {
    void refetch()
  }, [refetch])
  // Se pregunta justo cuando Missions va a revelar lo siguiente.
  useCallAt(progress.data?.nextRevealAt ?? null, refresh)

  // Solo para la escena y el sprite del heroe: rutas que el detalle ya usa.
  // Si fallan, el diorama usa la escena de su categoria y un icono.
  const missionId = progress.data?.missionId ?? null
  const mission = useQuery({
    queryKey: queryKeys.missions.detail(subject, missionId ?? ''),
    queryFn: ({ signal }) => fetchMissionDetail(missionId ?? '', signal),
    enabled: subject !== null && missionId !== null,
  })
  const heroes = useQuery({
    queryKey: queryKeys.missions.availableHeroes(subject),
    queryFn: ({ signal }) => fetchAvailableHeroes(signal),
    enabled: subject !== null,
  })
  const heroList = isHeroList(heroes.data) ? heroes.data : []

  const page = progress.data
  const heroSubtype = heroList.find((hero) => hero.heroId === page?.hero.heroId)?.subtype ?? null
  const lines = entries
    .map((entry) => ({ seq: entry.seq, line: progressLine(entry) }))
    .filter((item) => item.line !== null)
    .reverse()

  return (
    <QueryState isLoading={progress.isPending} error={progress.error}>
      {page !== undefined && (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <p className="msn-eyebrow">{difficultyName(page.difficulty)}</p>
            <h1 className="msn-title">{page.missionName}</h1>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="msn-card p-3">
              <MissionDiorama
                entries={entries}
                scene={
                  <MissionArt
                    imageRef={mission.data?.imageRef ?? null}
                    category={mission.data?.category ?? null}
                    className="h-full"
                  />
                }
                heroName={page.hero.name ?? t('missions:progressPage.yourHero')}
                heroSubtype={heroSubtype}
                heroMaxHealth={page.hero.maxHealth}
              />
            </div>
            <Card title={t('missions:progressPage.status')} className="msn-panel">
              <div className="flex flex-col gap-4">
                <Status progress={page} receivedAt={progress.dataUpdatedAt} />
                <HeroHealth hero={page.hero} />
              </div>
            </Card>
          </div>

          <Card
            title={t('missions:progressPage.logTitle')}
            description={t('missions:progressPage.logDescription')}
            className="msn-panel"
          >
            {!page.simulated ? (
              <p className="text-sm text-muted">{t('missions:progressPage.preparingHero')}</p>
            ) : lines.length === 0 ? (
              <p className="text-sm text-muted">{t('missions:progressPage.nothingYet')}</p>
            ) : (
              <ol aria-live="polite" className="msn-log">
                {lines.map(({ seq, line }) =>
                  line === null ? null : (
                    <li key={seq} data-tone={line.tone} className="text-ink">
                      {line.text}
                    </li>
                  ),
                )}
              </ol>
            )}
          </Card>
        </div>
      )}
    </QueryState>
  )
}

/**
 * Seguimiento de una misión en curso (diseño «misiones jugables», P-J6). Combat
 * simula la misión entera al empezar; Missions revela la bitácora poco a poco, en
 * proporción al tiempo real, y el desenlace no se ve antes del final.
 */
export const MissionProgressPage = (): React.JSX.Element => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>()
  const { t } = useTranslation()
  if (enrollmentId === undefined) {
    return <p role="alert">{t('missions:progressPage.missingMission')}</p>
  }

  return (
    <section
      aria-label={t('missions:progressPage.label')}
      className="msn-page msn-page--progress flex flex-col gap-6"
    >
      <Link to="/missions" className="msn-link w-fit text-sm">
        {t('missions:detail.backToBoard')}
      </Link>
      <ProgressContent key={enrollmentId} enrollmentId={enrollmentId} />
    </section>
  )
}
