import type { ComponentType, ReactNode } from 'react'
import clsx from 'clsx'

import { Card } from '@/components/ui/Card'
import { Gamepad2, Swords, Trophy, TrendingUp } from '@/components/ui/icons'
import type { PlayerAchievement, PlayerStatistics, StatisticsPanelState } from './types'

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

const CARD_SURFACE = 'rounded-lg border border-border bg-surface-raised p-5'
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

interface StatCardProps {
  readonly icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  readonly label: string
  readonly className?: string
  readonly children: ReactNode
}

const StatCard = ({ icon: Icon, label, className, children }: StatCardProps): React.JSX.Element => (
  <div className={clsx(CARD_SURFACE, DEPTH_HOVER, className)}>
    <div className="flex items-center gap-2">
      <Icon aria-hidden className="h-4 w-4 text-muted" />
      <h3 className="text-sm font-medium text-ink">{label}</h3>
    </div>
    <div className="mt-3">{children}</div>
  </div>
)

/** Valor numérico grande, o "Sin registros todavía" cuando el servicio no reporta ninguno. */
const MetricValue = ({ value }: { readonly value: number | null }): React.JSX.Element =>
  value === null ? (
    <p className="text-sm text-muted">Sin registros todavía.</p>
  ) : (
    <p className="text-3xl font-semibold text-ink tabular-nums">{value.toLocaleString('es-CO')}</p>
  )

const PendingMetric = ({ hint }: { readonly hint: string }): React.JSX.Element => (
  <div className="space-y-1">
    <p className="text-sm font-medium text-ink">Aún no disponible</p>
    <p className={PENDING_HINT}>{hint}</p>
  </div>
)

const ProgressPending = (): React.JSX.Element => (
  <div className="space-y-1">
    <p className="text-sm font-medium text-ink">Definición funcional pendiente</p>
    <p className={PENDING_HINT}>La representación definitiva dependerá de la escala aprobada.</p>
  </div>
)

const AchievementItem = ({
  achievement,
}: {
  readonly achievement: PlayerAchievement
}): React.JSX.Element => (
  <li className={clsx(CARD_SURFACE, 'flex gap-3', DEPTH_HOVER)}>
    <Trophy aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-ink">{achievement.name}</p>
        <span className="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
          Obtenido
        </span>
      </div>
      {achievement.description !== undefined && (
        <p className="text-xs text-muted">{achievement.description}</p>
      )}
    </div>
  </li>
)

const AchievementsBlock = ({
  achievements,
  pending,
}: {
  readonly achievements: readonly PlayerAchievement[]
  readonly pending: boolean
}): React.JSX.Element => (
  <section aria-labelledby="account-achievements-heading" className="space-y-3">
    <div className="flex items-center gap-2">
      <Trophy aria-hidden className="h-4 w-4 text-muted" />
      <h3 id="account-achievements-heading" className="text-base font-semibold text-ink">
        Logros y reconocimientos
      </h3>
    </div>

    {pending ? (
      <Card>
        <p className="text-sm font-medium text-ink">Aún no disponible</p>
        <p className="mt-1 text-xs text-muted">
          Aquí verás los logros y reconocimientos de tu cuenta cuando exista el servicio que los
          registra.
        </p>
      </Card>
    ) : achievements.length === 0 ? (
      <Card>
        <p className="text-sm text-muted">Aún no tienes logros registrados.</p>
      </Card>
    ) : (
      <ul className="grid gap-3 sm:grid-cols-2">
        {achievements.map((achievement) => (
          <AchievementItem key={achievement.id} achievement={achievement} />
        ))}
      </ul>
    )}
  </section>
)

const StatsGrid = ({
  statistics,
  pending,
}: {
  readonly statistics: PlayerStatistics | null
  readonly pending: boolean
}): React.JSX.Element => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <StatCard icon={Gamepad2} label="Partidas jugadas">
      {pending || statistics === null ? (
        <PendingMetric hint="Se mostrará cuando exista el servicio que registra tus partidas." />
      ) : (
        <MetricValue value={statistics.gamesPlayed} />
      )}
    </StatCard>

    <StatCard icon={Swords} label="Victorias">
      {pending || statistics === null ? (
        <PendingMetric hint="Se mostrará cuando exista el servicio que registra tus victorias." />
      ) : (
        <MetricValue value={statistics.wins} />
      )}
    </StatCard>

    <StatCard icon={TrendingUp} label="Progreso general" className="sm:col-span-2 lg:col-span-1">
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

export interface StatisticsPanelProps {
  readonly state: StatisticsPanelState
}

export const StatisticsPanel = ({ state }: StatisticsPanelProps): React.JSX.Element => {
  if (state.status === 'loading') {
    return (
      <p role="status" className="text-sm">
        <strong className="font-semibold text-ink underline underline-offset-2">
          Cargando tus estadísticas…
        </strong>
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <Card>
        <p role="alert" className="text-sm text-danger">
          {state.message ??
            'No se pudieron cargar tus estadísticas. Vuelve a intentarlo en un momento.'}
        </p>
      </Card>
    )
  }

  const pending = state.status === 'pending'

  return (
    <div className="space-y-6">
      <StatsGrid statistics={pending ? null : state.statistics} pending={pending} />
      <AchievementsBlock achievements={pending ? [] : state.achievements} pending={pending} />
    </div>
  )
}
