import { useSearchParams } from 'react-router'

import { StatisticsSection } from './StatisticsSection'
import { devPlayerAchievements, devPlayerStatistics } from './fixtures'
import type { StatisticsPanelState } from './types'

/**
 * Envoltura EXCLUSIVAMENTE DE DESARROLLO de "Estadísticas y logros" (HU-06.4).
 *
 * Es el elemento de la ruta `__dev/account/statistics` (ver `../dev/previewRoutes`).
 * Monta la MISMA `StatisticsSection` de producción y le inyecta un estado de
 * ejemplo por props —nunca por `httpClient`—. `?state=` permite revisar cada
 * estado de la referencia UX (HU-06.2) sin sesión real:
 *
 *   ?state=content          (por defecto) estadísticas + logros de ejemplo
 *   ?state=no-achievements   estadísticas de ejemplo, sin logros
 *   ?state=empty             servicio disponible pero sin registros
 *   ?state=loading           cargando
 *   ?state=error             error temporal
 *   ?state=pending           igual que producción hoy (servicio diferido)
 */

const DEV_STATISTICS_CONTENT: StatisticsPanelState = {
  status: 'ready',
  statistics: devPlayerStatistics,
  achievements: devPlayerAchievements,
}

const DEV_STATISTICS_STATES: Readonly<Record<string, StatisticsPanelState>> = {
  content: DEV_STATISTICS_CONTENT,
  'no-achievements': { status: 'ready', statistics: devPlayerStatistics, achievements: [] },
  empty: {
    status: 'ready',
    statistics: { gamesPlayed: null, wins: null, generalProgress: { kind: 'pending-definition' } },
    achievements: [],
  },
  loading: { status: 'loading' },
  error: { status: 'error' },
  pending: { status: 'pending' },
}

export const StatisticsDevPreview = (): React.JSX.Element => {
  const [params] = useSearchParams()
  const state = DEV_STATISTICS_STATES[params.get('state') ?? 'content'] ?? DEV_STATISTICS_CONTENT

  return <StatisticsSection state={state} />
}
