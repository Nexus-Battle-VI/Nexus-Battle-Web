import {
  appearancesOf,
  damageOf,
  DIFFICULTY_LEVELS,
  regularEncountersOf,
  type FighterProfile,
  type MissionContent,
} from './missionContent'
import { i18n } from '@/shared/i18n/i18n'
import { localizedMessages } from '@/shared/i18n/messages'

/**
 * Validacion del editor ANTES de enviar: las mismas reglas que aplica Missions
 * al guardar (`MissionContentPolicy`), dichas en castellano y pegadas al campo.
 * No es la autoridad: Missions vuelve a validar y su error tambien se muestra.
 */

export const SECTION_IDS = [
  'general',
  'objetivos',
  'encuentros',
  'jefe',
  'master',
  'recompensas',
  'reglas',
  'json',
] as const
export type SectionId = (typeof SECTION_IDS)[number]
const SECTION_LABELS: Readonly<Record<SectionId, string>> = localizedMessages({
  general: 'admin:missions.sections.general',
  objetivos: 'admin:missions.sections.objetivos',
  encuentros: 'admin:missions.sections.encuentros',
  jefe: 'admin:missions.sections.jefe',
  master: 'admin:missions.sections.master',
  recompensas: 'admin:missions.sections.recompensas',
  reglas: 'admin:missions.sections.reglas',
  json: 'admin:missions.sections.json',
})
export const SECTIONS: readonly { readonly id: SectionId; readonly label: string }[] =
  SECTION_IDS.map((id) => ({
    id,
    get label() {
      return SECTION_LABELS[id]
    },
  }))

/** Ruta del campo (`enemies.0.profile.attack`) → mensaje. */
export type FieldErrors = Readonly<Record<string, string>>

/** La pestaña donde vive un campo, por el primer tramo de su ruta. */
export const sectionOf = (path: string): SectionId => {
  const head = path.split('.')[0] ?? ''
  if (head === 'objectives') return 'objetivos'
  if (head === 'enemies' || head === 'encounters') return 'encuentros'
  if (head === 'finalBoss') return 'jefe'
  if (head === 'masterEncounter') return 'master'
  if (head === 'rewards' || head === 'highlightedRewards') return 'recompensas'
  if (head === 'combatRules') return 'reglas'
  return 'general'
}

/**
 * La ruta que nombra un error de Missions, en la forma del editor. Missions
 * responde «El contenido de la mision no es valido: objectives[0].rule.».
 */
export const pathOfServerMessage = (message: string): string | null => {
  const content = /no es valido: ([A-Za-z0-9_.[\]-]+?)\.?$/u.exec(message.trim())
  if (content?.[1] !== undefined) return content[1].replace(/\[(\d+)\]/gu, '.$1')
  if (/configuracion del Master/iu.test(message)) return 'masterEncounter'
  return null
}

/** Rutas de Missions que nombran una pieza entera → el campo que la representa. */
const SERVER_PATH_FIELDS: readonly (readonly [RegExp, string])[] = [
  [/^objectives\.(\d+)\.rule\..+$/u, 'objectives.$1.rule'],
  [/^objectives\.(\d+)$/u, 'objectives.$1.text'],
  [/^enemies\.(\d+)$/u, 'enemies.$1.name'],
  [/^enemies\.enemyRef$/u, 'enemies'],
  [/^encounters\.(\d+)(?:\.kind)?$/u, 'encounters.$1.enemies'],
  [/^finalBoss\.drops\.(\d+)$/u, 'finalBoss.drops.$1.label'],
  [/^rewards\.potential(?:\.\d+)?$/u, 'finalBoss.drops'],
  [/^finalBoss(?:\.encounters)?$/u, 'finalBoss.name'],
  [/^masterEncounter\.candidates\.(\d+)$/u, 'masterEncounter.candidates.$1.name'],
]

/**
 * El campo del formulario que corresponde a la ruta de un error de Missions,
 * que a veces nombra la pieza entera (`enemies.2`) o un enemigo por su
 * identificador (`enemies.lobo.count`).
 */
export const fieldOfServerPath = (path: string, content: MissionContent): string => {
  const byRef = /^enemies\.(.+)\.count$/u.exec(path)
  if (byRef?.[1] !== undefined && !/^\d+$/u.test(byRef[1])) {
    const index = content.enemies.findIndex((enemy) => enemy.enemyRef === byRef[1])
    return index === -1 ? 'enemies' : `enemies.${String(index)}.count`
  }
  const match = SERVER_PATH_FIELDS.find(([pattern]) => pattern.test(path))
  return match === undefined ? path : path.replace(match[0], match[1])
}

