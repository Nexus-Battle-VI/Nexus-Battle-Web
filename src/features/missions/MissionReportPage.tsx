import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { formatDateTime } from '@/lib/format'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { difficultyName } from './difficultyPresentation'
import {
  categoryLabel,
  durationLabel,
  masterStatusLabel,
  rewardKindLabel,
  rewardStatusLabel,
  skipReasonLabel,
} from './missionPresentation'
import type { MissionReport as ExperienceReport } from './api'
import { MissionExperiencePanel } from './MissionExperiencePanel'
import { experienceLinesOf, readExperience } from './missionReport'
import { fetchMissionReport, type MissionReport } from './missionReportApi'
import { useMissionReport } from './useMissionReport'

const OUTCOME_LABEL = {
  COMPLETED: 'Completada',
  FAILED: 'Fallida',
  ABANDONED: 'Abandonada',
} as const

const objectiveStatus = (met: boolean | null): string =>
  met === null ? 'Sin evaluar' : met ? 'Cumplido' : 'No cumplido'

const valueLabel = (value: number | null): string => (value === null ? 'Sin dato' : String(value))

/** «3 veces», «1 vez». */
const timesLabel = (times: number): string => (times === 1 ? '1 vez' : `${String(times)} veces`)

/** Qué hizo la estrategia (P-J5): lo que se usó y por qué se saltó lo demás. */
const StrategyCard = ({
  strategy,
}: {
  readonly strategy: NonNullable<MissionReport['strategy']>
}): React.JSX.Element => (
  <Card title="Tu estrategia">
    <ul className="flex flex-col gap-2 text-sm text-ink">
      {strategy.abilities.map((ability) => {
        const skipped = Object.entries(ability.skipped)
        return (
          <li key={ability.abilityId}>
            <span className="font-medium">{ability.name}</span>:{' '}
            {ability.used === 0 ? 'no se usó' : `usada ${timesLabel(ability.used)}`}
            {skipped.length === 0
              ? ''
              : `; se saltó ${skipped
                  .map(
                    ([reason, times]) => `${timesLabel(times)} porque ${skipReasonLabel(reason)}`,
                  )
                  .join(', ')}`}
            .
          </li>
        )
      })}
      <li>Ataques básicos elegidos por la estrategia: {strategy.basicAttacks}.</li>
      {strategy.fallbackAttacks > 0 && (
        <li>
          Ataques básicos de respaldo, cuando ninguna rotación se podía usar:{' '}
          {strategy.fallbackAttacks}.
        </li>
      )}
    </ul>
  </Card>
)

const ReportContent = ({
  report,
  experienceReport,
}: {
  readonly report: MissionReport
  readonly experienceReport: ExperienceReport | undefined
}): React.JSX.Element => {
  // Los nombres de las habilidades salen de la estrategia del reporte (P-J5).
  const abilityNames = new Map(
    (report.strategy?.abilities ?? []).map((ability) => [ability.abilityId, ability.name]),
  )
  const deliveries = report.rewards.filter((reward) => reward.kind !== 'EXPERIENCE')

  return (
    <>
      <header>
        <p className="text-sm text-muted">
          {categoryLabel[report.mission.category]} · {difficultyName(report.mission.difficulty)}
        </p>
        <h1 className="text-2xl font-semibold text-ink">Reporte: {report.mission.name}</h1>
        <p className="mt-2 text-sm text-ink">
          {OUTCOME_LABEL[report.summary.outcome]} · Héroe:{' '}
          {report.summary.hero.name ?? report.summary.hero.heroId} · Terminó{' '}
          {formatDateTime(report.summary.finishedAt)}
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

      {experienceReport !== undefined && (
        <MissionExperiencePanel
          experience={readExperience(experienceReport)}
          lines={experienceLinesOf(experienceReport)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Combate">
          <dl className="grid grid-cols-2 gap-2 text-sm text-ink">
            <Stat
              label="Encuentros completados"
              value={valueLabel(report.combatStats.encountersCompleted)}
            />
            <Stat
              label="Encuentros totales"
              value={valueLabel(report.combatStats.encountersTotal)}
            />
            <Stat label="Turnos" value={valueLabel(report.combatStats.totalTurns)} />
            <Stat label="Daño causado" value={valueLabel(report.combatStats.damageDealt)} />
            <Stat label="Daño recibido" value={valueLabel(report.combatStats.damageTaken)} />
            <Stat label="Efectos críticos" value={valueLabel(report.combatStats.criticalEffects)} />
            {report.combatStats.healingDone !== undefined && (
              <Stat
                label="Vida curada con habilidades"
                value={valueLabel(report.combatStats.healingDone)}
              />
            )}
            {report.combatStats.abilityDamage !== undefined && (
              <Stat
                label="Daño de habilidades"
                value={valueLabel(report.combatStats.abilityDamage)}
              />
            )}
          </dl>
          {report.combatStats.skillsUsed.length > 0 && (
            <div className="mt-4 text-sm text-ink">
              <h3 className="font-medium">Habilidades usadas</h3>
              <ul className="list-inside list-disc">
                {report.combatStats.skillsUsed.map((skill) => (
                  <li key={skill.abilityId}>
                    {abilityNames.get(skill.abilityId) ?? 'Habilidad'}: {timesLabel(skill.count)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {report.strategy !== undefined && <StrategyCard strategy={report.strategy} />}

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
                  Máster {master.name}: {masterStatusLabel(master.status)}
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
          {/* La experiencia tiene su propio panel: aquí van las épicas y los objetos. */}
          {deliveries.length === 0 ? (
            <p className="text-sm text-muted">No hay épicas ni objetos que entregar.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm text-ink">
              {deliveries.map((reward, index) => (
                <li key={`${reward.kind}-${reward.reference ?? reward.name}-${String(index)}`}>
                  {rewardKindLabel(reward.kind)}: {reward.name}
                  {reward.kind === 'PRODUCT' && reward.quantity > 1
                    ? ` (${String(reward.quantity)})`
                    : ''}{' '}
                  · {rewardStatusLabel[reward.status]}
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
}

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
  const { enrollmentId } = useParams<{ enrollmentId: string }>()
  const subject = useSession((state) => state.subject)
  const report = useQuery({
    queryKey: queryKeys.missions.report(subject, enrollmentId ?? ''),
    queryFn: ({ signal }) => fetchMissionReport(enrollmentId ?? '', signal),
    enabled: enrollmentId !== undefined,
  })
  // Misma clave que la consulta de arriba: TanStack Query comparte la respuesta.
  // Este observador lee la experiencia de HU-09 y vuelve a pedir el reporte
  // mientras quedan derrotas por acreditar.
  const withExperience = useMissionReport(enrollmentId ?? null)

  if (enrollmentId === undefined) {
    return <p role="alert">Falta el identificador de la matrícula.</p>
  }

  return (
    <section aria-label="Reporte de misión" className="flex flex-col gap-6">
      <Link to="/missions/history" className="w-fit text-sm text-brand hover:underline">
        ← Volver al historial
      </Link>
      <QueryState isLoading={report.isPending} error={report.error}>
        {report.data !== undefined && (
          <ReportContent report={report.data} experienceReport={withExperience.data} />
        )}
      </QueryState>
    </section>
  )
}
