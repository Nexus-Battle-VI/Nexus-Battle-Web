import type { RealtimeConnectionState } from '../realtime'
import type { LastAttack, LastHealSkill, LastSkill } from './battleReducer'
import {
  DETAIL_SEPARATOR,
  attackVersusDefense,
  combatantHealth,
  combatantName,
  damageImpact,
  describeLastAttack,
  describeTurn,
  effectWithPercent,
  findEntry,
  findSelf,
  hasCombatState,
  hasHealth,
  lifeChange,
  type ActionFeedback,
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
      return `Disponible en ${describeTurns(skill.cooldownRemaining)}`
    case 'UNSUPPORTED':
      return 'Esta habilidad todavía no está disponible en combate'
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
    return { enabled: false, hint: `${describeSkillStatus(skill)}.` }
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

export type SkillFeedback = ActionFeedback

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
  const secondary = [
    last.bonus.attack > 0 ? `Bono de Ataque +${String(last.bonus.attack)}` : null,
    last.bonus.damage !== null && last.bonus.damage > 0
      ? `Bono de Daño +${String(last.bonus.damage)}`
      : null,
    `Poder ${String(last.power.before)} → ${String(last.power.after)}`,
    `Recarga ${describeTurns(last.cooldown.remainingTurns)}`,
  ].filter((text): text is string => text !== null)
  const compared = attackVersusDefense(resolution.attackValue, resolution.defenseValue)

  if (!resolution.effective || resolution.effect === null) {
    return {
      headline: `${headline}, pero no superó su Defensa`,
      impact: 'Sin daño',
      tone: 'neutral',
      life: null,
      detail: [compared, ...secondary].join(DETAIL_SEPARATOR),
    }
  }

  if (resolution.effect === 'NO_DAMAGE') {
    return {
      headline: `${headline}: alcanzó, pero no causó daño`,
      impact: 'Sin pérdida de Vida',
      tone: 'neutral',
      life: null,
      detail: [compared, 'Efecto: sin daño', ...secondary].join(DETAIL_SEPARATOR),
    }
  }

  return {
    headline,
    impact: damageImpact(resolution.appliedDamage),
    tone: resolution.appliedDamage > 0 ? 'damage' : 'neutral',
    life: lifeChange(target, last.targetHealth.before, last.targetHealth.after),
    detail: [compared, effectWithPercent(resolution.effect, resolution.percent), ...secondary].join(
      DETAIL_SEPARATOR,
    ),
  }
}

/**
 * Texto de la ultima curacion (excepcion de HU-12, sin Task de Management): SOLO lo que Combat
 * envio, sin resolucion de golpe (curar no lo tiene). El monto sanado y la Vida «antes → despues»
 * vienen ya calculados por Combat.
 */
export const describeLastHealSkill = (last: LastHealSkill, battle: BattleView): SkillFeedback => {
  const actor = nameOf(findEntry(battle, last.actor), 'Un participante')
  const target = nameOf(findEntry(battle, last.target), 'su objetivo')

  return {
    headline: `${actor} usó ${last.skill.name} sobre ${target}`,
    impact: `+${String(last.heal.amount)} Vida`,
    tone: 'heal',
    life: lifeChange(target, last.targetHealth.before, last.targetHealth.after),
    detail: [
      `Poder ${String(last.power.before)} → ${String(last.power.after)}`,
      `Recarga ${describeTurns(last.cooldown.remainingTurns)}`,
    ].join(DETAIL_SEPARATOR),
  }
}

/**
 * Lo ultimo que paso, sea un ataque basico, una habilidad, una curacion (excepcion de HU-12) o un
 * ataque basico que sustituyo a una habilidad: gana el de `seq` mayor (el servidor los numera en
 * orden). `null` si no hubo ninguno.
 */
export const describeLatestAction = (
  lastAttack: LastAttack | null,
  lastSkill: LastSkill | null,
  battle: BattleView,
  lastHealSkill: LastHealSkill | null = null,
): SkillFeedback | null => {
  const attackSeq = lastAttack?.seq ?? 0
  const skillSeq = lastSkill?.seq ?? 0
  const healSeq = lastHealSkill?.seq ?? 0

  if (lastHealSkill !== null && healSeq > attackSeq && healSeq > skillSeq) {
    return describeLastHealSkill(lastHealSkill, battle)
  }

  if (lastSkill !== null && skillSeq > attackSeq) {
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

  const skillName =
    combatantSkills(battle, last.attacker).find(
      (skill) => skill.abilityId === last.degradedFrom?.abilityId,
    )?.name ?? 'la habilidad'

  return {
    ...describeLastAttack(last, battle),
    notice: `No había Poder suficiente para ${skillName}. Se ejecutó un ataque básico en su lugar; la habilidad no se gastó ni quedó en recarga.`,
  }
}
