import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { difficultyName } from './difficultyPresentation'
import { categoryLabel, durationLabel, rewardStatusLabel } from './missionPresentation'
import { fetchMissionReport, type MissionReport } from './missionReportApi'

const OUTCOME_LABEL = {
  COMPLETED: 'Completada',
  FAILED: 'Fallida',
  ABANDONED: 'Abandonada',
} as const

const objectiveStatus = (met: boolean | null): string =>
  met === null ? 'Sin evaluar' : met ? 'Cumplido' : 'No cumplido'

const valueLabel = (value: number | null): string => (value === null ? 'Sin dato' : String(value))

const ReportContent = ({ report }: { readonly report: MissionReport }): React.JSX.Element => (
  <>
    <header>
      <p className="text-sm text-muted">
        {categoryLabel[report.mission.category]} · {difficultyName(report.mission.difficulty)}
      </p>
      <h1 className="text-2xl font-semibold text-ink">Reporte: {report.mission.name}</h1>
      <p className="mt-2 text-sm text-ink">
        {OUTCOME_LABEL[report.summary.outcome]} · Héroe:{' '}
        {report.summary.hero.name ?? report.summary.hero.heroId} · Terminó{' '}
        {new Date(report.summary.finishedAt).toLocaleString('es-CO')}
      </p>
      {report.summary.outcomeReason !== null && (
        <p className="mt-1 text-sm text-muted">{report.summary.outcomeReason}</p>
      )}
      {report.summary.simulatedDuration !== null && (
        <p className="mt-1 text-sm text-muted">
          Tiempo simulado: {durationLabel(report.summary.simulatedDuration)}
        </p>
      )}
    </header>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Combate">
        <dl className="grid grid-cols-2 gap-2 text-sm text-ink">
          <Stat
            label="Encuentros completados"
            value={valueLabel(report.combatStats.encountersCompleted)}
          />
          <Stat label="Encuentros totales" value={valueLabel(report.combatStats.encountersTotal)} />
          <Stat label="Turnos" value={valueLabel(report.combatStats.totalTurns)} />
          <Stat label="Daño causado" value={valueLabel(report.combatStats.damageDealt)} />
          <Stat label="Daño recibido" value={valueLabel(report.combatStats.damageTaken)} />
          <Stat label="Efectos críticos" value={valueLabel(report.combatStats.criticalEffects)} />
        </dl>
        {report.combatStats.skillsUsed.length > 0 && (
          <div className="mt-4 text-sm text-ink">
            <h3 className="font-medium">Habilidades usadas</h3>
            <ul className="list-inside list-disc">
              {report.combatStats.skillsUsed.map((skill) => (
                <li key={skill.abilityId}>
                  {skill.abilityId}: {skill.count}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card title="Enemigos">
        <ul className="list-inside list-disc text-sm text-ink">
          {report.enemies.defeated.map((enemy) => (
            <li key={enemy.enemyRef}>
              {enemy.name} × {enemy.count}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-ink">
          Jefe {report.enemies.boss.name}:{' '}
          {report.enemies.boss.defeated ? 'derrotado' : 'no derrotado'}
        </p>
        {report.enemies.masters.length > 0 && (
          <ul className="mt-2 list-inside list-disc text-sm text-ink">
            {report.enemies.masters.map((master) => (
              <li key={master.masterRef}>
                Máster {master.name}: {master.status}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Objetivos">
        <ul className="flex flex-col gap-2 text-sm text-ink">
          {report.objectives.map((objective) => (
            <li key={objective.id}>
              {objective.text} · {objectiveStatus(objective.met)}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Recompensas">
        {report.rewards.length === 0 ? (
          <p className="text-sm text-muted">No hay entregas registradas.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm text-ink">
            {report.rewards.map((reward, index) => (
              <li key={`${reward.kind}-${reward.reference ?? reward.name}-${String(index)}`}>
                {reward.name} × {reward.quantity} · {rewardStatusLabel[reward.status]}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {report.loot !== undefined && (
        <Card title="Botín del jefe">
          {report.loot.length === 0 ? (
            <p className="text-sm text-muted">No se obtuvo botín del jefe.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm text-ink">
              {report.loot.map((drop) => (
                <li key={`${drop.label}-${drop.productId ?? 'sin-producto'}`}>
                  {drop.label} × {drop.quantity}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  </>
)

const Stat = ({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}): React.JSX.Element => (
  <div>
    <dt className="text-muted">{label}</dt>
    <dd>{value}</dd>
  </div>
)

export const MissionReportPage = (): React.JSX.Element => {
  const { enrollmentId } = useParams()
  const subject = useSession((state) => state.subject)
  const report = useQuery({
    queryKey: queryKeys.missions.report(subject, enrollmentId ?? ''),
    queryFn: ({ signal }) => fetchMissionReport(enrollmentId ?? '', signal),
    enabled: subject !== null && enrollmentId !== undefined,
  })

  if (enrollmentId === undefined) {
    return <p role="alert">Falta el identificador de la matrícula.</p>
  }

  return (
    <section aria-label="Reporte de misión" className="flex flex-col gap-6">
      <Link to="/missions/history" className="w-fit text-sm text-brand hover:underline">
        ← Volver al historial
      </Link>
      <QueryState isLoading={report.isPending} error={report.error}>
        {report.data !== undefined && <ReportContent report={report.data} />}
      </QueryState>
    </section>
  )
}
