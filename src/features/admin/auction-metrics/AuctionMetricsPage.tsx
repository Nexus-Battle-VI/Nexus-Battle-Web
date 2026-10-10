import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import '@/features/auction/auction-remaster.css'
import './auction-metrics.css'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Card } from '@/components/ui/Card'
import { Clock, Coins, Package, TrendingUp, Trophy, User } from '@/components/ui/icons'

import { classifyMetricsFailure, type fetchAuctionMetricsSummary } from './api'
import { ClosingTrendSection } from './ClosingTrendSection'
import { DASH } from './metricsFormat'
import { MetricsTabs, type MetricsTab } from './MetricsTabs'
import { PeriodFilters } from './PeriodFilters'
import {
  allowsDailyGranularity,
  DEFAULT_GRANULARITY,
  DEFAULT_PRESET,
  presetDraft,
  presetPeriod,
  resolvePeriod,
  type PeriodDraft,
  type RangePreset,
  type ResolvedPeriod,
} from './period'
import { PricesSection } from './PricesSection'
import { SectionFailure, StatCard } from './parts'
import { RankingsSection } from './RankingsSection'
import type { AuctionMetricsSummary, SummarySection, TrendGranularity } from './types'
import { UsersCommissionsSection } from './UsersCommissionsSection'
import { useAuctionMetricsSummary } from './useAuctionMetricsSummary'
import { VolumeSection } from './VolumeSection'

export interface AuctionMetricsPageProps {
  /** Transporte inyectable, mismo patron que el resto de pantallas de admin. */
  readonly onFetch?: typeof fetchAuctionMetricsSummary
  /** Reloj inyectable: el periodo por defecto ("ultimos 30 dias") depende de "ahora". */
  readonly now?: () => Date
}

/** Sin ninguna subasta en el periodo: ni publicadas, ni cerradas, ni canceladas, ni activas. */
const isEmptyPeriod = (summary: AuctionMetricsSummary): boolean => {
  const volume = summary.sections.volumeAndSuccess

  if (volume.status !== 'AVAILABLE') {
    return false
  }

  const { playerAuctions, officialAuctions } = volume.data

  return (
    playerAuctions.published === 0 &&
    playerAuctions.closed.total === 0 &&
    playerAuctions.cancelled === 0 &&
    playerAuctions.active === 0 &&
    officialAuctions.published === 0
  )
}

const Skeleton = (): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div role="status" aria-live="polite" className="am-panel p-5">
      <p className="text-sm text-muted">{t('common:loading')}</p>
      <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12.5rem),1fr))]">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-[6.5rem] animate-pulse rounded-md bg-border motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  )
}

const EmptyPeriod = (): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <section className="am-panel p-5">
      <div className="grid gap-2">
        <p className="text-sm font-medium text-ink">{t('auctionMetrics:states.emptyTitle')}</p>
        <p className="text-xs text-muted">{t('auctionMetrics:states.emptyHint')}</p>
      </div>
      <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12.5rem),1fr))]">
        <StatCard
          icon={Package}
          label={t('auctionMetrics:volume.published')}
          value="0"
          foot={t('auctionMetrics:volume.publishedFoot')}
        />
        <StatCard
          icon={TrendingUp}
          label={t('auctionMetrics:volume.successRate')}
          value={DASH}
          foot={t('auctionMetrics:volume.successRateEmpty')}
        />
      </div>
    </section>
  )
}

/**
 * Metricas de subasta (HU-91.6, Management #581): pantalla de Administrador con el
 * volumen, el tiempo de cierre, los rankings, los precios y los usuarios/comisiones.
 *
 * Una sola consulta (`/summary`): si una seccion falla, Auction la marca `DEGRADED` y
 * las demas siguen visibles con su propio "Reintentar". Todo numero sale de la respuesta
 * real; esta pantalla no calcula, no estima ni mezcla creditos con dinero real.
 *
 * Guarda: la ruta va tras `RequireAdministrator` (presentacion). Auction exige ademas el
 * rol y responde 403 por su cuenta, que aqui se muestra como "Acceso denegado".
 */
