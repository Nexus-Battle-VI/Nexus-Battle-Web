import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { fetchCanonicalProduct } from '@/features/catalog/api'
import type { AvailableHero } from '@/features/player-inventory/heroSelectionApi'
import { HttpError } from '@/lib/http'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import {
  fetchMissionStrategy,
  saveMissionStrategy,
  type Rotation,
  type RotationStep,
} from './missionStrategyApi'
import type { EstimatedAbility } from './missionPlayApi'
import { useTranslation } from 'react-i18next'
import { localizedMessages } from '@/shared/i18n/messages'

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
const PRIORITY_LABELS = localizedMessages({
  HIGH: 'missions:strategy.priority.HIGH',
  MEDIUM: 'missions:strategy.priority.MEDIUM',
  LOW: 'missions:strategy.priority.LOW',
})
const BASIC: RotationStep = { kind: 'BASIC_ATTACK' }
const initialRotations = (): Rotation[] => [{ priority: 'HIGH', steps: [BASIC] }]

interface AbilityOption {
  readonly abilityId: string
  readonly name: string
}

export interface MissionStrategyEditorProps {
  readonly missionId: string
  readonly hero: AvailableHero
  /** `ready=false` bloquea la matrícula mientras hay una edición sin guardar o un fallo. */
  readonly onVersionChange: (version: number | null, ready: boolean) => void
  /**
   * Qué habilidades sirven en misiones, según Combat (P-J4). Opcional: sin estimación
   * todavía, las opciones se muestran sin marcar.
   */
  readonly abilityChecks?: readonly EstimatedAbility[] | undefined
}

