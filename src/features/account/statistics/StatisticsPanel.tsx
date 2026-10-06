import type { ReactNode } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'
import { useTheme } from '@/shared/theme'
import { formatInteger, formatLocale } from '@/shared/i18n/format'
import { accountStatisticsIcons, type AccountStatisticsIconName } from '../accountRemasterAssets'
import type {
  AchievementsPanelState,
  PlayerAchievement,
  PlayerStatistics,
  StatisticsPanelState,
} from './types'

/**
 * Panel de estadísticas y logros (HU-06.4) — COMPONENTE PRESENTACIONAL PURO.
 *
 * No importa `httpClient`, `fetch`, `queryKeys`, la sesión ni ninguna URL de
 * servicio: recibe todo por `state`. Así lo reutilizan hoy la sección productiva
 * (siempre `status: 'pending'`, porque HU-06.3 backend está diferida), la vista
 * previa DEV (con fixture) y, en un Sprint posterior, el hook real de datos sin
 * tocar este archivo.
 *
 * Distingue con rigor "pendiente de servicio" (aún no existe el productor de los
 * datos) de "sin registros" (el servicio existe y devuelve vacío) y de "error"
 * (fallo temporal). El estado vacío NUNCA usa `role="alert"` ni color de peligro.
 */

const CARD_SURFACE = 'account-stat-card rounded-lg p-5'
const PENDING_HINT = 'text-xs text-muted'

/**
 * Microinteracción de profundidad (HU-06.4).
 *
 * Al pasar el cursor, la superficie se "hunde" apenas: 1px hacia abajo, escala
 * 0.5 % menor, borde `brand` muy tenue y sombra interior sutil. Da feedback de
 * puntero -sensación de presionar una pieza- SIN sugerir que la tarjeta sea un
 * control: no hay `cursor-pointer`, ni `tabindex`, ni `role`, ni navegación. Solo
 * se animan `transform`, `box-shadow` y `border-color`; 150 ms `ease-out`. Usa
 * tokens (`border-brand`), nunca hex. `motion-reduce:*` deja el efecto sin
 * movimiento cuando el sistema pide menos animación.
 */
const DEPTH_HOVER =
  'transition-[transform,box-shadow,border-color] duration-150 ease-out ' +
  'hover:translate-y-px hover:scale-[0.995] hover:border-brand/40 hover:shadow-inner ' +
  'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100'

/**
 * Ronda 3 (brief seccion 49/50/51): reemplaza los iconos genericos de Lucide
 * (`Gamepad2`/`Swords`/`TrendingUp`/`Trophy`) por piezas REALES del kit
 * -`accountStatisticsIcons`, recortadas de las mismas hojas de
 * `05-Section-Icons` ya usadas para la navegacion, nunca arte nuevo-.
 */
const StatIcon = ({
  icon,
  className = 'h-7 w-auto',
}: {
  readonly icon: AccountStatisticsIconName
  readonly className?: string
}): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  return (
    <img
      src={accountStatisticsIcons[icon][theme]}
      alt=""
      aria-hidden="true"
      className={clsx('account-stat-card__icon shrink-0', className)}
    />
  )
}

interface StatCardProps {
  readonly icon: AccountStatisticsIconName
  readonly label: string
  readonly className?: string
  readonly children: ReactNode
}

const StatCard = ({ icon, label, className, children }: StatCardProps): React.JSX.Element => (
  <div className={clsx(CARD_SURFACE, DEPTH_HOVER, className)}>
    <div className="flex items-center gap-2">
      <StatIcon icon={icon} />
      <h3 className="account-label text-sm">{label}</h3>
    </div>
    <div className="mt-3">{children}</div>
  </div>
)

/** Valor numérico grande, o "Sin registros todavía" cuando el servicio no reporta ninguno. */
const MetricValue = ({ value }: { readonly value: number | null }): React.JSX.Element => {
  const { t } = useTranslation()

  return value === null ? (
    <p className="text-sm text-muted">{t('account:statistics.noRecords')}</p>
  ) : (
    <p className="text-3xl font-semibold text-ink tabular-nums">{formatInteger(value)}</p>
  )
}

const PendingMetric = ({ hint }: { readonly hint: string }): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-ink">{t('account:statistics.notAvailable')}</p>
      <p className={PENDING_HINT}>{hint}</p>
    </div>
  )
}

const ProgressPending = (): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-ink">{t('account:statistics.progressPending')}</p>
      <p className={PENDING_HINT}>{t('account:statistics.progressPendingHint')}</p>
    </div>
  )
}

/**
 * Ronda 4 (brief seccion 47/48/123): antes TODO logro usaba el icono
 * `firstVictory` -"Primera victoria" y "Veterano de la arena" se veian
 * identicos-. HU-06.3 (backend de estadisticas/logros) sigue diferida: no
 * existe un campo `type`/`slug` en el contrato real todavia, asi que no hay
 * nada que inventar ahi. Lo que SI existe hoy es `achievement.id` -un
 * identificador, no texto traducido visible-, con un slug semantico tanto en
 * datos reales como en fixtures DEV. Mapear por `id` en
 * vez de por `achievement.name` (que SI es texto traducido/visible) es la
 * solucion seguia que pide el brief, con un fallback estable a
 * `firstVictory` para cualquier logro futuro que no matchee -nunca revienta,
 * nunca inventa un tercer icono-.
 */
const achievementIcon = (achievement: PlayerAchievement): AccountStatisticsIconName =>
  achievement.id.includes('veteran') ? 'veteran' : 'firstVictory'

