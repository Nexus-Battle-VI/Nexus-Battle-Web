import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { CheckboxField } from '@/components/ui/form/CheckboxField'
import { FIELD_CLASS } from '@/components/ui/form/fieldStyles'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { TextField } from '@/components/ui/form/TextField'

import { ItemBox, ListError, NumberField, PercentField } from './fields'
import {
  CATEGORY_LABELS,
  DEFAULT_RULES,
  DIFFICULTY_LABELS,
  DIFFICULTY_LEVELS,
  IMAGE_REFS,
  MISSION_CATEGORIES,
  OBJECTIVE_LABELS,
  OBJECTIVE_TYPES,
  prepareForSave,
  uniqueRef,
  type ContentObjective,
  type ContentRules,
  type MissionContent,
  type MissionContentCategory,
  type ObjectiveRule,
  type ObjectiveType,
  type RewardLabel,
} from './missionContent'
import { validateMissionContent, type FieldErrors } from './missionContentValidation'
import { i18n } from '@/shared/i18n/i18n'

export interface SectionProps {
  readonly content: MissionContent
  readonly onChange: (content: MissionContent) => void
  readonly errors: FieldErrors
}

const durationHint = (minutes: number): string => {
  if (!Number.isInteger(minutes) || minutes < 1) {
    return i18n.t('admin:missions.content.durationHintUnknown')
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const parts = [
    hours > 0 ? i18n.t('admin:missions.content.hours', { value: String(hours) }) : '',
    rest > 0 ? i18n.t('admin:missions.content.minutes', { value: String(rest) }) : '',
  ]
  return i18n.t('admin:missions.content.durationHint', {
    parts: parts.filter((part) => part !== '').join(' '),
  })
}

export const GeneralSection = ({
  content,
  onChange,
  errors,
  isNew,
  otherMissions,
}: SectionProps & {
  readonly isNew: boolean
  readonly otherMissions: readonly { readonly missionId: string; readonly name: string }[]
}): React.JSX.Element => {
  const { t } = useTranslation()
  const set = (changes: Partial<MissionContent>): void => {
    onChange({ ...content, ...changes })
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={t('admin:missions.content.name')}
          required
          value={content.name}
          error={errors.name}
          onChange={(event) => {
            set({ name: event.target.value })
          }}
        />
        <TextField
          label={t('admin:missions.content.missionId')}
          required
          value={content.missionId}
          readOnly={!isNew}
          hint={
            isNew
              ? t('admin:missions.content.missionIdHintNew')
              : t('admin:missions.content.missionIdHintExisting')
          }
          error={errors.missionId}
          onChange={(event) => {
            set({ missionId: event.target.value.trim() })
          }}
        />
        <SelectField
          label={t('admin:missions.content.category')}
          value={content.category}
          options={MISSION_CATEGORIES.map((category) => ({
            value: category,
            label: CATEGORY_LABELS[category],
          }))}
          onChange={(event) => {
            set({ category: event.target.value as MissionContentCategory })
          }}
        />
        <SelectField
          label={t('admin:missions.content.illustration')}
          value={content.imageRef ?? ''}
          placeholder={t('admin:missions.content.illustrationPlaceholder')}
          options={IMAGE_REFS}
          onChange={(event) => {
            set({ imageRef: event.target.value === '' ? null : event.target.value })
          }}
        />
        <NumberField
          label={t('admin:missions.content.durationMinutes')}
          value={content.estimatedDurationMinutes}
          min={1}
          max={10080}
          hint={durationHint(content.estimatedDurationMinutes)}
          error={errors.estimatedDurationMinutes}
          onChange={(minutes) => {
            set({ estimatedDurationMinutes: minutes ?? Number.NaN })
          }}
        />
        <NumberField
          label={t('admin:missions.content.recommendedPower')}
          value={content.recommendedPower}
          min={0}
          optional
          hint={t('admin:missions.content.recommendedPowerHint')}
          error={errors.recommendedPower}
          onChange={(power) => {
            set({ recommendedPower: power })
          }}
        />
      </div>
      <TextareaField
        label={t('admin:missions.content.boardSummary')}
        required
        rows={2}
        value={content.summary}
        error={errors.summary}
        onChange={(event) => {
          set({ summary: event.target.value })
        }}
      />
      <TextareaField
        label={t('admin:missions.content.story')}
        required
        rows={4}
        value={content.narrative}
        error={errors.narrative}
        onChange={(event) => {
          set({ narrative: event.target.value })
        }}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">
          {t('admin:missions.content.prereqTitle')}
        </legend>
        <p className="text-xs text-muted">{t('admin:missions.content.prereqHint')}</p>
        {otherMissions.length === 0 ? (
          <p className="text-sm text-muted">{t('admin:missions.content.noOtherMissions')}</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {otherMissions.map((mission) => (
              <CheckboxField
                key={mission.missionId}
                label={mission.name}
                checked={content.prerequisites.includes(mission.missionId)}
                onChange={(event) => {
                  set({
                    prerequisites: event.target.checked
                      ? [...content.prerequisites, mission.missionId]
                      : content.prerequisites.filter((id) => id !== mission.missionId),
                  })
                }}
              />
            ))}
          </div>
        )}
      </fieldset>
      <CheckboxField
        label={t('admin:missions.content.published')}
        hint={t('admin:missions.content.publishedHint')}
        checked={content.active}
        onChange={(event) => {
          set({ active: event.target.checked })
        }}
      />
    </div>
  )
}

const ruleFor = (type: ObjectiveType | 'NONE', lootLabel: string): ObjectiveRule | null => {
  switch (type) {
    case 'NONE':
      return null
    case 'DEFEAT_BOSS':
      return { type: 'DEFEAT_BOSS' }
    case 'DEFEAT_MASTER':
      return { type: 'DEFEAT_MASTER' }
    case 'CLEAR_ENCOUNTERS':
      return { type: 'CLEAR_ENCOUNTERS', count: 1 }
    case 'MIN_HEALTH_PERCENT':
      return { type: 'MIN_HEALTH_PERCENT', percent: 50 }
    case 'COLLECT_LOOT':
      return { type: 'COLLECT_LOOT', label: lootLabel, count: 1 }
  }
}

export const ObjectivesSection = ({
  content,
  onChange,
  errors,
}: SectionProps): React.JSX.Element => {
  const { t } = useTranslation()
  const lootLabels = (content.finalBoss.drops ?? []).map((drop) => drop.label)
  const setObjectives = (objectives: readonly ContentObjective[]): void => {
    onChange({ ...content, objectives })
  }
  const update = (index: number, changes: Partial<ContentObjective>): void => {
    setObjectives(
      content.objectives.map((objective, position) =>
        position === index ? { ...objective, ...changes } : objective,
      ),
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t('admin:missions.content.objectivesHelp')}</p>
      <ListError message={errors.objectives} />
      {content.objectives.map((objective, index) => {
        const path = `objectives.${String(index)}`
        const rule = objective.rule
        return (
          <ItemBox
            key={objective.id}
            title={t('admin:missions.content.objectiveN', { n: index + 1 })}
            removeLabel={t('admin:missions.content.removeObjectiveN', { n: index + 1 })}
            onRemove={() => {
              setObjectives(content.objectives.filter((_, position) => position !== index))
            }}
          >
            <TextField
              label={t('admin:missions.content.objectiveText')}
              value={objective.text}
              error={errors[`${path}.text`]}
              onChange={(event) => {
                update(index, { text: event.target.value })
              }}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label={t('admin:missions.content.howMet')}
                value={rule?.type ?? 'NONE'}
                options={(['NONE', ...OBJECTIVE_TYPES] as const).map((type) => ({
                  value: type,
                  label: OBJECTIVE_LABELS[type],
                }))}
                onChange={(event) => {
                  update(index, {
                    rule: ruleFor(
                      event.target.value as ObjectiveType | 'NONE',
                      lootLabels[0] ?? '',
                    ),
                  })
                }}
              />
              {rule?.type === 'CLEAR_ENCOUNTERS' && (
                <NumberField
                  label={t('admin:missions.content.encountersToClear')}
                  value={rule.count}
                  min={1}
                  max={50}
                  error={errors[`${path}.rule`]}
                  onChange={(count) => {
                    update(index, { rule: { ...rule, count: count ?? Number.NaN } })
                  }}
                />
              )}
              {rule?.type === 'MIN_HEALTH_PERCENT' && (
                <NumberField
                  label={t('admin:missions.content.minHealthAtEnd')}
                  value={rule.percent}
                  min={0}
                  max={100}
                  error={errors[`${path}.rule`]}
                  onChange={(percent) => {
                    update(index, { rule: { ...rule, percent: percent ?? Number.NaN } })
                  }}
                />
              )}
              {rule?.type === 'COLLECT_LOOT' && (
                <div className="grid grid-cols-2 gap-2">
                  <SelectField
                    label={t('admin:missions.content.loot')}
                    value={rule.label}
                    placeholder={t('admin:missions.content.chooseBossLoot')}
                    options={lootLabels.map((label) => ({ value: label, label }))}
                    error={errors[`${path}.rule`]}
                    onChange={(event) => {
                      update(index, { rule: { ...rule, label: event.target.value } })
                    }}
                  />
                  <NumberField
                    label={t('admin:missions.content.quantity')}
                    value={rule.count}
                    min={1}
                    max={100}
                    onChange={(count) => {
                      update(index, { rule: { ...rule, count: count ?? Number.NaN } })
                    }}
                  />
                </div>
              )}
            </div>
            <CheckboxField
              label={t('admin:missions.content.primary')}
              hint={t('admin:missions.content.primaryHint')}
              checked={objective.primary}
              onChange={(event) => {
                update(index, { primary: event.target.checked })
              }}
            />
          </ItemBox>
        )
      })}
      <div>
        <Button
          variant="secondary"
          onClick={() => {
            const id = uniqueRef(
              `obj_${String(content.objectives.length + 1)}`,
              new Set(content.objectives.map((objective) => objective.id)),
            )
            setObjectives([
              ...content.objectives,
              { id, text: t('admin:missions.content.newObjective'), primary: false, rule: null },
            ])
          }}
        >
          {t('admin:missions.content.addObjective')}
        </Button>
      </div>
    </div>
  )
}

const LabelList = ({
  title,
  hint,
  items,
  onChange,
  errors,
  path,
}: {
  readonly title: string
  readonly hint: string
  readonly items: readonly RewardLabel[]
  readonly onChange: (items: readonly RewardLabel[]) => void
  readonly errors: FieldErrors
  readonly path: string
}): React.JSX.Element => {
  const { t } = useTranslation()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-ink">{title}</legend>
      <p className="text-xs text-muted">{hint}</p>
      {items.map((item, index) => (
        <div key={`${path}-${String(index)}`} className="flex items-start gap-2">
          <div className="flex-1">
            <TextField
              label={t('admin:missions.content.labelItemN', { title, n: index + 1 })}
              value={item.label}
              error={errors[`${path}.${String(index)}`]}
              onChange={(event) => {
                onChange(
                  items.map((entry, position) =>
                    position === index ? { ...entry, label: event.target.value } : entry,
                  ),
                )
              }}
            />
          </div>
          <Button
            variant="secondary"
            className="mt-6"
            aria-label={t('admin:missions.content.removeLabelItem', {
              title: title.toLowerCase(),
              n: index + 1,
            })}
            onClick={() => {
              onChange(items.filter((_, position) => position !== index))
            }}
          >
            {t('admin:missions.content.remove')}
          </Button>
        </div>
      ))}
      <div>
        <Button
          variant="secondary"
          aria-label={t('admin:missions.content.addToLabel', { title: title.toLowerCase() })}
          onClick={() => {
            onChange([...items, { label: '' }])
          }}
        >
          {t('admin:missions.content.add')}
        </Button>
      </div>
    </fieldset>
  )
}

