import type { RealtimeConnectionState } from '../realtime'
import type { LastAttack, LastSkill } from './battleReducer'
import {
  EFFECT_LABELS,
  combatantHealth,
  combatantName,
  describeLastAttack,
  describeTurn,
  findEntry,
  findSelf,
  hasCombatState,
  hasHealth,
} from './presentation'
import type {
  BattleView,
  PowerCost,
  PowerView,
  SkillView,
  TargetRef,
  TurnOrderEntry,
} from './types'

// ---------------------------------------------------------------------------------
// HU-19: Poder, habilidades y recarga. Solo LEE lo que publica Combat: no decide si una
// habilidad se puede pagar, cuanto Poder queda, si la recarga termino, ni el dano. El estado de
// cada habilidad (`READY`, `RECHARGING`, `UNSUPPORTED`) viene de Combat.
// ---------------------------------------------------------------------------------

const sameRef = (a: TargetRef, b: TargetRef): boolean =>
  a.teamLabel === b.teamLabel && a.seat === b.seat

/** El Poder que Combat publica para un participante; `null` sin perfil o sin estado de habilidades. */
export const combatantPower = (battle: BattleView, ref: TargetRef): PowerView | null =>
  battle.combatants?.find((combatant) => sameRef(combatant, ref))?.power ?? null

/** Las habilidades que Combat publica para un participante, en el orden de su heroe; `[]` si no hay. */
export const combatantSkills = (battle: BattleView, ref: TargetRef): readonly SkillView[] =>
  battle.combatants?.find((combatant) => sameRef(combatant, ref))?.skills ?? []

/** Costo de Poder en texto: «2 de Poder» o «Todo el Poder». */
export const describePowerCost = (cost: PowerCost): string =>
  cost.mode === 'ALL_AVAILABLE' ? 'Todo el Poder' : `${String(cost.amount)} de Poder`

const describeTurns = (turns: number): string =>
  turns === 1 ? '1 turno' : `${String(turns)} turnos`

/** Recarga de una habilidad ya usada, en texto. */
export const describeRecharge = (turns: number): string => `${describeTurns(turns)} de recarga`

/** Estado de una habilidad en TEXTO (el color solo lo refuerza); el estado lo decide Combat. */
export const describeSkillStatus = (skill: SkillView): string => {
  switch (skill.status) {
    case 'READY':
      return 'Disponible'
    case 'RECHARGING':
      return `En recarga: ${skill.cooldownRemaining === 1 ? 'falta' : 'faltan'} ${describeTurns(skill.cooldownRemaining)}`
    case 'UNSUPPORTED':
      return 'Todavía no disponible'
  }
}

/**
 * El espectador ve las habilidades de su heroe: es MI turno, la batalla trae estado de combate y mi
 * heroe tiene Vida y al menos una habilidad. Es una ayuda de interfaz; Combat valida todo.
 */
export const skillsVisible = (battle: BattleView, subject: string | null): boolean => {
  if (!hasCombatState(battle) || !describeTurn(battle, subject).isMyTurn) {
    return false
  }

  const self = findSelf(battle, subject)

  return (
    self !== null &&
    hasHealth(combatantHealth(battle, self)) &&
    combatantSkills(battle, self).length > 0
  )
}

export interface SkillAvailability {
  readonly enabled: boolean
  /** Por que no se puede usar ahora (texto para todos, no solo tooltip), o `null`. */
  readonly hint: string | null
}

export interface SkillAvailabilityInput {
  readonly connection: RealtimeConnectionState
  readonly synced: boolean
  /** Hay una intencion (de ataque o de habilidad) enviada sin resultado. */
  readonly pending: boolean
  readonly target: TargetRef | null
  readonly skill: SkillView
}

/**
 * Cuando se ofrece una habilidad: solo si Combat la marca `READY`, con un objetivo, la conexion lista
 * y sin otra accion en curso. El Poder NO deshabilita nada: con Poder insuficiente Combat degrada la
 * accion a un ataque basico (HU-11), asi que el boton sigue disponible y Combat decide.
 */
export const skillAvailability = ({
  connection,
  synced,
  pending,
  target,
  skill,
}: SkillAvailabilityInput): SkillAvailability => {
  if (skill.status === 'UNSUPPORTED') {
    return { enabled: false, hint: 'Todavía no está disponible.' }
  }

  if (skill.status === 'RECHARGING') {
    return { enabled: false, hint: `${describeSkillStatus(skill)}.` }
  }

  if (connection !== 'open' || !synced) {
    return { enabled: false, hint: 'Esperando la conexión con la batalla…' }
  }

  if (pending) {
    return { enabled: false, hint: 'Esperando el resultado de tu acción…' }
  }

  if (target === null) {
    return { enabled: false, hint: 'Elige un objetivo.' }
  }

  return { enabled: true, hint: null }
}