const isInt = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max

const isNumberIn = (value: number, min: number, max: number): boolean =>
  Number.isFinite(value) && value >= min && value <= max

const MISSION_ID = /^[a-z0-9_-]{3,100}$/u
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

const fighterErrors = (
  profile: FighterProfile,
  path: string,
  errors: Record<string, string>,
): void => {
  if (!isInt(profile.maxHealth, 1, 1_000_000)) {
    errors[`${path}.maxHealth`] = i18n.t('admin:missions.validation.health')
  }
  if (!isInt(profile.attack, 0, 1_000_000)) {
    errors[`${path}.attack`] = i18n.t('admin:missions.validation.attack')
  }
  if (!isInt(profile.defense, 0, 1_000_000)) {
    errors[`${path}.defense`] = i18n.t('admin:missions.validation.defense')
  }
  const damage = damageOf(profile.damage)
  if (damage.mode === 'FIXED' && !isInt(damage.amount, 0, 1_000_000)) {
    errors[`${path}.damage`] = i18n.t('admin:missions.validation.fixedDamage')
  }
  if (damage.mode === 'DICE' && !(isInt(damage.count, 1, 100) && isInt(damage.sides, 2, 8000))) {
    errors[`${path}.damage`] = i18n.t('admin:missions.validation.dice')
  }
  if (profile.ai === 'BOSS') {
    if (!isInt(profile.enrageBelowPercent ?? 50, 1, 100)) {
      errors[`${path}.enrageBelowPercent`] = i18n.t('admin:missions.validation.enrageThreshold')
    }
    if (!isInt(profile.enrageAttackBonus ?? 0, 0, 1_000_000)) {
      errors[`${path}.enrageAttackBonus`] = i18n.t('admin:missions.validation.enrageBonus')
    }
  }
}

