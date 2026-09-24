import { useParams } from 'react-router'

import { QueryState } from '@/components/ui/QueryState'

import { MissionExperiencePanel } from './MissionExperiencePanel'
import { difficultyLabel, experienceLinesOf, outcomeLabel, readExperience } from './missionReport'
import { useMissionReport } from './useMissionReport'

/**
 * Informe de una misión terminada (HU-74) con la experiencia de sus derrotas
 * (HU-09, Task HU-09.5).
 *
 * LA DIRECCIÓN LLEVA LA MATRÍCULA, no un identificador de jugador: el informe es
 * siempre el de quien está mirando, y el servicio lo deduce del testimonio. Sin
 * sesión, `RequireSession` corta antes de llegar aquí.
 *
 * El informe avisa por sí solo de lo que aún no se puede leer -- `404
 * REPORT_NOT_AVAILABLE` mientras la misión sigue en curso, con su fecha de fin -- y
 * `QueryState` muestra ese mensaje tal cual: la pantalla no lo reinterpreta ni lo
 * convierte en un "no encontrado" genérico.
 */
export const MissionReportPage = (): React.JSX.Element => {
  const { enrollmentId = null } = useParams<{ enrollmentId: string }>()
  const reportQuery = useMissionReport(enrollmentId)
  const report = reportQuery.data ?? null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Informe de misión</h1>
        {report !== null && (
          <p className="text-sm text-muted">
            {`${report.mission.name} · ${difficultyLabel(report.mission.difficulty)} · ${outcomeLabel(report.summary.outcome)}`}
          </p>
        )}
      </header>

      <QueryState isLoading={reportQuery.isPending} error={reportQuery.error}>
        {report === null ? (
          <p className="text-sm text-muted">No se encontró el informe de esta misión.</p>
        ) : (
          <MissionExperiencePanel
            experience={readExperience(report)}
            lines={experienceLinesOf(report)}
          />
        )}
      </QueryState>
    </div>
  )
}