/** Texto por CODIGO estable de un rechazo de `useSkill`; nunca el texto del servidor. */
export const describeSkillRejection = (code: string): string => {
  switch (code) {
    case 'NOT_YOUR_TURN':
      return 'No es tu turno. Tu habilidad no se ejecutó.'
    case 'BATTLE_NOT_ACTIVE':
      return 'La batalla no está en curso.'
    case 'INVALID_TARGET':
      return 'El objetivo elegido ya no existe en la batalla.'
    case 'SAME_TEAM_TARGET':
      return 'Esta habilidad no puede dirigirse a alguien de tu propio equipo.'
    case 'TARGET_UNAVAILABLE':
      return 'El objetivo ya no tiene Vida. Elige otro.'
    case 'ACTOR_UNAVAILABLE':
      return 'Tu héroe ya no tiene Vida y no puede usar habilidades.'
    case 'UNSUPPORTED_COMBAT_PROFILE':
      return 'Las habilidades todavía no están disponibles para este héroe o para esta batalla.'
    case 'SKILLS_NOT_AVAILABLE':
      return 'Esta batalla comenzó antes de que existieran las habilidades y no las admite.'
    case 'UNKNOWN_SKILL':
      return 'Esa habilidad no pertenece a tu héroe.'
    case 'UNSUPPORTED_SKILL_EFFECT':
      return 'Esa habilidad todavía no se puede usar: su efecto aún no está definido para el combate.'
    case 'SKILL_ON_COOLDOWN':
      return 'Esa habilidad sigue en recarga. Tu turno no se consumió.'
    case 'NOT_A_PARTICIPANT':
      return 'No participas en esta batalla.'
    case 'ROOM_NOT_FOUND':
      return 'La sala ya no existe.'
    default:
      return 'No fue posible usar la habilidad. Inténtalo de nuevo.'
  }
}

export interface SkillFeedback {
  readonly headline: string
  readonly detail: string
}

const nameOf = (entry: TurnOrderEntry | null, fallback: string): string =>
  entry === null ? fallback : combatantName(entry)

/**
 * Texto de la ultima habilidad, SOLO con lo que Combat envio: el resultado sale de la resolucion, el
 * Poder de `power` y la Vida de `targetHealth`. No se recalcula nada ni se restan valores: se
 * muestran «antes → despues».
 */
export const describeLastSkill = (last: LastSkill, battle: BattleView): SkillFeedback => {
  const actor = nameOf(findEntry(battle, last.actor), 'Un participante')
  const target = nameOf(findEntry(battle, last.target), 'su objetivo')
  const { resolution } = last
  const headline = `${actor} usó ${last.skill.name} contra ${target}`
  const power = `Poder de ${actor}: ${String(last.power.before)} → ${String(last.power.after)}.`
  const recharge = `La habilidad queda en recarga: ${describeTurns(last.cooldown.remainingTurns)}.`
  const bonuses = [
    last.bonus.attack > 0 ? `Bono de Ataque de la habilidad: +${String(last.bonus.attack)}.` : null,
    last.bonus.damage !== null && last.bonus.damage > 0
      ? `Bono de Daño de la habilidad: +${String(last.bonus.damage)}.`
      : null,
  ].filter((text): text is string => text !== null)
  const compared = (verb: string): string =>
    `El Ataque (${String(resolution.attackValue)}) ${verb} la Defensa (${String(resolution.defenseValue)}).`

  if (!resolution.effective || resolution.effect === null) {
    return {
      headline: `${headline}: sin efecto`,
      detail: [compared('no superó'), ...bonuses, power, recharge].join(' '),
    }
  }

  if (resolution.effect === 'NO_DAMAGE') {
    return {
      headline: `${headline}: ${EFFECT_LABELS.NO_DAMAGE}`,
      detail: [
        `${compared('superó')} El efecto fue «no causa daño».`,
        ...bonuses,
        power,
        recharge,
      ].join(' '),
    }
  }

  const percent = resolution.percent === null ? '' : ` (${String(resolution.percent)} %)`

  return {
    headline: `${headline}: ${EFFECT_LABELS[resolution.effect]}${percent}`,
    detail: [
      `${compared('superó')} Daño aplicado: ${String(resolution.appliedDamage)}.`,
      `Vida de ${target}: ${String(last.targetHealth.before)} → ${String(last.targetHealth.after)}.`,
      ...bonuses,
      power,
      recharge,
    ].join(' '),
  }
}

/**
 * Lo ultimo que paso, sea un ataque basico, una habilidad o un ataque basico que sustituyo a una
 * habilidad: gana el de `seq` mayor (el servidor los numera en orden). `null` si no hubo ninguno.
 */
export const describeLatestAction = (
  lastAttack: LastAttack | null,
  lastSkill: LastSkill | null,
  battle: BattleView,
): SkillFeedback | null => {
  if (lastSkill !== null && (lastAttack === null || lastSkill.seq > lastAttack.seq)) {
    return describeLastSkill(lastSkill, battle)
  }

  return lastAttack === null
    ? null
    : (describeDegradedAttack(lastAttack, battle) ?? describeLastAttack(lastAttack, battle))
}

/**
 * Un ataque basico que Combat puso en lugar de una habilidad porque el Poder no alcanzaba (HU-11).
 * `null` si el ataque es normal. Se explica POR QUE hubo un ataque basico y luego se describe el golpe
 * como cualquier ataque, con lo que envio Combat.
 */
export const describeDegradedAttack = (
  last: LastAttack,
  battle: BattleView,
): SkillFeedback | null => {
  if (last.degradedFrom === undefined) {
    return null
  }

  const attacker = nameOf(findEntry(battle, last.attacker), 'Un participante')
  const skillName =
    combatantSkills(battle, last.attacker).find(
      (skill) => skill.abilityId === last.degradedFrom?.abilityId,
    )?.name ?? 'la habilidad'
  const attack = describeLastAttack(last, battle)

  return {
    headline: `${attacker} no tenía Poder suficiente para ${skillName}: se usó un ataque básico`,
    detail: `${attack.headline}. ${attack.detail} La habilidad no se gastó ni quedó en recarga.`,
  }
}
