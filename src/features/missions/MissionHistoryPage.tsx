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
import { useTranslation } from 'react-i18next'
import { localizedMessages } from '@/shared/i18n/messages'
import { MissionPixelIcon } from './MissionPixelIcon'
import { CATEGORY_ICON } from './missionsRemasterPresentation'
import './missions.css'

const OUTCOME_LABEL: Readonly<Record<MissionOutcome, string>> = localizedMessages({
  COMPLETED: 'missions:history.outcome.COMPLETED',
  FAILED: 'missions:history.outcome.FAILED',
  ABANDONED: 'missions:history.outcome.ABANDONED',
  VOIDED: 'missions:history.outcome.VOIDED',
})

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
  const { t } = useTranslation()

  return (
    <section
      aria-label={t('missions:history.pageLabel')}
      className="msn-page msn-page--history flex flex-col gap-6"
    >
      <Link to="/missions" className="msn-link w-fit text-sm">
        {t('missions:history.backToBoard')}
      </Link>
      <header className="flex flex-col gap-1">
        <p className="msn-eyebrow">{t('missions:remaster.historyEyebrow')}</p>
        <h1 className="msn-title">{t('missions:history.title')}</h1>
        <p className="msn-lead text-sm">{t('missions:history.subtitle')}</p>
      </header>

      <Card title={t('missions:history.summaryTitle')} className="msn-panel">
        <QueryState isLoading={summary.isPending} error={summary.error}>
          {summary.data !== undefined && (
            <div className="flex flex-col gap-5 text-sm text-ink">
              <div>
                <h3 className="msn-section-title">{t('missions:history.byCategory')}</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-3">
                  {summary.data.byCategory.map((item) => (
                    <li key={item.category} className="msn-tile flex items-start gap-2 p-3">
                      <MissionPixelIcon icon={CATEGORY_ICON[item.category]} size="lg" />
                      {t('missions:history.byCategoryLine', {
                        category: categoryLabel[item.category],
                        completed: item.completed,
                        failed: item.failed,
                        abandoned: item.abandoned,
                        damageDealt: item.damageDealt,
                        damageTaken: item.damageTaken,
                      })}
                    </li>
                  ))}
                </ul>
              </div>
              {summary.data.bestTimes.length > 0 && (
                <div>
                  <h3 className="msn-section-title">{t('missions:history.bestTimes')}</h3>
                  <ul className="mt-1 flex flex-col gap-1">
                    {summary.data.bestTimes.map((item) => (
                      <li key={item.enrollmentId} className="flex items-center gap-1.5">
                        <MissionPixelIcon icon="timer" size="sm" />
                        {item.missionName ?? item.missionId} · {difficultyName(item.difficulty)} ·{' '}
                        {durationLabel(item.simulatedDuration)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.data.epicCollection.length > 0 && (
                <div>
                  <h3 className="msn-section-title">{t('missions:history.epics')}</h3>
                  <ul className="mt-1 flex flex-col gap-1">
                    {summary.data.epicCollection.map((item) => (
                      <li
                        key={`${item.epicRef}-${item.obtainedAt}`}
                        className="flex items-center gap-1.5"
                      >
                        <MissionPixelIcon icon="epic" size="sm" />
                        {item.name}
                        {item.masterName === undefined || item.masterName === null
                          ? ''
                          : t('missions:history.epicMaster', { name: item.masterName })}{' '}
                        · {rewardStatusLabel[item.status]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.data.lootCollection.length > 0 && (
                <div>
                  <h3 className="msn-section-title">{t('missions:history.bossLoot')}</h3>
                  <ul className="mt-1 flex flex-col gap-1">
                    {summary.data.lootCollection.map((drop) => (
                      <li
                        key={`${drop.productId ?? 'material'}-${drop.label}`}
                        className="flex items-center gap-1.5"
                      >
                        <MissionPixelIcon icon="loot" size="sm" />
                        {drop.label} × {drop.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.data.narrativeProgress.length > 0 && (
                <div>
                  <h3 className="msn-section-title">{t('missions:history.narrativeProgress')}</h3>
                  <ul className="mt-1 flex flex-col gap-1">
                    {summary.data.narrativeProgress.map((item) => (
                      <li key={item.chainId} className="flex items-center gap-1.5">
                        <MissionPixelIcon icon="story" size="sm" />
                        {t('missions:history.narrativeLine', {
                          chain: (item.missionNames ?? item.missions).join(' → '),
                          completed: item.completed,
                          total: item.total,
                        })}
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

      <Card title={t('missions:history.finishedTitle')} className="msn-panel">
        <QueryState
          isLoading={history.isPending}
          error={history.data === undefined ? history.error : null}
          isEmpty={items.length === 0}
          emptyMessage={t('missions:history.noFinished')}
        >
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.enrollmentId}
                className="msn-tile flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="flex items-center gap-3">
                  <MissionPixelIcon
                    icon={item.outcome === 'COMPLETED' ? 'victory' : 'defeat'}
                    size="lg"
                  />
                  <div>
                    <p className="font-medium text-ink">{item.name}</p>
                    <p className="text-sm text-muted">
                      {OUTCOME_LABEL[item.outcome]} · {difficultyName(item.difficulty)} ·{' '}
                      {dateLabel(item.finishedAt)}
                      {item.simulatedDuration === null
                        ? ''
                        : t('missions:history.simulatedTime', {
                            time: durationLabel(item.simulatedDuration),
                          })}
                    </p>
                  </div>
                </div>
                {item.reportAvailable ? (
                  <Link
                    to={`/missions/reports/${encodeURIComponent(item.enrollmentId)}`}
                    className="msn-btn-link"
                  >
                    <MissionPixelIcon icon="report" size="sm" />
                    {t('missions:history.viewReportOf', { mission: item.name })}
                  </Link>
                ) : (
                  <span className="text-sm text-muted">{t('missions:history.noReport')}</span>
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
              variant="missions-secondary"
              className="mt-4"
              loading={history.isFetchingNextPage}
              onClick={() => void history.fetchNextPage()}
            >
              {t('missions:history.loadMore')}
            </Button>
          )}
        </QueryState>
      </Card>
    </section>
  )
}