export const AuctionMetricsPage = ({
  onFetch,
  now = () => new Date(),
}: AuctionMetricsPageProps): React.JSX.Element => {
  const { t } = useTranslation()

  const [draft, setDraft] = useState<PeriodDraft>(() => presetDraft(DEFAULT_PRESET, now()))
  const [applied, setApplied] = useState<{
    readonly preset: RangePreset
    readonly period: ResolvedPeriod
  }>(() => ({
    preset: DEFAULT_PRESET,
    // Un rango predefinido siempre resuelve: no hay forma de que sea invalido.
    period: presetPeriod(DEFAULT_PRESET, now()),
  }))
  const [granularity, setGranularity] = useState<TrendGranularity>(DEFAULT_GRANULARITY)
  const [clientInvalid, setClientInvalid] = useState(false)
  const [activeTab, setActiveTab] = useState<string | null>(null)

  const query = useAuctionMetricsSummary(
    { from: applied.period.from, to: applied.period.to, granularity },
    onFetch,
  )

  const failure = query.error === null ? null : classifyMetricsFailure(query.error)
  const invalidPeriod = clientInvalid || failure === 'INVALID_PERIOD'
  const summary = query.data

  const apply = (): void => {
    const period = resolvePeriod(draft, now())

    if (period === null) {
      setClientInvalid(true)
      return
    }

    setClientInvalid(false)
    setApplied({ preset: draft.preset, period })
    // `DAY` solo se admite hasta 92 dias (contrato §4.5): con un periodo mas largo se
    // vuelve al agrupado por defecto en vez de pedir algo que Auction rechazaria.
    if (granularity === 'DAY' && !allowsDailyGranularity(period)) {
      setGranularity(DEFAULT_GRANULARITY)
    }
  }

  const refresh = (): void => {
    if (applied.preset === 'custom') {
      void query.refetch()
      return
    }

    // Un rango predefinido termina "ahora": se recalcula para traer lo mas reciente.
    setApplied({ preset: applied.preset, period: presetPeriod(applied.preset, now()) })
  }

  const retry = (): void => {
    void query.refetch()
  }

  const section = <T,>(
    value: SummarySection<T>,
    render: (data: T) => React.JSX.Element,
    fallback: { readonly icon: typeof Clock; readonly title: string },
  ): React.JSX.Element =>
    value.status === 'AVAILABLE' ? (
      render(value.data)
    ) : (
      <SectionFailure
        icon={fallback.icon}
        title={fallback.title}
        onRetry={retry}
        retrying={query.isFetching}
      />
    )

  const renderResults = (data: AuctionMetricsSummary): React.JSX.Element => {
    if (isEmptyPeriod(data)) {
      return <EmptyPeriod />
    }

    const { sections } = data
    const successRate =
      sections.volumeAndSuccess.status === 'AVAILABLE'
        ? sections.volumeAndSuccess.data.playerAuctions.successRate.value
        : null

    const tabs: readonly MetricsTab[] = [
      {
        id: 'volume',
        label: t('auctionMetrics:volume.title'),
        icon: TrendingUp,
        content: section(sections.volumeAndSuccess, (value) => <VolumeSection data={value} />, {
          icon: TrendingUp,
          title: t('auctionMetrics:volume.title'),
        }),
      },
      {
        id: 'trends',
        label: t('auctionMetrics:trends.title'),
        icon: Clock,
        content: section(
          sections.closingTimeAndTrends,
          (value) => (
            <ClosingTrendSection
              data={value}
              successRate={successRate}
              granularity={value.granularity}
              dailyAllowed={allowsDailyGranularity(applied.period)}
              onGranularityChange={setGranularity}
            />
          ),
          { icon: Clock, title: t('auctionMetrics:trends.title') },
        ),
      },
      {
        id: 'rankings',
        label: t('auctionMetrics:rankings.title'),
        icon: Trophy,
        content: section(sections.productRankings, (value) => <RankingsSection data={value} />, {
          icon: Trophy,
          title: t('auctionMetrics:rankings.title'),
        }),
      },
      {
        id: 'prices',
        label: t('auctionMetrics:prices.title'),
        icon: Coins,
        content: section(sections.averagePrices, (value) => <PricesSection data={value} />, {
          icon: Coins,
          title: t('auctionMetrics:prices.title'),
        }),
      },
      {
        id: 'users',
        label: t('auctionMetrics:users.title'),
        icon: User,
        content: section(
          sections.usersAndCommissions,
          (value) => <UsersCommissionsSection data={value} />,
          { icon: User, title: t('auctionMetrics:users.title') },
        ),
      },
    ]

    return (
      <MetricsTabs
        tabs={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
        label={t('auctionMetrics:tabs.label')}
      />
    )
  }

  return (
    <div className="auction-shell auction-page am-page grid min-w-0 gap-6 [grid-template-columns:minmax(0,1fr)]">
      <Breadcrumb
        items={[
          { label: t('auctionMetrics:breadcrumb.home'), to: '/' },
          { label: t('auctionMetrics:breadcrumb.auctions'), to: '/auction' },
          { label: t('auctionMetrics:title') },
        ]}
      />

      <header className="auction-hero">
        <div>
          <h1 className="auction-title font-semibold text-ink">{t('auctionMetrics:title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('auctionMetrics:subtitle')}</p>
        </div>
      </header>

      <PeriodFilters
        draft={draft}
        loaded={summary === undefined ? null : { period: summary.period, asOf: summary.asOf }}
        invalidPeriod={invalidPeriod}
        refreshing={query.isFetching}
        onPresetChange={(preset) => {
          setClientInvalid(false)
          setDraft(preset === 'custom' ? { ...draft, preset } : presetDraft(preset, now()))
        }}
        onDateChange={(field, value) => {
          setClientInvalid(false)
          setDraft({ ...draft, preset: 'custom', [field]: value })
        }}
        onApply={apply}
        onRefresh={refresh}
      />

      {query.isPending && query.fetchStatus !== 'idle' && <Skeleton />}

      {failure === 'FORBIDDEN' && (
        <Card title={t('app:access.deniedTitle')}>
          <p role="alert" className="text-sm text-muted">
            {t('app:access.administrator')}
          </p>
        </Card>
      )}

      {failure === 'UNAVAILABLE' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {t('auctionMetrics:states.unavailable')}
        </p>
      )}

      {summary !== undefined && renderResults(summary)}
    </div>
  )
}
