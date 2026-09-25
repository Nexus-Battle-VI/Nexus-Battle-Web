import {
  appearancesOf,
  damageOf,
  DIFFICULTY_LEVELS,
  regularEncountersOf,
  type FighterProfile,
  type MissionContent,
} from './missionContent'

/**
 * Validacion del editor ANTES de enviar: las mismas reglas que aplica Missions
 * al guardar (`MissionContentPolicy`), dichas en castellano y pegadas al campo.
 * No es la autoridad: Missions vuelve a validar y su error tambien se muestra.
 */

export const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'objetivos', label: 'Objetivos' },
  { id: 'encuentros', label: 'Encuentros' },
  { id: 'jefe', label: 'Jefe y botín' },
  { id: 'master', label: 'Máster' },
  { id: 'recompensas', label: 'Recompensas' },
  { id: 'reglas', label: 'Combate' },
  { id: 'json', label: 'JSON' },
] as const
export type SectionId = (typeof SECTIONS)[number]['id']

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
    errors[`${path}.maxHealth`] = 'La vida debe ser un entero de 1 o más.'
  }
  if (!isInt(profile.attack, 0, 1_000_000)) {
    errors[`${path}.attack`] = 'El ataque debe ser un entero de 0 o más.'
  }
  if (!isInt(profile.defense, 0, 1_000_000)) {
    errors[`${path}.defense`] = 'La defensa debe ser un entero de 0 o más.'
  }
  const damage = damageOf(profile.damage)
  if (damage.mode === 'FIXED' && !isInt(damage.amount, 0, 1_000_000)) {
    errors[`${path}.damage`] = 'El daño fijo debe ser un entero de 0 o más.'
  }
  if (damage.mode === 'DICE' && !(isInt(damage.count, 1, 100) && isInt(damage.sides, 2, 8000))) {
    errors[`${path}.damage`] = 'Los dados van de 1 a 100 y sus caras de 2 a 8000.'
  }
  if (profile.ai === 'BOSS') {
    if (!isInt(profile.enrageBelowPercent ?? 50, 1, 100)) {
      errors[`${path}.enrageBelowPercent`] = 'El umbral de furia va de 1 % a 100 %.'
    }
    if (!isInt(profile.enrageAttackBonus ?? 0, 0, 1_000_000)) {
      errors[`${path}.enrageAttackBonus`] = 'El ataque de más debe ser un entero de 0 o más.'
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
    errors.missionId =
      'Usa de 3 a 100 caracteres: minúsculas, números, guion o guion bajo (msn_mi_mision).'
  } else if (options.isNew && options.takenIds.has(content.missionId)) {
    errors.missionId = 'Ya existe una misión con ese identificador.'
  }
  if (!text(content.name)) errors.name = 'Escribe el nombre de la misión.'
  if (!text(content.summary)) errors.summary = 'Escribe un resumen para el tablón.'
  if (!text(content.narrative)) errors.narrative = 'Escribe la historia de la misión.'
  if (!isInt(content.estimatedDurationMinutes, 1, 7 * 24 * 60)) {
    errors.estimatedDurationMinutes = 'La duración va de 1 minuto a 7 días (10 080 minutos).'
  }
  if (content.recommendedPower !== null && !isInt(content.recommendedPower, 0, 1_000_000)) {
    errors.recommendedPower = 'El poder recomendado debe ser un entero de 0 o más.'
  }

  if (content.objectives.length === 0) {
    errors.objectives = 'La misión necesita al menos un objetivo.'
  }
  const lootLabels = new Set((content.finalBoss.drops ?? []).map((drop) => drop.label.trim()))
  content.objectives.forEach((objective, index) => {
    const path = `objectives.${String(index)}`
    if (!text(objective.text)) errors[`${path}.text`] = 'Escribe el objetivo.'
    const rule = objective.rule
    if (rule?.type === 'CLEAR_ENCOUNTERS' && !isInt(rule.count, 1, 50)) {
      errors[`${path}.rule`] = 'Indica de 1 a 50 encuentros.'
    }
    if (rule?.type === 'MIN_HEALTH_PERCENT' && !isInt(rule.percent, 0, 100)) {
      errors[`${path}.rule`] = 'La vida mínima va de 0 % a 100 %.'
    }
    if (rule?.type === 'COLLECT_LOOT') {
      if (!lootLabels.has(rule.label.trim())) {
        errors[`${path}.rule`] = 'Elige un botín del jefe final.'
      } else if (!isInt(rule.count, 1, 100)) {
        errors[`${path}.rule`] = 'La cantidad va de 1 a 100.'
      }
    }
  })
  if (
    new Set(content.objectives.map((objective) => objective.id)).size !== content.objectives.length
  ) {
    errors.objectives = 'Dos objetivos tienen el mismo identificador.'
  }

  const appearances = appearancesOf(content)
  const refs = new Set<string>()
  content.enemies.forEach((enemy, index) => {
    const path = `enemies.${String(index)}`
    if (!text(enemy.name)) errors[`${path}.name`] = 'Escribe el nombre del enemigo.'
    if (!text(enemy.enemyRef)) errors[`${path}.enemyRef`] = 'Falta el identificador.'
    if (refs.has(enemy.enemyRef) || enemy.enemyRef === content.finalBoss.enemyRef) {
      errors[`${path}.enemyRef`] = 'Otro enemigo o el jefe ya usan ese identificador.'
    }
    refs.add(enemy.enemyRef)
    if ((appearances.get(enemy.enemyRef) ?? 0) === 0) {
      errors[`${path}.count`] = 'Este enemigo no aparece en ningún encuentro: añádelo o quítalo.'
    }
    fighterErrors(enemy.profile, `${path}.profile`, errors)
  })

  const regular = regularEncountersOf(content)
  if (regular.length > 49) errors.encounters = 'Caben como mucho 49 encuentros antes del jefe.'
  regular.forEach((encounter, index) => {
    const path = `encounters.${String(index)}`
    if (encounter.enemies.length === 0) {
      errors[`${path}.enemies`] = 'Añade al menos un grupo de enemigos.'
    }
    encounter.enemies.forEach((group, groupIndex) => {
      if (!refs.has(group.enemyRef)) {
        errors[`${path}.enemies.${String(groupIndex)}`] = 'Elige un enemigo de la lista.'
      } else if (!isInt(group.count, 1, 1_000_000)) {
        errors[`${path}.enemies.${String(groupIndex)}`] = 'La cantidad debe ser de 1 o más.'
      }
    })
    if (encounter.powerStep !== null && !isNumberIn(encounter.powerStep, 0, 2)) {
      errors[`${path}.powerStep`] = 'El refuerzo va de 0 % a 200 %.'
    }
  })

  const bossStep = content.encounters.find((encounter) => encounter.kind === 'BOSS')?.powerStep
  if (typeof bossStep === 'number' && !isNumberIn(bossStep, 0, 2)) {
    errors['finalBoss.powerStep'] = 'El refuerzo va de 0 % a 200 %.'
  }

  const boss = content.finalBoss
  if (!text(boss.name)) errors['finalBoss.name'] = 'Escribe el nombre del jefe.'
  if (!text(boss.enemyRef)) errors['finalBoss.enemyRef'] = 'Falta el identificador del jefe.'
  fighterErrors(boss.profile, 'finalBoss.profile', errors)
  const drops = boss.drops ?? []
  if (drops.length > 50) errors['finalBoss.drops'] = 'Caben como mucho 50 botines.'
  drops.forEach((drop, index) => {
    const path = `finalBoss.drops.${String(index)}`
    if (!text(drop.label)) errors[`${path}.label`] = 'Escribe el nombre del botín.'
    if (!isNumberIn(drop.probability, 0, 1)) {
      errors[`${path}.probability`] = 'La probabilidad va de 0 % a 100 %.'
    }
    if (!isInt(drop.rolls, 1, 100)) errors[`${path}.rolls`] = 'Las tiradas van de 1 a 100.'
    if (drop.productId != null && !UUID.test(drop.productId)) {
      errors[`${path}.productId`] = 'Elige el producto con el buscador.'
    }
  })

  const master = content.masterEncounter
  if (master !== null) {
    if (master.candidates.length === 0) {
      errors['masterEncounter.candidates'] = 'Añade al menos un Máster o desactiva el Máster.'
    }
    if (master.evaluationPoints.length === 0) {
      errors['masterEncounter.evaluationPoints'] =
        'Elige al menos un momento en que puede aparecer.'
    }
    if (
      master.evaluationPoints.some((point) => !isInt(point.afterEncounter, 1, regular.length + 1))
    ) {
      errors['masterEncounter.evaluationPoints'] = 'Un momento elegido ya no existe: revísalos.'
    }
    if (master.maxAppearances !== undefined && !isInt(master.maxAppearances, 1, 1_000)) {
      errors['masterEncounter.maxAppearances'] = 'Las apariciones van de 1 en adelante.'
    }
    const masterRefs = new Set<string>()
    master.candidates.forEach((candidate, index) => {
      const path = `masterEncounter.candidates.${String(index)}`
      if (!text(candidate.name)) errors[`${path}.name`] = 'Escribe el nombre del Máster.'
      if (!text(candidate.masterRef) || masterRefs.has(candidate.masterRef)) {
        errors[`${path}.masterRef`] = 'El identificador falta o está repetido.'
      }
      masterRefs.add(candidate.masterRef)
      if (!isInt(candidate.levelOffset, 0, 1_000)) {
        errors[`${path}.levelOffset`] = 'Los niveles de más deben ser un entero de 0 o más.'
      }
      if (!Object.values(candidate.probabilityByHeroType).every((p) => isNumberIn(p, 0, 1))) {
        errors[`${path}.probability`] = 'La probabilidad va de 0 % a 100 %.'
      }
      if (!text(candidate.epic.epicRef) || !text(candidate.epic.name)) {
        errors[`${path}.epic`] = 'Elige la épica que entrega.'
      }
      if (candidate.epic.productId !== null && !UUID.test(candidate.epic.productId)) {
        errors[`${path}.epic`] = 'Elige el producto de la épica con el buscador.'
      }
      fighterErrors(candidate.profile, `${path}.profile`, errors)
    })
  }

  for (const field of ['guaranteed', 'objectiveBonuses', 'firstTime'] as const) {
    content.rewards[field].forEach((reward, index) => {
      if (!text(reward.label))
        errors[`rewards.${field}.${String(index)}`] = 'Escribe la recompensa.'
    })
  }

  const rules = content.combatRules
  if (!isInt(rules.turnDurationSeconds, 1, 3600)) {
    errors['combatRules.turnDurationSeconds'] = 'Un turno dura de 1 a 3600 segundos.'
  }
  if (!isInt(rules.maxTurnsPerEncounter, 1, 1000)) {
    errors['combatRules.maxTurnsPerEncounter'] = 'El tope va de 1 a 1000 turnos.'
  }
  if (!isInt(rules.recoveryPercent, 0, 100)) {
    errors['combatRules.recoveryPercent'] = 'La recuperación va de 0 % a 100 %.'
  }
  if (!isNumberIn(rules.criticalChance, 0, 1)) {
    errors['combatRules.criticalChance'] = 'La probabilidad de crítico va de 0 % a 100 %.'
  }
  if (!isNumberIn(rules.criticalMultiplier, 1, 1.8)) {
    errors['combatRules.criticalMultiplier'] = 'El multiplicador de crítico va de 1 a 1,8.'
  }
  for (const level of DIFFICULTY_LEVELS) {
    const multiplier = rules.difficultyMultipliers?.[level]
    if (multiplier !== undefined && !(isNumberIn(multiplier, 0, 10) && multiplier > 0)) {
      errors[`combatRules.difficultyMultipliers.${level}`] = 'El multiplicador va de 0 a 10.'
    }
  }
  for (const field of ['supportAttack', 'supportDamage', 'supportRegen'] as const) {
    const value = rules[field]
    if (value !== undefined && !isInt(value, 0, 100)) {
      errors[`combatRules.${field}`] = 'Debe ser un entero de 0 a 100.'
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