export const RewardsSection = ({ content, onChange, errors }: SectionProps): React.JSX.Element => {
  const { t } = useTranslation()
  const setRewards = (changes: Partial<MissionContent['rewards']>): void => {
    onChange({ ...content, rewards: { ...content.rewards, ...changes } })
  }
  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-md border border-border bg-surface/40 p-3 text-sm text-ink">
        {t('admin:missions.content.rewardsNote')}
      </p>
      <LabelList
        title={t('admin:missions.content.guaranteed')}
        hint={t('admin:missions.content.guaranteedHint')}
        items={content.rewards.guaranteed}
        errors={errors}
        path="rewards.guaranteed"
        onChange={(guaranteed) => {
          setRewards({ guaranteed })
        }}
      />
      <LabelList
        title={t('admin:missions.content.firstTime')}
        hint={t('admin:missions.content.firstTimeHint')}
        items={content.rewards.firstTime}
        errors={errors}
        path="rewards.firstTime"
        onChange={(firstTime) => {
          setRewards({ firstTime })
        }}
      />
      <LabelList
        title={t('admin:missions.content.byObjectives')}
        hint={t('admin:missions.content.byObjectivesHint')}
        items={content.rewards.objectiveBonuses}
        errors={errors}
        path="rewards.objectiveBonuses"
        onChange={(objectiveBonuses) => {
          setRewards({ objectiveBonuses })
        }}
      />
    </div>
  )
}