const AchievementItem = ({
  achievement,
}: {
  readonly achievement: PlayerAchievement
}): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <li className={clsx(CARD_SURFACE, 'flex gap-3', DEPTH_HOVER)}>
      <StatIcon icon={achievementIcon(achievement)} className="mt-0.5 h-5 w-auto" />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="account-title text-sm font-medium">{achievement.name}</p>
          {/* Ronda 4 (brief seccion 50-54): el badge "Obtenido" plano
           * (`bg-success/15`) se reemplaza por un acabado premium/metalico
           * via CSS -nunca una imagen-, distinto por tema (`.account-
           * achievement-badge`, definido en `account.css`: esmeralda
           * metalica en Dark, diamante/cristal en Light). El texto
           * "Obtenido" no cambia. */}
          <span className="account-achievement-badge">{t('account:statistics.obtained')}</span>
        </div>
        {achievement.description !== undefined && (
          <p className="text-xs text-muted">{achievement.description}</p>
        )}
        {achievement.recognition !== undefined && (
          <p className="text-xs text-muted">
            {t('account:statistics.recognition', {
              name: achievement.recognition.name,
              status:
                achievement.recognition.status === null
                  ? t('account:statistics.recognitionUnknown')
                  : t(`account:statistics.recognitionStatus.${achievement.recognition.status}`),
            })}
          </p>
        )}
        {achievement.obtainedAt !== undefined && (
          <p className="text-xs text-muted">
            {t('account:statistics.obtainedOn', {
              date: new Date(achievement.obtainedAt).toLocaleDateString(formatLocale()),
            })}
          </p>
        )}
      </div>
    </li>
  )
}

const AchievementsBlock = ({
  state,
}: {
  readonly state: AchievementsPanelState
}): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="account-achievements-heading" className="space-y-3">
      <div className="flex items-center gap-2">
        <StatIcon icon="veteran" className="h-5 w-auto" />
        <h3 id="account-achievements-heading" className="account-title text-base font-semibold">
          {t('account:statistics.achievements')}
        </h3>
      </div>

      {state.status === 'pending' ? (
        <Card className="account-inline-state account-state-panel account-state-panel--pending">
          <StatIcon icon="veteran" className="h-6 w-auto" />
          <p className="text-sm font-medium text-ink">{t('account:statistics.notAvailable')}</p>
          <p className="mt-1 text-xs text-muted">{t('account:statistics.achievementsPending')}</p>
        </Card>
      ) : state.status === 'loading' ? (
        <Card className="account-inline-state account-state-panel">
          <span aria-hidden className="account-state-panel__orb" />
          <p role="status" className="text-sm text-muted">
            {t('account:statistics.achievementsLoading')}
          </p>
        </Card>
      ) : state.status === 'error' ? (
        <Card className="account-inline-state account-inline-state--danger account-state-panel">
          <p role="alert" className="text-sm font-medium text-danger">
            {state.message}
          </p>
        </Card>
      ) : state.items.length === 0 ? (
        <Card className="account-inline-state account-state-panel">
          <p className="text-sm text-muted">{t('account:statistics.achievementsEmpty')}</p>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.items.map((achievement) => (
            <AchievementItem key={achievement.id} achievement={achievement} />
          ))}
        </ul>
      )}
    </section>
  )
}

const StatsGrid = ({
  statistics,
  pending,
}: {
  readonly statistics: PlayerStatistics | null
  readonly pending: boolean
}): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard icon="gamesPlayed" label={t('account:statistics.gamesPlayed')}>
        {pending || statistics === null ? (
          <PendingMetric hint={t('account:statistics.gamesPlayedPending')} />
        ) : (
          <MetricValue value={statistics.gamesPlayed} />
        )}
      </StatCard>

      <StatCard icon="victories" label={t('account:statistics.wins')}>
        {pending || statistics === null ? (
          <PendingMetric hint={t('account:statistics.winsPending')} />
        ) : (
          <MetricValue value={statistics.wins} />
        )}
      </StatCard>

      <StatCard
        icon="progress"
        label={t('account:statistics.generalProgress')}
        className="sm:col-span-2 lg:col-span-1"
      >
        {pending ||
        statistics === null ||
        statistics.generalProgress.kind === 'pending-definition' ? (
          <ProgressPending />
        ) : (
          <p className="text-sm text-ink">{statistics.generalProgress.label}</p>
        )}
      </StatCard>
    </div>
  )
}

export interface StatisticsPanelProps {
  readonly state: StatisticsPanelState
  readonly achievementsState?: AchievementsPanelState
}

export const StatisticsPanel = ({
  state,
  achievementsState,
}: StatisticsPanelProps): React.JSX.Element => {
  const { t } = useTranslation()

  if (state.status === 'loading') {
    return (
      <Card className="account-inline-state account-state-panel">
        <span aria-hidden className="account-state-panel__orb" />
        <p role="status" className="text-sm">
          <strong className="font-semibold text-ink underline underline-offset-2">
            {t('account:statistics.loading')}
          </strong>
        </p>
      </Card>
    )
  }

  if (state.status === 'error') {
    return (
      <Card className="account-inline-state account-inline-state--danger account-state-panel">
        <p role="alert" className="text-sm font-medium text-danger">
          {state.message ?? t('account:statistics.loadFailed')}
        </p>
      </Card>
    )
  }

  const pending = state.status === 'pending'
  const visibleAchievements: AchievementsPanelState =
    achievementsState ??
    (pending ? { status: 'pending' } : { status: 'ready', items: state.achievements })

  return (
    <div className="space-y-6">
      <StatsGrid statistics={pending ? null : state.statistics} pending={pending} />
      <AchievementsBlock state={visibleAchievements} />
    </div>
  )
}
