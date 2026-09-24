import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { formatDateTime } from '@/lib/format'
import { difficultyName } from './difficultyPresentation'
import { EpicAlbum } from './EpicAlbum'
import { categoryLabel, durationLabel, rewardStatusLabel } from './missionPresentation'
import {
  fetchMissionHistory,
  fetchMissionHistorySummary,
  type MissionOutcome,
} from './missionReportApi'

const OUTCOME_LABEL: Readonly<Record<MissionOutcome, string>> = {
  COMPLETED: 'Completada',
  FAILED: 'Fallida',
  ABANDONED: 'Abandonada',
  VOIDED: 'Anulada',
}

const dateLabel = (iso: string): string => formatDateTime(iso)

export const MissionHistoryPage = (): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  const history = useInfiniteQuery({
    queryKey: queryKeys.missions.history(subject),
    queryFn: ({ pageParam, signal }) => fetchMissionHistory(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: subject !== null,
  })
  const summary = useQuery({
    queryKey: queryKeys.missions.historySummary(subject),
    queryFn: ({ signal }) => fetchMissionHistorySummary(signal),
    enabled: subject !== null,
  })
  const items = history.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <section aria-label="Historial de misiones" className="flex flex-col gap-6">
      <Link to="/missions" className="w-fit text-sm text-brand hover:underline">
        ← Volver al tablón
      </Link>
      <header>
        <h1 className="text-2xl font-semibold text-ink">Historial de misiones</h1>
        <p className="text-sm text-muted">
          Resultados terminados, del más reciente al más antiguo.
        </p>
      </header>

      <Card title="Resumen">
        <QueryState isLoading={summary.isPending} error={summary.error}>
          {summary.data !== undefined && (
            <div className="flex flex-col gap-5 text-sm text-ink">
              <div>
                <h3 className="font-medium">Por categoría</h3>
                <ul className="mt-1 grid gap-2 sm:grid-cols-3">
                  {summary.data.byCategory.map((item) => (
                    <li key={item.category}>
                      {categoryLabel[item.category]}: {item.completed} completadas, {item.failed}{' '}
                      fallidas, {item.abandoned} abandonadas. Daño causado: {item.damageDealt};
                      recibido: {item.damageTaken}.
                    </li>
                  ))}
                </ul>
              </div>
              {summary.data.bestTimes.length > 0 && (
                <div>
                  <h3 className="font-medium">Mejores tiempos simulados</h3>
                  <ul className="mt-1 list-inside list-disc">
                    {summary.data.bestTimes.map((item) => (
                      <li key={item.enrollmentId}>
                        {item.missionName ?? item.missionId} · {difficultyName(item.difficulty)} ·{' '}
                        {durationLabel(item.simulatedDuration)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.data.epicCollection.length > 0 && (
                <div>
                  <h3 className="font-medium">Épicas</h3>
                  <ul className="mt-1 list-inside list-disc">
                    {summary.data.epicCollection.map((item) => (
                      <li key={`${item.epicRef}-${item.obtainedAt}`}>
                        {item.name}
                        {item.masterName === undefined || item.masterName === null
                          ? ''
                          : `, de ${item.masterName}`}{' '}
                        · {rewardStatusLabel[item.status]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.data.lootCollection.length > 0 && (
                <div>
                  <h3 className="font-medium">Botín de jefes conseguido</h3>
                  <ul className="mt-1 list-inside list-disc">
                    {summary.data.lootCollection.map((drop) => (
                      <li key={`${drop.productId ?? 'material'}-${drop.label}`}>
                        {drop.label} × {drop.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.data.narrativeProgress.length > 0 && (
                <div>
                  <h3 className="font-medium">Progreso narrativo</h3>
                  <ul className="mt-1 list-inside list-disc">
                    {summary.data.narrativeProgress.map((item) => (
                      <li key={item.chainId}>
                        {(item.missionNames ?? item.missions).join(' → ')}: {item.completed} de{' '}
                        {item.total} misiones completadas
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </QueryState>
      </Card>

      <EpicAlbum entries={summary.data?.epicAlbum ?? []} />

      <Card title="Misiones terminadas">
        <QueryState
          isLoading={history.isPending}
          error={history.data === undefined ? history.error : null}
          isEmpty={items.length === 0}
          emptyMessage="Aún no tienes misiones terminadas."
        >
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.enrollmentId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium text-ink">{item.name}</p>
                  <p className="text-sm text-muted">
                    {OUTCOME_LABEL[item.outcome]} · {difficultyName(item.difficulty)} ·{' '}
                    {dateLabel(item.finishedAt)}
                    {item.simulatedDuration === null
                      ? ''
                      : ` · Tiempo simulado: ${durationLabel(item.simulatedDuration)}`}
                  </p>
                </div>
                {item.reportAvailable ? (
                  <Link
                    to={`/missions/reports/${encodeURIComponent(item.enrollmentId)}`}
                    className="text-sm text-brand hover:underline"
                  >
                    Ver reporte de {item.name}
                  </Link>
                ) : (
                  <span className="text-sm text-muted">Sin reporte</span>
                )}
              </li>
            ))}
          </ul>
          {history.isFetchNextPageError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {history.error.message}
            </p>
          )}
          {history.hasNextPage && (
            <Button
              variant="secondary"
              className="mt-4"
              loading={history.isFetchingNextPage}
              onClick={() => void history.fetchNextPage()}
            >
              Cargar más
            </Button>
          )}
        </QueryState>
      </Card>
    </section>
  )
}