export const MissionStrategyEditor = ({
  missionId,
  hero,
  onVersionChange,
  abilityChecks,
}: MissionStrategyEditorProps): React.JSX.Element => {
  const { t } = useTranslation()
  const unusable = new Set(
    (abilityChecks ?? []).filter((ability) => !ability.usable).map((ability) => ability.abilityId),
  )
  const subject = useSession((state) => state.subject)
  const queryClient = useQueryClient()
  const strategyKey = queryKeys.missions.strategy(subject, missionId, hero.heroId)
  const [draft, setDraft] = useState<readonly Rotation[] | null>(null)
  const strategy = useQuery({
    queryKey: strategyKey,
    queryFn: ({ signal }) => fetchMissionStrategy(missionId, hero.heroId, signal),
    enabled: subject !== null,
  })
  const rotations = draft ?? strategy.data?.rotations ?? initialRotations()
  const dirty = draft !== null
  const abilities = useQuery({
    queryKey: queryKeys.missions.strategyAbilities(subject, hero.heroId),
    queryFn: async ({ signal }): Promise<readonly AbilityOption[]> => {
      const products = await Promise.all(
        hero.abilities.map((ability) => fetchCanonicalProduct(ability.reference, signal)),
      )
      return products
        .filter((product) => product.type === 'HABILIDAD')
        .map((product) => ({ abilityId: product.productId, name: product.name }))
    },
    enabled: subject !== null && hero.abilities.length > 0,
  })
  const save = useMutation({
    mutationFn: (value: readonly Rotation[]) =>
      saveMissionStrategy(missionId, hero.heroId, strategy.data?.version ?? null, value),
    onSuccess: (saved) => {
      queryClient.setQueryData(strategyKey, saved)
      setDraft(null)
      onVersionChange(saved.version, true)
    },
    onError: (error) => {
      if (
        error instanceof HttpError &&
        error.status === 409 &&
        typeof error.body === 'object' &&
        error.body !== null &&
        'code' in error.body &&
        error.body.code === 'VERSION_CONFLICT'
      ) {
        setDraft(null)
        onVersionChange(null, false)
        void queryClient.invalidateQueries({ queryKey: strategyKey })
      }
    },
  })

  useEffect(() => {
    if (strategy.isSuccess) {
      onVersionChange(strategy.data?.version ?? null, !dirty && !strategy.isFetching)
    }
  }, [strategy.data, strategy.isSuccess, strategy.isFetching, dirty, onVersionChange])

  useEffect(() => {
    if (strategy.isError) onVersionChange(null, false)
  }, [strategy.isError, onVersionChange])

  const change = (next: readonly Rotation[]): void => {
    setDraft(next)
    save.reset()
    onVersionChange(strategy.data?.version ?? null, false)
  }

  const setStep = (rotationIndex: number, stepIndex: number, value: string): void => {
    change(
      rotations.map((rotation, index) =>
        index === rotationIndex
          ? {
              ...rotation,
              steps: rotation.steps.map((step, actionIndex) =>
                actionIndex === stepIndex
                  ? value === 'BASIC_ATTACK'
                    ? BASIC
                    : { kind: 'ABILITY', abilityId: value }
                  : step,
              ),
            }
          : rotation,
      ),
    )
  }

  const abilityOptions = abilities.data ?? []

  return (
    <Card title={t('missions:strategy.title')} description={t('missions:strategy.description')}>
      <QueryState isLoading={strategy.isPending} error={strategy.error}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {strategy.data === null
              ? t('missions:strategy.noSaved')
              : t('missions:strategy.savedVersion', {
                  version: String(strategy.data?.version ?? ''),
                })}
          </p>
          {hero.abilities.length > 0 && abilities.isPending && (
            <p role="status" className="text-sm text-muted">
              {t('missions:strategy.loadingAbilities')}
            </p>
          )}
          {abilities.isError && (
            <p role="alert" className="text-sm text-danger">
              {t('missions:strategy.abilitiesError')}
            </p>
          )}

          {rotations.map((rotation, rotationIndex) => (
            <div key={rotation.priority} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-ink">
                  {t('missions:strategy.rotationHeading', {
                    n: rotationIndex + 1,
                    priority: PRIORITY_LABELS[rotation.priority],
                  })}
                </h3>
                {rotations.length > 1 && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      change(
                        rotations
                          .filter((_, index) => index !== rotationIndex)
                          .map((item, index) => ({
                            ...item,
                            priority: PRIORITIES[index] ?? 'HIGH',
                          })),
                      )
                    }}
                  >
                    {t('missions:strategy.removeRotation')}
                  </Button>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {rotation.steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="flex flex-wrap items-end gap-2">
                    <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm text-ink">
                      {t('missions:strategy.actionN', { n: stepIndex + 1 })}
                      <select
                        value={step.kind === 'ABILITY' ? step.abilityId : 'BASIC_ATTACK'}
                        onChange={(event) => {
                          setStep(rotationIndex, stepIndex, event.target.value)
                        }}
                        className="rounded-md border border-border bg-surface-raised px-3 py-2"
                      >
                        <option value="BASIC_ATTACK">{t('missions:strategy.basicAttack')}</option>
                        {abilityOptions.map((ability) => (
                          <option key={ability.abilityId} value={ability.abilityId}>
                            {ability.name}
                            {unusable.has(ability.abilityId)
                              ? t('missions:strategy.notUsableSuffix')
                              : ''}
                          </option>
                        ))}
                        {step.kind === 'ABILITY' &&
                          !abilityOptions.some(
                            (ability) => ability.abilityId === step.abilityId,
                          ) && (
                            <option value={step.abilityId}>
                              {t('missions:strategy.unnamedAbility', { id: step.abilityId })}
                            </option>
                          )}
                      </select>
                    </label>
                    <Button
                      variant="secondary"
                      disabled={rotation.steps.length === 1}
                      onClick={() => {
                        change(
                          rotations.map((item, index) =>
                            index === rotationIndex
                              ? {
                                  ...item,
                                  steps: item.steps.filter(
                                    (_, actionIndex) => actionIndex !== stepIndex,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }}
                    >
                      {t('missions:strategy.removeAction')}
                    </Button>
                  </div>
                ))}
                {rotation.steps.length < 3 && (
                  <Button
                    variant="secondary"
                    className="w-fit"
                    onClick={() => {
                      change(
                        rotations.map((item, index) =>
                          index === rotationIndex
                            ? { ...item, steps: [...item.steps, BASIC] }
                            : item,
                        ),
                      )
                    }}
                  >
                    {t('missions:strategy.addAction')}
                  </Button>
                )}
              </div>
            </div>
          ))}

          {rotations.length < 3 && (
            <Button
              variant="secondary"
              className="w-fit"
              onClick={() => {
                change([
                  ...rotations,
                  { priority: PRIORITIES[rotations.length] ?? 'HIGH', steps: [BASIC] },
                ])
              }}
            >
              {t('missions:strategy.addRotation')}
            </Button>
          )}
          {save.error !== null && (
            <p role="alert" className="text-sm text-danger">
              {save.error.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!dirty || save.isPending}
              loading={save.isPending}
              onClick={() => {
                save.mutate(rotations)
              }}
            >
              {t('missions:strategy.save')}
            </Button>
            {dirty && (
              <Button
                variant="secondary"
                onClick={() => {
                  setDraft(null)
                  save.reset()
                  onVersionChange(strategy.data?.version ?? null, true)
                }}
              >
                {t('missions:strategy.discard')}
              </Button>
            )}
          </div>
        </div>
      </QueryState>
    </Card>
  )
}
