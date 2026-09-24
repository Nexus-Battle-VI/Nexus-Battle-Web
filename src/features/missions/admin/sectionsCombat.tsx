import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { CheckboxField } from '@/components/ui/form/CheckboxField'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { TextField } from '@/components/ui/form/TextField'

import { heroTypeLabel } from '../missionPresentation'
import { FighterFields, ItemBox, ListError, NumberField, PercentField } from './fields'
import {
  appearancesOf,
  bossStatsOf,
  HERO_SUBTYPES,
  masterChanceOf,
  newEnemyProfile,
  newMasterCandidate,
  OFFICIAL_EPICS,
  regularEncountersOf,
  uniqueRef,
  withRegularEncounters,
  type ContentBoss,
  type ContentDrop,
  type ContentEncounter,
  type ContentEnemy,
  type ContentMaster,
  type ContentMasterCandidate,
  type EncounterGroup,
  type FighterAi,
} from './missionContent'
import type { FieldErrors } from './missionContentValidation'
import { ProductPicker } from './ProductPicker'
import type { SectionProps } from './sectionsContent'

const ALL_AI: readonly FighterAi[] = ['AGGRESSIVE', 'GUARDED', 'BOSS']
const BOSS_AI: readonly FighterAi[] = ['BOSS', 'AGGRESSIVE', 'GUARDED']
const SUBTYPE_OPTIONS = HERO_SUBTYPES.map((subtype) => ({
  value: subtype,
  label: heroTypeLabel(subtype),
}))

const POWER_STEP_HINT =
  'Sube vida, ataque y defensa enemigas en este encuentro: 10 % es un 10 % más. Vacío o 0: sin refuerzo.'

const percentText = (fraction: number): string =>
  `${(Math.round(fraction * 1000) / 10).toLocaleString('es-CO')} %`

const moved = <T,>(list: readonly T[], from: number, to: number): readonly T[] => {
  const item = list[from]
  if (item === undefined || to < 0 || to >= list.length) return list
  const rest = list.filter((_, position) => position !== from)
  return [...rest.slice(0, to), item, ...rest.slice(to)]
}

