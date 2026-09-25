import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { formatDateTime } from '@/lib/format'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { localizedMessages } from '@/shared/i18n/messages'

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

const OUTCOME_LABEL: Readonly<Record<'COMPLETED' | 'FAILED' | 'ABANDONED', string>> =
  localizedMessages({
    COMPLETED: 'missions:report.outcome.COMPLETED',
    FAILED: 'missions:report.outcome.FAILED',
    ABANDONED: 'missions:report.outcome.ABANDONED',
  })

const objectiveStatus = (met: boolean | null, t: TFunction): string =>
  met === null
    ? t('missions:report.objectiveUnevaluated')
    : met
      ? t('missions:report.objectiveMet')
      : t('missions:report.objectiveNotMet')

const valueLabel = (value: number | null, t: TFunction): string =>
  value === null ? t('missions:report.noValue') : String(value)

/** «3 veces», «1 vez». */
const timesLabel = (times: number, t: TFunction): string =>
  times === 1 ? t('missions:report.timesOnce') : t('missions:report.timesMany', { count: times })

/** Qué hizo la estrategia (P-J5): lo que se usó y por qué se saltó lo demás. */
const StrategyCard = ({
  strategy,
}: {
  readonly strategy: NonNullable<MissionReport['strategy']>
}): React.JSX.Element => {
  const { t } = useTranslation()
  return (
    <Card title={t('missions:report.strategyTitle')}>
      <ul className="flex flex-col gap-2 text-sm text-ink">
        {strategy.abilities.map((ability) => {
          const skipped = Object.entries(ability.skipped)
          return (
            <li key={ability.abilityId}>
              <span className="font-medium">{ability.name}</span>:{' '}
              {ability.used === 0
                ? t('missions:report.abilityNotUsed')
                : t('missions:report.abilityUsed', { times: timesLabel(ability.used, t) })}
              {skipped.length === 0
                ? ''
                : t('missions:report.skippedIntro', {
                    list: skipped
                      .map(([reason, times]) =>
                        t('missions:report.skippedReason', {
                          times: timesLabel(times, t),
                          reason: skipReasonLabel(reason),
                        }),
                      )
                      .join(', '),
                  })}
              .
            </li>
          )
        })}
        <li>{t('missions:report.basicAttacksChosen', { count: strategy.basicAttacks })}</li>
        {strategy.fallbackAttacks > 0 && (
          <li>{t('missions:report.fallbackAttacks', { count: strategy.fallbackAttacks })}</li>
        )}
      </ul>
    </Card>
  )
}

const ReportContent = ({
  report,
  experienceReport,
}: {
  readonly report: MissionReport
  readonly experienceReport: ExperienceReport | undefined
}): React.JSX.Element => {
  const { t } = useTranslation()
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
        <h1 className="text-2xl font-semibold text-ink">
          {t('missions:report.title', { mission: report.mission.name })}
        </h1>
        <p className="mt-2 text-sm text-ink">
          {t('missions:report.summaryLine', {
            outcome: OUTCOME_LABEL[report.summary.outcome],
            hero: report.summary.hero.name ?? report.summary.hero.heroId,
            date: formatDateTime(report.summary.finishedAt),
          })}
        </p>
        {report.summary.outcomeReason !== null && (
          <p className="mt-1 text-sm text-muted">{report.summary.outcomeReason}</p>
        )}
        {report.summary.simulatedDuration !== null && (
          <p className="mt-1 text-sm text-muted">
            {t('missions:report.simulatedTime', {
              time: durationLabel(report.summary.simulatedDuration),
            })}
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
        <Card title={t('missions:report.combatTitle')}>
          <dl className="grid grid-cols-2 gap-2 text-sm text-ink">
            <Stat
              label={t('missions:report.encountersCompleted')}
              value={valueLabel(report.combatStats.encountersCompleted, t)}
            />
            <Stat
              label={t('missions:report.encountersTotal')}
              value={valueLabel(report.combatStats.encountersTotal, t)}
            />
            <Stat label={t('missions:report.turns')} value={valueLabel(report.combatStats.totalTurns, t)} />
            <Stat
              label={t('missions:report.damageDealt')}
              value={valueLabel(report.combatStats.damageDealt, t)}
            />
            <Stat
              label={t('missions:report.damageTaken')}
              value={valueLabel(report.combatStats.damageTaken, t)}
            />
            <Stat
              label={t('missions:report.criticalEffects')}
              value={valueLabel(report.combatStats.criticalEffects, t)}
            />
            {report.combatStats.healingDone !== undefined && (
              <Stat
                label={t('missions:report.healingDone')}
                value={valueLabel(report.combatStats.healingDone, t)}
              />
            )}
            {report.combatStats.abilityDamage !== undefined && (
              <Stat
                label={t('missions:report.abilityDamage')}
                value={valueLabel(report.combatStats.abilityDamage, t)}
              />
            )}
          </dl>
          {report.combatStats.skillsUsed.length > 0 && (
            <div className="mt-4 text-sm text-ink">
              <h3 className="font-medium">{t('missions:report.skillsUsedTitle')}</h3>
              <ul className="list-inside list-disc">
                {report.combatStats.skillsUsed.map((skill) => (
                  <li key={skill.abilityId}>
                    {abilityNames.get(skill.abilityId) ?? t('missions:report.unnamedAbility')}:{' '}
                    {timesLabel(skill.count, t)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {report.strategy !== undefined && <StrategyCard strategy={report.strategy} />}

        <Card title={t('missions:report.enemiesTitle')}>
          <ul className="list-inside list-disc text-sm text-ink">
            {report.enemies.defeated.map((enemy) => (
              <li key={enemy.enemyRef}>
                {enemy.name} × {enemy.count}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-ink">
            {t('missions:report.bossLine', {
              name: report.enemies.boss.name,
              status: report.enemies.boss.defeated
                ? t('missions:report.bossDefeated')
                : t('missions:report.bossNotDefeated'),
            })}
          </p>
          {report.enemies.masters.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-sm text-ink">
              {report.enemies.masters.map((master) => (
                <li key={master.masterRef}>
                  {t('missions:report.masterLine', {
                    name: master.name,
                    status: masterStatusLabel(master.status),
                  })}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('missions:detail.objectivesTitle')}>
          <ul className="flex flex-col gap-2 text-sm text-ink">
            {report.objectives.map((objective) => (
              <li key={objective.id}>
                {objective.text} · {objectiveStatus(objective.met, t)}
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t('missions:report.rewardsTitle')}>
          {/* La experiencia tiene su propio panel: aquí van las épicas y los objetos. */}
          {deliveries.length === 0 ? (
            <p className="text-sm text-muted">{t('missions:report.noDeliveries')}</p>
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
          <Card title={t('missions:report.bossLootTitle')}>
            {report.loot.length === 0 ? (
              <p className="text-sm text-muted">{t('missions:report.noBossLoot')}</p>
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
  const { t } = useTranslation()
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
    return <p role="alert">{t('missions:report.missingEnrollmentId')}</p>
  }

  return (
    <section aria-label={t('missions:report.label')} className="flex flex-col gap-6">
      <Link to="/missions/history" className="w-fit text-sm text-brand hover:underline">
        {t('missions:report.backToHistory')}
      </Link>
      <QueryState isLoading={report.isPending} error={report.error}>
        {report.data !== undefined && (
          <ReportContent report={report.data} experienceReport={withExperience.data} />
        )}
      </QueryState>
    </section>
  )
}