export const RulesSection = ({ content, onChange, errors }: SectionProps): React.JSX.Element => {
  const { t } = useTranslation()
  const rules = content.combatRules
  const set = (changes: Partial<ContentRules>): void => {
    onChange({ ...content, combatRules: { ...rules, ...changes } })
  }
  const multipliers = rules.difficultyMultipliers ?? DEFAULT_RULES.difficultyMultipliers
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t('admin:missions.content.rulesHelp')}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <NumberField
          label={t('admin:missions.content.secondsPerTurn')}
          value={rules.turnDurationSeconds}
          min={1}
          max={3600}
          hint={t('admin:missions.content.secondsPerTurnHint')}
          error={errors['combatRules.turnDurationSeconds']}
          onChange={(value) => {
            set({ turnDurationSeconds: value ?? Number.NaN })
          }}
        />
        <NumberField
          label={t('admin:missions.content.maxTurnsPerEncounter')}
          value={rules.maxTurnsPerEncounter}
          min={1}
          max={1000}
          hint={t('admin:missions.content.maxTurnsHint')}
          error={errors['combatRules.maxTurnsPerEncounter']}
          onChange={(value) => {
            set({ maxTurnsPerEncounter: value ?? Number.NaN })
          }}
        />
        <NumberField
          label={t('admin:missions.content.recoveryBetween')}
          value={rules.recoveryPercent}
          min={0}
          max={100}
          error={errors['combatRules.recoveryPercent']}
          onChange={(value) => {
            set({ recoveryPercent: value ?? Number.NaN })
          }}
        />
        <PercentField
          label={t('admin:missions.content.criticalChance')}
          value={rules.criticalChance}
          error={errors['combatRules.criticalChance']}
          onChange={(criticalChance) => {
            set({ criticalChance: criticalChance ?? Number.NaN })
          }}
        />
        <NumberField
          label={t('admin:missions.content.criticalMultiplier')}
          value={rules.criticalMultiplier}
          min={1}
          max={1.8}
          step={0.1}
          error={errors['combatRules.criticalMultiplier']}
          onChange={(value) => {
            set({ criticalMultiplier: value ?? Number.NaN })
          }}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">
          {t('admin:missions.content.difficultyStatsTitle')}
        </legend>
        <p className="text-xs text-muted">{t('admin:missions.content.difficultyStatsHint')}</p>
        <div className="grid gap-3 md:grid-cols-4">
          {DIFFICULTY_LEVELS.map((level) => (
            <NumberField
              key={level}
              label={DIFFICULTY_LABELS[level]}
              value={multipliers?.[level] ?? null}
              min={0.1}
              max={10}
              step={0.1}
              error={errors[`combatRules.difficultyMultipliers.${level}`]}
              onChange={(value) => {
                const base = multipliers ?? { NORMAL: 1, HEROIC: 1.5, LEGENDARY: 2, MYTHIC: 2.5 }
                set({ difficultyMultipliers: { ...base, [level]: value ?? Number.NaN } })
              }}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">
          {t('admin:missions.content.healersTitle')}
        </legend>
        <p className="text-xs text-muted">{t('admin:missions.content.healersHint')}</p>
        <div className="grid gap-3 md:grid-cols-3">
          <NumberField
            label={t('admin:missions.content.supportAttack')}
            value={rules.supportAttack ?? DEFAULT_RULES.supportAttack ?? null}
            min={0}
            max={100}
            error={errors['combatRules.supportAttack']}
            onChange={(value) => {
              set({ supportAttack: value ?? Number.NaN })
            }}
          />
          <NumberField
            label={t('admin:missions.content.supportDamage')}
            value={rules.supportDamage ?? DEFAULT_RULES.supportDamage ?? null}
            min={0}
            max={100}
            error={errors['combatRules.supportDamage']}
            onChange={(value) => {
              set({ supportDamage: value ?? Number.NaN })
            }}
          />
          <NumberField
            label={t('admin:missions.content.supportRegen')}
            value={rules.supportRegen ?? DEFAULT_RULES.supportRegen ?? null}
            min={0}
            max={100}
            error={errors['combatRules.supportRegen']}
            onChange={(value) => {
              set({ supportRegen: value ?? Number.NaN })
            }}
          />
        </div>
      </fieldset>
    </div>
  )
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const everyRecord = (
  value: unknown,
  check: (item: Record<string, unknown>) => boolean = () => true,
): boolean => Array.isArray(value) && value.every((item) => isRecord(item) && check(item))

/** La primera parte que el formulario no podria pintar; lo demas lo valida Missions. */
const shapeProblem = (record: Record<string, unknown>): string | null => {
  const texts = ['missionId', 'name', 'summary', 'narrative'] as const
  const missing = texts.find((key) => typeof record[key] !== 'string')
  if (missing !== undefined) return missing
  if (record.prerequisites !== undefined && !Array.isArray(record.prerequisites)) {
    return 'prerequisites'
  }
  if (!everyRecord(record.objectives, (objective) => typeof objective.text === 'string')) {
    return 'objectives'
  }
  if (!everyRecord(record.enemies, (enemy) => isRecord(enemy.profile))) return 'enemies'
  if (!everyRecord(record.encounters, (encounter) => Array.isArray(encounter.enemies))) {
    return 'encounters'
  }
  const boss = record.finalBoss
  if (!isRecord(boss) || !isRecord(boss.profile)) return 'finalBoss'
  if (!isRecord(record.combatRules)) return 'combatRules'
  const rewards = record.rewards
  if (
    !isRecord(rewards) ||
    !['guaranteed', 'objectiveBonuses', 'firstTime'].every((key) => Array.isArray(rewards[key]))
  ) {
    return 'rewards'
  }
  const master = record.masterEncounter
  if (
    master !== undefined &&
    master !== null &&
    !(
      isRecord(master) &&
      Array.isArray(master.evaluationPoints) &&
      everyRecord(
        master.candidates,
        (candidate) =>
          isRecord(candidate.profile) &&
          isRecord(candidate.epic) &&
          isRecord(candidate.probabilityByHeroType),
      )
    )
  ) {
    return 'masterEncounter'
  }
  return null
}

/** El JSON pegado a mano solo se acepta si el formulario puede pintarlo. */
const parseContent = (source: string, missionId: string, isNew: boolean): MissionContent => {
  const parsed: unknown = JSON.parse(source)
  if (!isRecord(parsed)) throw new Error(i18n.t('admin:missions.content.jsonNotObject'))
  const problem = shapeProblem(parsed)
  if (problem !== null) {
    throw new Error(i18n.t('admin:missions.content.jsonShapeProblem', { field: problem }))
  }
  if (!isNew && parsed.missionId !== missionId) {
    throw new Error(i18n.t('admin:missions.content.jsonIdImmutable'))
  }
  const content = {
    ...parsed,
    prerequisites: parsed.prerequisites ?? [],
    masterEncounter: parsed.masterEncounter ?? null,
    highlightedRewards: parsed.highlightedRewards ?? [],
  } as MissionContent
  // Recorre todo lo que calcula el formulario: si algo no encaja, falla aqui y no al pintar.
  try {
    prepareForSave(content)
    validateMissionContent(content, { isNew, takenIds: new Set() })
  } catch {
    throw new Error(i18n.t('admin:missions.content.jsonInvalidShape'))
  }
  return content
}

export const JsonSection = ({
  content,
  onChange,
  isNew,
}: Omit<SectionProps, 'errors'> & { readonly isNew: boolean }): React.JSX.Element => {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [source, setSource] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const preview = JSON.stringify(prepareForSave(content), null, 2)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t('admin:missions.content.jsonHelp')}</p>
      {editing ? (
        <>
          <TextareaField
            label={t('admin:missions.content.jsonDefinition')}
            rows={24}
            spellCheck={false}
            className={`${FIELD_CLASS} font-mono text-xs`}
            value={source}
            error={problem ?? undefined}
            onChange={(event) => {
              setSource(event.target.value)
              setProblem(null)
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                try {
                  onChange(parseContent(source, content.missionId, isNew))
                  setEditing(false)
                } catch (error: unknown) {
                  setProblem(
                    error instanceof SyntaxError || !(error instanceof Error)
                      ? t('admin:missions.content.jsonInvalid')
                      : error.message,
                  )
                }
              }}
            >
              {t('admin:missions.content.applyJson')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(false)
                setProblem(null)
              }}
            >
              {t('admin:missions.content.cancel')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <pre
            aria-label={t('admin:missions.content.jsonPreview')}
            className="max-h-[32rem] overflow-auto rounded-md border border-border bg-surface p-3 font-mono text-xs text-ink"
          >
            {preview}
          </pre>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                setSource(preview)
                setEditing(true)
              }}
            >
              {t('admin:missions.content.editAsJson')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
