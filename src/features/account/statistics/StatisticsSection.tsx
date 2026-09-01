import { StatisticsPanel } from './StatisticsPanel'
import type { StatisticsPanelState } from './types'

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
 * PRODUCCIÓN HOY: no hace ningún `fetch` de estadísticas. HU-06.3 (backend) está
 * diferida a un Sprint posterior, así que sin `state` el panel se muestra en
 * `pending` ("aún no disponible"), nunca con ceros ni logros inventados.
 *
 * INTEGRACIÓN FUTURA (cambio localizado, sin tocar `StatisticsPanel`):
 *   const query = useStatistics()            // hook aún inexistente
 *   <StatisticsPanel state={toPanelState(query)} />
 *
 * `state` sólo se inyecta desde pruebas y desde la vista previa DEV.
 */
export interface StatisticsSectionProps {
  readonly state?: StatisticsPanelState
}

export const StatisticsSection = ({ state }: StatisticsSectionProps = {}): React.JSX.Element => (
  <section aria-labelledby="account-statistics-heading" className="space-y-5">
    <header>
      <h2 id="account-statistics-heading" className="text-2xl font-semibold text-ink">
        Estadísticas y logros
      </h2>
      <p className="mt-1 text-sm text-muted">
        Consulta tu progreso y los reconocimientos registrados en tu cuenta.
      </p>
    </header>

    <StatisticsPanel state={state ?? { status: 'pending' }} />
  </section>
)