const EnemyTypes = ({ content, onChange, errors }: SectionProps): React.JSX.Element => {
  const appearances = appearancesOf(content)
  const update = (index: number, changes: Partial<ContentEnemy>): void => {
    onChange({
      ...content,
      enemies: content.enemies.map((enemy, position) =>
        position === index ? { ...enemy, ...changes } : enemy,
      ),
    })
  }
  const remove = (index: number): void => {
    const ref = content.enemies[index]?.enemyRef
    const enemies = content.enemies.filter((_, position) => position !== index)
    const regular = regularEncountersOf(content).map((encounter) => ({
      ...encounter,
      enemies: encounter.enemies.filter((group) => group.enemyRef !== ref),
    }))
    onChange(withRegularEncounters({ ...content, enemies }, regular))
  }
  const add = (): void => {
    const taken = new Set([
      content.finalBoss.enemyRef,
      ...content.enemies.map((enemy) => enemy.enemyRef),
    ])
    onChange({
      ...content,
      enemies: [
        ...content.enemies,
        {
          enemyRef: uniqueRef('enemigo', taken),
          name: 'Nuevo enemigo',
          count: 0,
          description: null,
          profile: newEnemyProfile(),
        },
      ],
    })
  }

  return (
    <section aria-labelledby="tipos-de-enemigo" className="flex flex-col gap-3">
      <h3 id="tipos-de-enemigo" className="text-base font-semibold text-ink">
        Tipos de enemigo
      </h3>
      <p className="text-sm text-muted">
        Cada tipo se define una vez. Cuántos hay en total lo dicen los encuentros.
      </p>
      <ListError message={errors.enemies} />
      {content.enemies.map((enemy, index) => {
        const path = `enemies.${String(index)}`
        const title = enemy.name.trim() === '' ? `Enemigo ${String(index + 1)}` : enemy.name
        const total = appearances.get(enemy.enemyRef) ?? 0
        return (
          <ItemBox
            key={enemy.enemyRef}
            title={title}
            removeLabel={`Quitar ${title}`}
            onRemove={() => {
              remove(index)
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="Nombre"
                value={enemy.name}
                error={errors[`${path}.name`]}
                onChange={(event) => {
                  update(index, { name: event.target.value })
                }}
              />
              <TextareaField
                label="Descripción (opcional)"
                rows={2}
                value={enemy.description ?? ''}
                onChange={(event) => {
                  update(index, { description: event.target.value })
                }}
              />
            </div>
            <p className="text-sm text-ink">
              En total: <span className="font-medium">{total}</span> en los encuentros.{' '}
              <span className="text-xs text-muted">Identificador: {enemy.enemyRef}</span>
            </p>
            <ListError message={errors[`${path}.count`] ?? errors[`${path}.enemyRef`]} />
            <FighterFields
              profile={enemy.profile}
              path={`${path}.profile`}
              errors={errors}
              aiOptions={ALL_AI}
              onChange={(profile) => {
                update(index, { profile })
              }}
            />
          </ItemBox>
        )
      })}
      <div>
        <Button variant="secondary" onClick={add}>
          Añadir tipo de enemigo
        </Button>
      </div>
    </section>
  )
}

const Encounters = ({ content, onChange, errors }: SectionProps): React.JSX.Element => {
  const regular = regularEncountersOf(content)
  const setRegular = (next: readonly ContentEncounter[]): void => {
    onChange(withRegularEncounters(content, next))
  }
  const update = (index: number, changes: Partial<ContentEncounter>): void => {
    setRegular(
      regular.map((encounter, position) =>
        position === index ? { ...encounter, ...changes } : encounter,
      ),
    )
  }
  const enemyOptions = content.enemies.map((enemy) => ({
    value: enemy.enemyRef,
    label: enemy.name.trim() === '' ? enemy.enemyRef : enemy.name,
  }))
  const firstEnemy = content.enemies[0]?.enemyRef

  return (
    <section aria-labelledby="encuentros" className="flex flex-col gap-3">
      <h3 id="encuentros" className="text-base font-semibold text-ink">
        Encuentros
      </h3>
      <p className="text-sm text-muted">
        Se juegan en este orden. Después del último llega el jefe final, que se configura en su
        pestaña.
      </p>
      <ListError message={errors.encounters} />
      {regular.map((encounter, index) => {
        const path = `encounters.${String(index)}`
        const number = String(index + 1)
        const setGroup = (groupIndex: number, changes: Partial<EncounterGroup>): void => {
          update(index, {
            enemies: encounter.enemies.map((entry, position) =>
              position === groupIndex ? { ...entry, ...changes } : entry,
            ),
          })
        }
        return (
          <ItemBox
            key={`encuentro-${number}`}
            title={`Encuentro ${number}`}
            removeLabel={`Quitar el encuentro ${number}`}
            onRemove={() => {
              setRegular(regular.filter((_, position) => position !== index))
            }}
          >
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={index === 0}
                aria-label={`Subir el encuentro ${number}`}
                onClick={() => {
                  setRegular(moved(regular, index, index - 1))
                }}
              >
                Subir
              </Button>
              <Button
                variant="secondary"
                disabled={index === regular.length - 1}
                aria-label={`Bajar el encuentro ${number}`}
                onClick={() => {
                  setRegular(moved(regular, index, index + 1))
                }}
              >
                Bajar
              </Button>
            </div>
            {encounter.enemies.map((group, groupIndex) => {
              const groupNumber = String(groupIndex + 1)
              return (
                <div
                  key={`grupo-${groupNumber}`}
                  className="grid items-start gap-2 sm:grid-cols-[1fr_8rem_auto]"
                >
                  <SelectField
                    label={`Grupo ${groupNumber}: enemigo`}
                    value={group.enemyRef}
                    placeholder="Elige un enemigo"
                    options={enemyOptions}
                    error={errors[`${path}.enemies.${String(groupIndex)}`]}
                    onChange={(event) => {
                      setGroup(groupIndex, { enemyRef: event.target.value })
                    }}
                  />
                  <NumberField
                    label={`Grupo ${groupNumber}: cantidad`}
                    value={group.count}
                    min={1}
                    onChange={(count) => {
                      setGroup(groupIndex, { count: count ?? Number.NaN })
                    }}
                  />
                  <Button
                    variant="secondary"
                    className="sm:mt-6"
                    aria-label={`Quitar el grupo ${groupNumber} del encuentro ${number}`}
                    onClick={() => {
                      update(index, {
                        enemies: encounter.enemies.filter((_, position) => position !== groupIndex),
                      })
                    }}
                  >
                    Quitar
                  </Button>
                </div>
              )
            })}
            <ListError message={errors[`${path}.enemies`]} />
            <div>
              <Button
                variant="secondary"
                disabled={firstEnemy === undefined}
                aria-label={`Añadir un grupo al encuentro ${number}`}
                onClick={() => {
                  if (firstEnemy === undefined) return
                  update(index, {
                    enemies: [...encounter.enemies, { enemyRef: firstEnemy, count: 1 }],
                  })
                }}
              >
                Añadir grupo
              </Button>
            </div>
            <PercentField
              label="Refuerzo de este encuentro (%)"
              value={encounter.powerStep}
              optional
              max={200}
              hint={POWER_STEP_HINT}
              error={errors[`${path}.powerStep`]}
              onChange={(powerStep) => {
                update(index, { powerStep })
              }}
            />
          </ItemBox>
        )
      })}
      <div>
        <Button
          variant="secondary"
          disabled={firstEnemy === undefined}
          onClick={() => {
            if (firstEnemy === undefined) return
            setRegular([
              ...regular,
              {
                index: regular.length + 1,
                kind: 'REGULAR',
                powerStep: regular[regular.length - 1]?.powerStep ?? 0,
                enemies: [{ enemyRef: firstEnemy, count: 1 }],
              },
            ])
          }}
        >
          Añadir encuentro
        </Button>
        {firstEnemy === undefined && (
          <p className="mt-1 text-xs text-muted">Primero añade un tipo de enemigo.</p>
        )}
      </div>
    </section>
  )
}

export const EncountersSection = (props: SectionProps): React.JSX.Element => (
  <div className="flex flex-col gap-8">
    <EnemyTypes {...props} />
    <Encounters {...props} />
  </div>
)

export const BossSection = ({ content, onChange, errors }: SectionProps): React.JSX.Element => {
  const boss = content.finalBoss
  const drops = boss.drops ?? []
  const stats = bossStatsOf(boss.profile)
  const bossEncounter = content.encounters.find((encounter) => encounter.kind === 'BOSS')
  const setBoss = (changes: Partial<ContentBoss>): void => {
    onChange({ ...content, finalBoss: { ...boss, ...changes } })
  }
  const setDrop = (index: number, changes: Partial<ContentDrop>): void => {
    setBoss({
      drops: drops.map((drop, position) => (position === index ? { ...drop, ...changes } : drop)),
    })
  }
  /** Renombrar un botin arrastra los objetivos «Conseguir botín» que lo nombran. */
  const renameDrop = (index: number, label: string): void => {
    const previous = drops[index]?.label
    onChange({
      ...content,
      objectives: content.objectives.map((objective) =>
        objective.rule?.type === 'COLLECT_LOOT' && objective.rule.label === previous
          ? { ...objective, rule: { ...objective.rule, label } }
          : objective,
      ),
      finalBoss: {
        ...boss,
        drops: drops.map((drop, position) => (position === index ? { ...drop, label } : drop)),
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Nombre del jefe"
          value={boss.name}
          error={errors['finalBoss.name']}
          onChange={(event) => {
            setBoss({ name: event.target.value })
          }}
        />
        <SelectField
          label="Tipo de héroe (opcional)"
          value={boss.heroType ?? ''}
          placeholder="Ninguno"
          options={SUBTYPE_OPTIONS}
          onChange={(event) => {
            setBoss({ heroType: event.target.value === '' ? null : event.target.value })
          }}
        />
      </div>
      <TextareaField
        label="Descripción (opcional)"
        rows={2}
        value={boss.description ?? ''}
        onChange={(event) => {
          setBoss({ description: event.target.value })
        }}
      />
      <ListError message={errors['finalBoss.enemyRef']} />
      <FighterFields
        profile={boss.profile}
        path="finalBoss.profile"
        errors={errors}
        aiOptions={BOSS_AI}
        onChange={(profile) => {
          setBoss({ profile })
        }}
      />
      <p className="text-sm text-ink">
        El jugador ve: vida {stats.health}, ataque {stats.attack}, defensa {stats.defense}
        {stats.damage === undefined ? ' y daño en dados.' : ` y daño ${String(stats.damage)}.`}
      </p>
      <PercentField
        label="Refuerzo del encuentro del jefe (%)"
        value={bossEncounter?.powerStep ?? null}
        optional
        max={200}
        hint={POWER_STEP_HINT}
        error={errors['finalBoss.powerStep']}
        onChange={(powerStep) => {
          const structured = withRegularEncounters(content, regularEncountersOf(content))
          onChange({
            ...structured,
            encounters: structured.encounters.map((encounter) =>
              encounter.kind === 'BOSS' ? { ...encounter, powerStep } : encounter,
            ),
          })
        }}
      />

      <section aria-labelledby="botin-del-jefe" className="flex flex-col gap-3">
        <h3 id="botin-del-jefe" className="text-base font-semibold text-ink">
          Botín del jefe
        </h3>
        <p className="text-sm text-muted">
          Al derrotar al jefe se hace cada tirada con su probabilidad. El jugador recibe el producto
          enlazado; sin producto, el botín ni se muestra ni se entrega.
        </p>
        <ListError message={errors['finalBoss.drops']} />
        {drops.map((drop, index) => {
          const path = `finalBoss.drops.${String(index)}`
          const title = drop.label.trim() === '' ? `Botín ${String(index + 1)}` : drop.label
          return (
            <ItemBox
              key={`botin-${String(index)}`}
              title={title}
              removeLabel={`Quitar ${title}`}
              onRemove={() => {
                setBoss({ drops: drops.filter((_, position) => position !== index) })
              }}
            >
              <div className="grid gap-3 md:grid-cols-3">
                <TextField
                  label="Nombre del botín"
                  value={drop.label}
                  error={errors[`${path}.label`]}
                  onChange={(event) => {
                    renameDrop(index, event.target.value)
                  }}
                />
                <PercentField
                  label="Probabilidad por tirada (%)"
                  value={drop.probability}
                  error={errors[`${path}.probability`]}
                  onChange={(probability) => {
                    setDrop(index, { probability: probability ?? Number.NaN })
                  }}
                />
                <NumberField
                  label="Tiradas"
                  value={drop.rolls}
                  min={1}
                  max={100}
                  error={errors[`${path}.rolls`]}
                  onChange={(rolls) => {
                    setDrop(index, { rolls: rolls ?? Number.NaN })
                  }}
                />
              </div>
              <ProductPicker
                label="Producto que recibe el jugador"
                productId={drop.productId ?? null}
                types={['ITEM', 'ARMA', 'ARMADURA']}
                error={errors[`${path}.productId`]}
                onChange={(productId) => {
                  setDrop(index, { productId })
                }}
              />
            </ItemBox>
          )
        })}
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              const taken = new Set(drops.map((drop) => drop.label))
              setBoss({
                drops: [
                  ...drops,
                  {
                    label: uniqueRef('Nuevo botín', taken),
                    probability: 0.5,
                    rolls: 1,
                    productId: null,
                  },
                ],
              })
            }}
          >
            Añadir botín
          </Button>
        </div>
      </section>
    </div>
  )
}

const epicOptionsFor = (
  candidate: ContentMasterCandidate,
): readonly { readonly value: string; readonly label: string }[] => {
  const official = OFFICIAL_EPICS.map((epic) => ({
    value: epic.epicRef,
    label: `${epic.name} (${heroTypeLabel(epic.subtype)})`,
  }))
  return official.some((option) => option.value === candidate.epic.epicRef)
    ? official
    : [{ value: candidate.epic.epicRef, label: candidate.epic.name }, ...official]
}

const MasterCandidateFields = ({
  candidate,
  index,
  onChange,
  onRemove,
  errors,
}: {
  readonly candidate: ContentMasterCandidate
  readonly index: number
  readonly onChange: (candidate: ContentMasterCandidate) => void
  readonly onRemove: () => void
  readonly errors: FieldErrors
}): React.JSX.Element => {
  const path = `masterEncounter.candidates.${String(index)}`
  const title = candidate.name.trim() === '' ? `Máster ${String(index + 1)}` : candidate.name
  const table = candidate.probabilityByHeroType
  const set = (changes: Partial<ContentMasterCandidate>): void => {
    onChange({ ...candidate, ...changes })
  }
  const setProbability = (key: string, fraction: number | null): void => {
    const rest = Object.fromEntries(Object.entries(table).filter(([entry]) => entry !== key))
    set({ probabilityByHeroType: fraction === null ? rest : { ...rest, [key]: fraction } })
  }
  const overrides = HERO_SUBTYPES.filter((subtype) => table[subtype] !== undefined).length

  return (
    <ItemBox title={title} removeLabel={`Quitar ${title}`} onRemove={onRemove}>
      <div className="grid gap-3 md:grid-cols-3">
        <TextField
          label="Nombre"
          value={candidate.name}
          error={errors[`${path}.name`] ?? errors[`${path}.masterRef`]}
          onChange={(event) => {
            set({ name: event.target.value })
          }}
        />
        <SelectField
          label="Tipo de héroe"
          value={candidate.subtype}
          options={SUBTYPE_OPTIONS}
          onChange={(event) => {
            set({ subtype: event.target.value })
          }}
        />
        <NumberField
          label="Niveles por encima del héroe"
          value={candidate.levelOffset}
          min={0}
          error={errors[`${path}.levelOffset`]}
          onChange={(levelOffset) => {
            set({ levelOffset: levelOffset ?? Number.NaN })
          }}
        />
      </div>
      <PercentField
        label="Probabilidad en cada momento (%)"
        value={table['*'] ?? null}
        optional
        hint="Para cualquier héroe. Vacía: solo aparece ante los tipos con probabilidad propia."
        error={errors[`${path}.probability`]}
        onChange={(fraction) => {
          setProbability('*', fraction)
        }}
      />
      <details className="rounded-md border border-border p-3">
        <summary className="cursor-pointer text-sm text-ink">
          Probabilidad propia por tipo de héroe ({overrides} de {HERO_SUBTYPES.length})
        </summary>
        <p className="mt-2 text-xs text-muted">
          Si un tipo tiene la suya, se usa en lugar de la general. Vacía: la general.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {HERO_SUBTYPES.map((subtype) => (
            <PercentField
              key={subtype}
              label={heroTypeLabel(subtype)}
              value={table[subtype] ?? null}
              optional
              onChange={(fraction) => {
                setProbability(subtype, fraction)
              }}
            />
          ))}
        </div>
      </details>
      <SelectField
        label="Épica que entrega"
        value={candidate.epic.epicRef}
        options={epicOptionsFor(candidate)}
        error={errors[`${path}.epic`]}
        onChange={(event) => {
          const epic = OFFICIAL_EPICS.find((official) => official.epicRef === event.target.value)
          if (epic === undefined) return
          set({
            epic: {
              epicRef: epic.epicRef,
              name: epic.name,
              generalEffect: epic.generalEffect,
              epicEffect: epic.epicEffect,
              productId: null,
            },
          })
        }}
      />
      <p className="text-xs text-muted">
        {candidate.epic.generalEffect ?? 'Sin efecto general.'} {candidate.epic.epicEffect ?? ''}
      </p>
      <ProductPicker
        label="Producto de la épica"
        productId={candidate.epic.productId}
        types={['EPICA']}
        onChange={(productId) => {
          set({ epic: { ...candidate.epic, productId } })
        }}
      />
      <FighterFields
        profile={candidate.profile}
        path={`${path}.profile`}
        errors={errors}
        aiOptions={ALL_AI}
        onChange={(profile) => {
          set({ profile })
        }}
      />
    </ItemBox>
  )
}

export const MasterSection = ({ content, onChange, errors }: SectionProps): React.JSX.Element => {
  const master = content.masterEncounter
  const [stashed, setStashed] = useState<ContentMaster | null>(master)
  const total = regularEncountersOf(content).length + 1
  const setMaster = (next: ContentMaster | null): void => {
    onChange({ ...content, masterEncounter: next })
  }

  const toggle = (enabled: boolean): void => {
    if (!enabled) {
      setStashed(master)
      setMaster(null)
      return
    }
    setMaster(
      stashed ?? {
        evaluationPoints: [{ afterEncounter: total > 1 ? total - 1 : 1 }],
        maxAppearances: 1,
        candidates: [newMasterCandidate(new Set())],
      },
    )
  }

  const points = new Set(master?.evaluationPoints.map((point) => point.afterEncounter) ?? [])
  const shown = Array.from({ length: Math.max(total, ...points) }, (_, position) => position + 1)

  return (
    <div className="flex flex-col gap-4">
      <CheckboxField
        label="Esta misión puede tener Máster"
        hint="Un rival más fuerte que el héroe. Si lo derrota, gana la épica del Máster."
        checked={master !== null}
        onChange={(event) => {
          toggle(event.target.checked)
        }}
      />
      <ListError message={errors.masterEncounter} />
      {master !== null && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink">Momentos en que puede aparecer</legend>
            <p className="text-xs text-muted">
              Al terminar cada encuentro marcado se prueba a los Máster en orden y sale como mucho
              uno.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((after) => (
                <CheckboxField
                  key={after}
                  label={
                    after > total
                      ? `Tras el encuentro ${String(after)} (ya no existe)`
                      : after === total
                        ? 'Tras el jefe final'
                        : `Tras el encuentro ${String(after)}`
                  }
                  checked={points.has(after)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...master.evaluationPoints, { afterEncounter: after }]
                      : master.evaluationPoints.filter((point) => point.afterEncounter !== after)
                    setMaster({ ...master, evaluationPoints: next })
                  }}
                />
              ))}
            </div>
            <ListError message={errors['masterEncounter.evaluationPoints']} />
          </fieldset>
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField
              label="Apariciones máximas por misión"
              value={master.maxAppearances ?? null}
              min={1}
              optional
              hint="Vacío: 1."
              error={errors['masterEncounter.maxAppearances']}
              onChange={(value) => {
                setMaster(
                  value === null
                    ? { evaluationPoints: master.evaluationPoints, candidates: master.candidates }
                    : { ...master, maxAppearances: value },
                )
              }}
            />
            <p className="self-center rounded-md border border-border bg-surface/40 p-3 text-sm text-ink">
              Probabilidad de que aparezca en una partida:{' '}
              <span className="font-semibold">{percentText(masterChanceOf(master))}</span>
              <span className="block text-xs text-muted">
                Con la probabilidad general. El PO fijó un 15 % por misión.
              </span>
            </p>
          </div>
          <ListError message={errors['masterEncounter.candidates']} />
          {master.candidates.map((candidate, index) => (
            <MasterCandidateFields
              key={candidate.masterRef}
              candidate={candidate}
              index={index}
              errors={errors}
              onChange={(next) => {
                setMaster({
                  ...master,
                  candidates: master.candidates.map((entry, position) =>
                    position === index ? next : entry,
                  ),
                })
              }}
              onRemove={() => {
                setMaster({
                  ...master,
                  candidates: master.candidates.filter((_, position) => position !== index),
                })
              }}
            />
          ))}
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                const taken = new Set(master.candidates.map((candidate) => candidate.masterRef))
                setMaster({
                  ...master,
                  candidates: [...master.candidates, newMasterCandidate(taken)],
                })
              }}
            >
              Añadir Máster
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
