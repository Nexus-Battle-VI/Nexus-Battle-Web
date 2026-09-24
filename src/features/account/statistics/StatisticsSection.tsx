import { useQuery } from '@tanstack/react-query'

import { fetchMissionAchievements } from '@/features/missions/missionAchievementApi'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { toPlayerAchievements } from './missionAchievements'
import { StatisticsPanel } from './StatisticsPanel'
import type { AchievementsPanelState, StatisticsPanelState } from './types'

/**
 * "Estadísticas y logros" (HU-06.4) — sección hija de "Mi cuenta"
 * (`/account/statistics`).
 *
 * Vive dentro del shell de `AccountPage`: hereda el encabezado global (incluido
 * el control "Volver"), el fondo, el `<h1>` "Mi cuenta", el resumen, la
 * navegación interna, el tema global y el manejo de carga / error / 401 del
 * shell. Por eso aquí el título es `<h2>` y las subsecciones `<h3>`; no se
 * reconstruye nada de eso. NO lleva un "Volver a Mi cuenta" propio: sería
 * redundante -esta pantalla YA es una sección de Mi cuenta-.
 *
 * Las métricas de HU-06.3 siguen pendientes; los logros obtenidos sí se leen de
 * Missions (HU-76.3). La vista previa puede inyectar `state` sin hacer HTTP.
 *
 * `state` sólo se inyecta desde pruebas y desde la vista previa DEV.
 */
export interface StatisticsSectionProps {
  readonly state?: StatisticsPanelState
}

export const StatisticsSection = ({ state }: StatisticsSectionProps = {}): React.JSX.Element => {
  const subject = useSession((session) => session.subject)
  const achievements = useQuery({
    queryKey: queryKeys.missions.achievements(subject),
    queryFn: ({ signal }) => fetchMissionAchievements(signal),
    enabled: state === undefined && subject !== null,
  })
  const achievementsState: AchievementsPanelState =
    subject === null
      ? { status: 'pending' }
      : achievements.isPending
        ? { status: 'loading' }
        : achievements.isError
          ? { status: 'error', message: achievements.error.message }
          : // Missions lista todo su catálogo, conseguido o no: vacío es que aún no hay
            // logros definidos (diseño «misiones jugables», P-J3). No se promete nada.
            achievements.data.items.length === 0
            ? { status: 'pending' }
            : { status: 'ready', items: toPlayerAchievements(achievements.data) }

  return (
    <section aria-labelledby="account-statistics-heading" className="space-y-5">
      <header>
        <h2 id="account-statistics-heading" className="text-2xl font-semibold text-ink">
          Estadísticas y logros
        </h2>
        <p className="mt-1 text-sm text-muted">
          Consulta tu progreso y los reconocimientos registrados en tu cuenta.
        </p>
      </header>

      <StatisticsPanel
        state={state ?? { status: 'pending' }}
        {...(state === undefined ? { achievementsState } : {})}
      />
    </section>
  )
}
