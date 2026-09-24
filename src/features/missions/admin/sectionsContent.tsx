import { useState } from 'react'

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

export interface SectionProps {
  readonly content: MissionContent
  readonly onChange: (content: MissionContent) => void
  readonly errors: FieldErrors
}

const durationHint = (minutes: number): string => {
  if (!Number.isInteger(minutes) || minutes < 1) return 'Tiempo real que tarda la misión.'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const parts = [hours > 0 ? `${String(hours)} h` : '', rest > 0 ? `${String(rest)} min` : '']
  return `Tiempo real que tarda la misión: ${parts.filter((part) => part !== '').join(' ')}.`
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
  const set = (changes: Partial<MissionContent>): void => {
    onChange({ ...content, ...changes })
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Nombre"
          required
          value={content.name}
          error={errors.name}
          onChange={(event) => {
            set({ name: event.target.value })
          }}
        />
        <TextField
          label="Identificador"
          required
          value={content.missionId}
          readOnly={!isNew}
          hint={
            isNew
              ? 'No se cambia después de guardar: minúsculas, números, guion o guion bajo.'
              : 'No se cambia: lo usan las matrículas y los reportes.'
          }
          error={errors.missionId}
          onChange={(event) => {
            set({ missionId: event.target.value.trim() })
          }}
        />
        <SelectField
          label="Categoría"
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
          label="Ilustración"
          value={content.imageRef ?? ''}
          placeholder="La de su categoría"
          options={IMAGE_REFS}
          onChange={(event) => {
            set({ imageRef: event.target.value === '' ? null : event.target.value })
          }}
        />
        <NumberField
          label="Duración (minutos)"
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
          label="Poder recomendado (opcional)"
          value={content.recommendedPower}
          min={0}
          optional
          hint="Solo informativo: no impide matricularse."
          error={errors.recommendedPower}
          onChange={(power) => {
            set({ recommendedPower: power })
          }}
        />
      </div>
      <TextareaField
        label="Resumen del tablón"
        required
        rows={2}
        value={content.summary}
        error={errors.summary}
        onChange={(event) => {
          set({ summary: event.target.value })
        }}
      />
      <TextareaField
        label="Historia"
        required
        rows={4}
        value={content.narrative}
        error={errors.narrative}
        onChange={(event) => {
          set({ narrative: event.target.value })
        }}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">Misiones previas</legend>
        <p className="text-xs text-muted">
          El jugador debe completarlas antes de poder matricularse en esta.
        </p>
        {otherMissions.length === 0 ? (
          <p className="text-sm text-muted">No hay otras misiones.</p>
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
        label="Publicada"
        hint="Visible en el tablón. Mientras la preparas, déjala sin marcar."
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
      <p className="text-sm text-muted">
        La misión se completa cuando se cumplen todos los objetivos principales. Los secundarios
        solo se informan en el reporte.
      </p>
      <ListError message={errors.objectives} />
      {content.objectives.map((objective, index) => {
        const path = `objectives.${String(index)}`
        const rule = objective.rule
        return (
          <ItemBox
            key={objective.id}
            title={`Objetivo ${String(index + 1)}`}
            removeLabel={`Quitar el objetivo ${String(index + 1)}`}
            onRemove={() => {
              setObjectives(content.objectives.filter((_, position) => position !== index))
            }}
          >
            <TextField
              label="Texto que ve el jugador"
              value={objective.text}
              error={errors[`${path}.text`]}
              onChange={(event) => {
                update(index, { text: event.target.value })
              }}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="Cómo se cumple"
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
                  label="Encuentros que hay que superar"
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
                  label="Vida mínima al terminar (%)"
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
                    label="Botín"
                    value={rule.label}
                    placeholder="Elige un botín del jefe"
                    options={lootLabels.map((label) => ({ value: label, label }))}
                    error={errors[`${path}.rule`]}
                    onChange={(event) => {
                      update(index, { rule: { ...rule, label: event.target.value } })
                    }}
                  />
                  <NumberField
                    label="Cantidad"
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
              label="Principal"
              hint="Si no se cumple, la misión termina fallida."
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
              { id, text: 'Nuevo objetivo.', primary: false, rule: null },
            ])
          }}
        >
          Añadir objetivo
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
}): React.JSX.Element => (
  <fieldset className="flex flex-col gap-2">
    <legend className="text-sm font-medium text-ink">{title}</legend>
    <p className="text-xs text-muted">{hint}</p>
    {items.map((item, index) => (
      <div key={`${path}-${String(index)}`} className="flex items-start gap-2">
        <div className="flex-1">
          <TextField
            label={`${title}: recompensa ${String(index + 1)}`}
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
          aria-label={`Quitar ${title.toLowerCase()}: recompensa ${String(index + 1)}`}
          onClick={() => {
            onChange(items.filter((_, position) => position !== index))
          }}
        >
          Quitar
        </Button>
      </div>
    ))}
    <div>
      <Button
        variant="secondary"
        aria-label={`Añadir a ${title.toLowerCase()}`}
        onClick={() => {
          onChange([...items, { label: '' }])
        }}
      >
        Añadir
      </Button>
    </div>
  </fieldset>
)

export const RewardsSection = ({ content, onChange, errors }: SectionProps): React.JSX.Element => {
  const setRewards = (changes: Partial<MissionContent['rewards']>): void => {
    onChange({ ...content, rewards: { ...content.rewards, ...changes } })
  }
  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-md border border-border bg-surface/40 p-3 text-sm text-ink">
        Hoy el jugador recibe la experiencia de cada enemigo, el botín del jefe (pestaña «Jefe y
        botín») y la épica de cada Máster. Estas listas son solo texto: los créditos, cofres y
        títulos no se entregan hasta que esté HU-10.
      </p>
      <LabelList
        title="Garantizadas"
        hint="Por completar la misión."
        items={content.rewards.guaranteed}
        errors={errors}
        path="rewards.guaranteed"
        onChange={(guaranteed) => {
          setRewards({ guaranteed })
        }}
      />
      <LabelList
        title="Primera vez"
        hint="Solo la primera vez que el jugador la completa."
        items={content.rewards.firstTime}
        errors={errors}
        path="rewards.firstTime"
        onChange={(firstTime) => {
          setRewards({ firstTime })
        }}
      />
      <LabelList
        title="Por objetivos"
        hint="Por cumplir objetivos secundarios."
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
  const rules = content.combatRules
  const set = (changes: Partial<ContentRules>): void => {
    onChange({ ...content, combatRules: { ...rules, ...changes } })
  }
  const multipliers = rules.difficultyMultipliers ?? DEFAULT_RULES.difficultyMultipliers
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Cómo simula Combat esta misión. Los valores por defecto ya están equilibrados: cámbialos
        solo si sabes qué efecto tienen.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <NumberField
          label="Segundos por turno"
          value={rules.turnDurationSeconds}
          min={1}
          max={3600}
          hint="Tiempo real que representa cada turno de la bitácora."
          error={errors['combatRules.turnDurationSeconds']}
          onChange={(value) => {
            set({ turnDurationSeconds: value ?? Number.NaN })
          }}
        />
        <NumberField
          label="Turnos máximos por encuentro"
          value={rules.maxTurnsPerEncounter}
          min={1}
          max={1000}
          hint="Si se agotan, el encuentro termina por tiempo."
          error={errors['combatRules.maxTurnsPerEncounter']}
          onChange={(value) => {
            set({ maxTurnsPerEncounter: value ?? Number.NaN })
          }}
        />
        <NumberField
          label="Recuperación entre encuentros (%)"
          value={rules.recoveryPercent}
          min={0}
          max={100}
          error={errors['combatRules.recoveryPercent']}
          onChange={(value) => {
            set({ recoveryPercent: value ?? Number.NaN })
          }}
        />
        <PercentField
          label="Probabilidad de crítico (%)"
          value={rules.criticalChance}
          error={errors['combatRules.criticalChance']}
          onChange={(criticalChance) => {
            set({ criticalChance: criticalChance ?? Number.NaN })
          }}
        />
        <NumberField
          label="Multiplicador de crítico"
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
          Estadísticas enemigas por dificultad
        </legend>
        <p className="text-xs text-muted">Multiplican la vida, el ataque y la defensa enemigos.</p>
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
        <legend className="text-sm font-medium text-ink">Héroes sanadores</legend>
        <p className="text-xs text-muted">
          Cómo actúa un héroe sin ataque propio (Chamán o Médico).
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <NumberField
            label="Ataque de apoyo"
            value={rules.supportAttack ?? DEFAULT_RULES.supportAttack ?? null}
            min={0}
            max={100}
            error={errors['combatRules.supportAttack']}
            onChange={(value) => {
              set({ supportAttack: value ?? Number.NaN })
            }}
          />
          <NumberField
            label="Daño de apoyo"
            value={rules.supportDamage ?? DEFAULT_RULES.supportDamage ?? null}
            min={0}
            max={100}
            error={errors['combatRules.supportDamage']}
            onChange={(value) => {
              set({ supportDamage: value ?? Number.NaN })
            }}
          />
          <NumberField
            label="Regeneración por turno"
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
  if (!isRecord(parsed)) throw new Error('El JSON debe ser un objeto.')
  const problem = shapeProblem(parsed)
  if (problem !== null) throw new Error(`Falta «${problem}» o no tiene la forma esperada.`)
  if (!isNew && parsed.missionId !== missionId) {
    throw new Error('El identificador de una misión guardada no se cambia.')
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
    throw new Error('El JSON no tiene la forma de una misión: revisa sus listas y textos.')
  }
  return content
}

export const JsonSection = ({
  content,
  onChange,
  isNew,
}: Omit<SectionProps, 'errors'> & { readonly isNew: boolean }): React.JSX.Element => {
  const [editing, setEditing] = useState(false)
  const [source, setSource] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const preview = JSON.stringify(prepareForSave(content), null, 2)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Esto es lo que se enviará a Missions al guardar. Solo hace falta en casos avanzados: el
        formulario ya calcula el total de cada enemigo, el encuentro del jefe y sus estadísticas
        visibles.
      </p>
      {editing ? (
        <>
          <TextareaField
            label="Definición JSON"
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
                      ? 'El JSON no es válido.'
                      : error.message,
                  )
                }
              }}
            >
              Aplicar JSON
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(false)
                setProblem(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <>
          <pre
            aria-label="Vista previa del JSON"
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
              Editar como JSON
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
