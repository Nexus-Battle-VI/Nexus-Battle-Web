import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Link, useParams } from 'react-router'

import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { countdownLabel, useCallAt, useCountdown } from '@/shared/countdown'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { ProgressBar } from './ActiveMissionsPanel'
import { difficultyName } from './difficultyPresentation'
import { fetchMissionProgress, type MissionProgress, type ProgressEntry } from './missionPlayApi'
import { progressLine, type ProgressTone } from './progressPresentation'

/** Si nada se revela antes, se vuelve a preguntar a este ritmo. */
const FALLBACK_REFRESH_MS = 30_000

const TONE: Readonly<Record<ProgressTone, string>> = {
  info: 'border-border',
  hero: 'border-brand/60',
  enemy: 'border-danger/60',
  good: 'border-success/60',
  bad: 'border-warning/70',
}

const HeroHealth = ({
  hero,
}: {
  readonly hero: MissionProgress['hero']
}): React.JSX.Element | null => {
  if (hero.maxHealth === null || hero.health === null) return null
  const name = hero.name ?? 'tu héroe'
  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex justify-between text-ink">
        <span>Vida de {name}</span>
        <span className="tabular-nums">
          {hero.health} / {hero.maxHealth}
        </span>
      </div>
      <ProgressBar percent={(hero.health * 100) / hero.maxHealth} label={`Vida de ${name}`} />
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
  const remaining = useCountdown(progress.finished ? null : progress.remainingSeconds, receivedAt)

  if (progress.finished) {
    return (
      <div role="status" className="flex flex-col gap-2 text-sm text-ink">
        <p className="font-semibold">La misión terminó.</p>
        {progress.reportAvailable ? (
          <Link
            to={`/missions/reports/${encodeURIComponent(progress.enrollmentId)}`}
            className="w-fit font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            Ver el reporte de la misión
          </Link>
        ) : (
          <p className="text-muted">Preparando el reporte…</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <ProgressBar percent={progress.progressPercent} label="Progreso de la misión" />
      <p role="timer" aria-live="off" className="tabular-nums text-ink">
        {remaining === null
          ? 'Confirmando la reserva del héroe…'
          : remaining > 0
            ? `Termina en ${countdownLabel(remaining)}`
            : 'Terminando: el reporte llega en unos segundos'}
      </p>
    </div>
  )
}

const ProgressContent = ({
  enrollmentId,
}: {
  readonly enrollmentId: string
}): React.JSX.Element => {
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

  const page = progress.data
  const lines = entries
    .map((entry) => ({ seq: entry.seq, line: progressLine(entry) }))
    .filter((item) => item.line !== null)
    .reverse()

  return (
    <QueryState isLoading={progress.isPending} error={progress.error}>
      {page !== undefined && (
        <div className="flex flex-col gap-6">
          <header>
            <p className="text-sm text-muted">{difficultyName(page.difficulty)}</p>
            <h1 className="text-2xl font-semibold text-ink">{page.missionName}</h1>
          </header>

          <Card title="Estado">
            <div className="flex flex-col gap-4">
              <Status progress={page} receivedAt={progress.dataUpdatedAt} />
              <HeroHealth hero={page.hero} />
            </div>
          </Card>

          <Card
            title="Bitácora"
            description="Lo que va pasando en la misión, a medida que ocurre. Lo más reciente, arriba."
          >
            {!page.simulated ? (
              <p className="text-sm text-muted">
                Tu héroe se prepara: la bitácora aparece en unos segundos.
              </p>
            ) : lines.length === 0 ? (
              <p className="text-sm text-muted">Aún no ha pasado nada que contar.</p>
            ) : (
              <ol aria-live="polite" className="flex max-h-[28rem] flex-col gap-1 overflow-y-auto">
                {lines.map(({ seq, line }) =>
                  line === null ? null : (
                    <li
                      key={seq}
                      className={clsx('border-l-4 py-1 pl-3 text-sm text-ink', TONE[line.tone])}
                    >
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
  if (enrollmentId === undefined) return <p role="alert">Falta la misión que quieres seguir.</p>

  return (
    <section aria-label="Seguimiento de misión" className="flex flex-col gap-6">
      <Link to="/missions" className="w-fit text-sm text-brand hover:underline">
        ← Volver al tablón
      </Link>
      <ProgressContent key={enrollmentId} enrollmentId={enrollmentId} />
    </section>
  )
}