export const validateMissionContent = (
  content: MissionContent,
  options: { readonly isNew: boolean; readonly takenIds: ReadonlySet<string> },
): FieldErrors => {
  const errors: Record<string, string> = {}
  const text = (value: string | null | undefined): boolean =>
    typeof value === 'string' && value.trim() !== ''

  if (!MISSION_ID.test(content.missionId)) {
    errors.missionId = i18n.t('admin:missions.validation.missionIdFormat')
  } else if (options.isNew && options.takenIds.has(content.missionId)) {
    errors.missionId = i18n.t('admin:missions.validation.missionIdTaken')
  }
  if (!text(content.name)) errors.name = i18n.t('admin:missions.validation.name')
  if (!text(content.summary)) errors.summary = i18n.t('admin:missions.validation.summary')
  if (!text(content.narrative)) errors.narrative = i18n.t('admin:missions.validation.narrative')
  if (!isInt(content.estimatedDurationMinutes, 1, 7 * 24 * 60)) {
    errors.estimatedDurationMinutes = i18n.t('admin:missions.validation.duration')
  }
  if (content.recommendedPower !== null && !isInt(content.recommendedPower, 0, 1_000_000)) {
    errors.recommendedPower = i18n.t('admin:missions.validation.recommendedPower')
  }

  if (content.objectives.length === 0) {
    errors.objectives = i18n.t('admin:missions.validation.needObjective')
  }
  const lootLabels = new Set((content.finalBoss.drops ?? []).map((drop) => drop.label.trim()))
  content.objectives.forEach((objective, index) => {
    const path = `objectives.${String(index)}`
    if (!text(objective.text))
      errors[`${path}.text`] = i18n.t('admin:missions.validation.objectiveText')
    const rule = objective.rule
    if (rule?.type === 'CLEAR_ENCOUNTERS' && !isInt(rule.count, 1, 50)) {
      errors[`${path}.rule`] = i18n.t('admin:missions.validation.encountersRange')
    }
    if (rule?.type === 'MIN_HEALTH_PERCENT' && !isInt(rule.percent, 0, 100)) {
      errors[`${path}.rule`] = i18n.t('admin:missions.validation.minHealthRange')
    }
    if (rule?.type === 'COLLECT_LOOT') {
      if (!lootLabels.has(rule.label.trim())) {
        errors[`${path}.rule`] = i18n.t('admin:missions.validation.chooseLoot')
      } else if (!isInt(rule.count, 1, 100)) {
        errors[`${path}.rule`] = i18n.t('admin:missions.validation.lootCount')
      }
    }
  })
  if (
    new Set(content.objectives.map((objective) => objective.id)).size !== content.objectives.length
  ) {
    errors.objectives = i18n.t('admin:missions.validation.duplicateObjectiveIds')
  }

  const appearances = appearancesOf(content)
  const refs = new Set<string>()
  content.enemies.forEach((enemy, index) => {
    const path = `enemies.${String(index)}`
    if (!text(enemy.name)) errors[`${path}.name`] = i18n.t('admin:missions.validation.enemyName')
    if (!text(enemy.enemyRef))
      errors[`${path}.enemyRef`] = i18n.t('admin:missions.validation.enemyRefMissing')
    if (refs.has(enemy.enemyRef) || enemy.enemyRef === content.finalBoss.enemyRef) {
      errors[`${path}.enemyRef`] = i18n.t('admin:missions.validation.enemyRefDuplicate')
    }
    refs.add(enemy.enemyRef)
    if ((appearances.get(enemy.enemyRef) ?? 0) === 0) {
      errors[`${path}.count`] = i18n.t('admin:missions.validation.enemyUnused')
    }
    fighterErrors(enemy.profile, `${path}.profile`, errors)
  })

  const regular = regularEncountersOf(content)
  if (regular.length > 49) errors.encounters = i18n.t('admin:missions.validation.tooManyEncounters')
  regular.forEach((encounter, index) => {
    const path = `encounters.${String(index)}`
    if (encounter.enemies.length === 0) {
      errors[`${path}.enemies`] = i18n.t('admin:missions.validation.needEnemyGroup')
    }
    encounter.enemies.forEach((group, groupIndex) => {
      if (!refs.has(group.enemyRef)) {
        errors[`${path}.enemies.${String(groupIndex)}`] = i18n.t(
          'admin:missions.validation.chooseListedEnemy',
        )
      } else if (!isInt(group.count, 1, 1_000_000)) {
        errors[`${path}.enemies.${String(groupIndex)}`] = i18n.t(
          'admin:missions.validation.countAtLeastOne',
        )
      }
    })
    if (encounter.powerStep !== null && !isNumberIn(encounter.powerStep, 0, 2)) {
      errors[`${path}.powerStep`] = i18n.t('admin:missions.validation.powerStep')
    }
  })

  const bossStep = content.encounters.find((encounter) => encounter.kind === 'BOSS')?.powerStep
  if (typeof bossStep === 'number' && !isNumberIn(bossStep, 0, 2)) {
    errors['finalBoss.powerStep'] = i18n.t('admin:missions.validation.powerStep')
  }

  const boss = content.finalBoss
  if (!text(boss.name)) errors['finalBoss.name'] = i18n.t('admin:missions.validation.bossName')
  if (!text(boss.enemyRef))
    errors['finalBoss.enemyRef'] = i18n.t('admin:missions.validation.bossRefMissing')
  fighterErrors(boss.profile, 'finalBoss.profile', errors)
  const drops = boss.drops ?? []
  if (drops.length > 50)
    errors['finalBoss.drops'] = i18n.t('admin:missions.validation.tooManyDrops')
  drops.forEach((drop, index) => {
    const path = `finalBoss.drops.${String(index)}`
    if (!text(drop.label)) errors[`${path}.label`] = i18n.t('admin:missions.validation.dropLabel')
    if (!isNumberIn(drop.probability, 0, 1)) {
      errors[`${path}.probability`] = i18n.t('admin:missions.validation.probability')
    }
    if (!isInt(drop.rolls, 1, 100))
      errors[`${path}.rolls`] = i18n.t('admin:missions.validation.rolls')
    if (drop.productId != null && !UUID.test(drop.productId)) {
      errors[`${path}.productId`] = i18n.t('admin:missions.validation.chooseProduct')
    }
  })

  const master = content.masterEncounter
  if (master !== null) {
    if (master.candidates.length === 0) {
      errors['masterEncounter.candidates'] = i18n.t('admin:missions.validation.needMaster')
    }
    if (master.evaluationPoints.length === 0) {
      errors['masterEncounter.evaluationPoints'] = i18n.t('admin:missions.validation.needEvalPoint')
    }
    if (
      master.evaluationPoints.some((point) => !isInt(point.afterEncounter, 1, regular.length + 1))
    ) {
      errors['masterEncounter.evaluationPoints'] = i18n.t(
        'admin:missions.validation.evalPointStale',
      )
    }
    if (master.maxAppearances !== undefined && !isInt(master.maxAppearances, 1, 1_000)) {
      errors['masterEncounter.maxAppearances'] = i18n.t(
        'admin:missions.validation.appearancesRange',
      )
    }
    const masterRefs = new Set<string>()
    master.candidates.forEach((candidate, index) => {
      const path = `masterEncounter.candidates.${String(index)}`
      if (!text(candidate.name))
        errors[`${path}.name`] = i18n.t('admin:missions.validation.masterName')
      if (!text(candidate.masterRef) || masterRefs.has(candidate.masterRef)) {
        errors[`${path}.masterRef`] = i18n.t('admin:missions.validation.masterRefInvalid')
      }
      masterRefs.add(candidate.masterRef)
      if (!isInt(candidate.levelOffset, 0, 1_000)) {
        errors[`${path}.levelOffset`] = i18n.t('admin:missions.validation.levelOffset')
      }
      if (!Object.values(candidate.probabilityByHeroType).every((p) => isNumberIn(p, 0, 1))) {
        errors[`${path}.probability`] = i18n.t('admin:missions.validation.probability')
      }
      if (!text(candidate.epic.epicRef) || !text(candidate.epic.name)) {
        errors[`${path}.epic`] = i18n.t('admin:missions.validation.chooseEpic')
      }
      if (candidate.epic.productId !== null && !UUID.test(candidate.epic.productId)) {
        errors[`${path}.epic`] = i18n.t('admin:missions.validation.chooseEpicProduct')
      }
      fighterErrors(candidate.profile, `${path}.profile`, errors)
    })
  }

  for (const field of ['guaranteed', 'objectiveBonuses', 'firstTime'] as const) {
    content.rewards[field].forEach((reward, index) => {
      if (!text(reward.label))
        errors[`rewards.${field}.${String(index)}`] = i18n.t(
          'admin:missions.validation.rewardLabel',
        )
    })
  }

  const rules = content.combatRules
  if (!isInt(rules.turnDurationSeconds, 1, 3600)) {
    errors['combatRules.turnDurationSeconds'] = i18n.t('admin:missions.validation.turnDuration')
  }
  if (!isInt(rules.maxTurnsPerEncounter, 1, 1000)) {
    errors['combatRules.maxTurnsPerEncounter'] = i18n.t('admin:missions.validation.maxTurns')
  }
  if (!isInt(rules.recoveryPercent, 0, 100)) {
    errors['combatRules.recoveryPercent'] = i18n.t('admin:missions.validation.recovery')
  }
  if (!isNumberIn(rules.criticalChance, 0, 1)) {
    errors['combatRules.criticalChance'] = i18n.t('admin:missions.validation.criticalChance')
  }
  if (!isNumberIn(rules.criticalMultiplier, 1, 1.8)) {
    errors['combatRules.criticalMultiplier'] = i18n.t(
      'admin:missions.validation.criticalMultiplier',
    )
  }
  for (const level of DIFFICULTY_LEVELS) {
    const multiplier = rules.difficultyMultipliers?.[level]
    if (multiplier !== undefined && !(isNumberIn(multiplier, 0, 10) && multiplier > 0)) {
      errors[`combatRules.difficultyMultipliers.${level}`] = i18n.t(
        'admin:missions.validation.difficultyMultiplier',
      )
    }
  }
  for (const field of ['supportAttack', 'supportDamage', 'supportRegen'] as const) {
    const value = rules[field]
    if (value !== undefined && !isInt(value, 0, 100)) {
      errors[`combatRules.${field}`] = i18n.t('admin:missions.validation.supportInt')
    }
  }

  return errors
}

/** Cuantos errores caen en cada pestaña. */
export const errorsBySection = (errors: FieldErrors): ReadonlyMap<SectionId, number> => {
  const counts = new Map<SectionId, number>()
  for (const path of Object.keys(errors)) {
    const section = sectionOf(path)
    counts.set(section, (counts.get(section) ?? 0) + 1)
  }
  return counts
}
