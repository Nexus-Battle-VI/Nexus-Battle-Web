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
import { i18n } from '@/shared/i18n/i18n'
import { formatInteger } from '@/shared/i18n/format'

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
  cost.mode === 'ALL_AVAILABLE'
    ? i18n.t('battle:skills.allPower')
    : i18n.t('battle:skills.powerCost', { amount: String(cost.amount) })

const describeTurns = (turns: number): string =>
  i18n.t('battle:skills.turns', { count: turns, value: formatInteger(turns) })

/** Recarga de una habilidad ya usada, en texto. */
export const describeRecharge = (turns: number): string =>
  i18n.t('battle:skills.recharge', { turns: describeTurns(turns) })

/** Estado de una habilidad en TEXTO (el color solo lo refuerza); el estado lo decide Combat. */
export const describeSkillStatus = (skill: SkillView): string => {
  switch (skill.status) {
    case 'READY':
      return i18n.t('battle:skills.ready')
    case 'RECHARGING':
      return i18n.t('battle:skills.availableIn', { turns: describeTurns(skill.cooldownRemaining) })
    case 'UNSUPPORTED':
      return i18n.t('battle:skills.unsupported')
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
    return { enabled: false, hint: i18n.t('battle:attack.hints.connection') }
  }

  if (pending) {
    return { enabled: false, hint: i18n.t('battle:attack.hints.pending') }
  }

  if (target === null) {
    return { enabled: false, hint: i18n.t('battle:attack.hints.chooseTarget') }
  }

  return { enabled: true, hint: null }
}

/** Texto por CODIGO estable de un rechazo de `useSkill`; nunca el texto del servidor. */
export const describeSkillRejection = (code: string): string => {
  switch (code) {
    case 'NOT_YOUR_TURN':
      return i18n.t('battle:skills.errors.NOT_YOUR_TURN')
    case 'BATTLE_NOT_ACTIVE':
      return i18n.t('battle:attack.errors.BATTLE_NOT_ACTIVE')
    case 'INVALID_TARGET':
      return i18n.t('battle:attack.errors.INVALID_TARGET')
    case 'SAME_TEAM_TARGET':
      return i18n.t('battle:skills.errors.SAME_TEAM_TARGET')
    case 'TARGET_UNAVAILABLE':
      return i18n.t('battle:attack.errors.TARGET_UNAVAILABLE')
    case 'ACTOR_UNAVAILABLE':
      return i18n.t('battle:skills.errors.ACTOR_UNAVAILABLE')
    case 'UNSUPPORTED_COMBAT_PROFILE':
      return i18n.t('battle:skills.errors.UNSUPPORTED_COMBAT_PROFILE')
    case 'SKILLS_NOT_AVAILABLE':
      return i18n.t('battle:skills.errors.SKILLS_NOT_AVAILABLE')
    case 'UNKNOWN_SKILL':
      return i18n.t('battle:skills.errors.UNKNOWN_SKILL')
    case 'UNSUPPORTED_SKILL_EFFECT':
      return i18n.t('battle:skills.errors.UNSUPPORTED_SKILL_EFFECT')
    case 'SKILL_ON_COOLDOWN':
      return i18n.t('battle:skills.errors.SKILL_ON_COOLDOWN')
    case 'NOT_A_PARTICIPANT':
      return i18n.t('battle:notParticipant')
    case 'ROOM_NOT_FOUND':
      return i18n.t('battle:roomGone')
    default:
      return i18n.t('battle:skills.errors.default')
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
  const actor = nameOf(findEntry(battle, last.actor), i18n.t('battle:aParticipant'))
  const target = nameOf(findEntry(battle, last.target), i18n.t('battle:theirTarget'))
  const { resolution } = last
  const headline = i18n.t('battle:skills.used', { actor, skill: last.skill.name, target })
  const secondary = [
    last.bonus.attack > 0
      ? i18n.t('battle:skills.attackBonus', { amount: String(last.bonus.attack) })
      : null,
    last.bonus.damage !== null && last.bonus.damage > 0
      ? i18n.t('battle:skills.damageBonus', { amount: String(last.bonus.damage) })
      : null,
    i18n.t('battle:skills.powerChange', {
      before: String(last.power.before),
      after: String(last.power.after),
    }),
    i18n.t('battle:skills.rechargeTurns', { turns: describeTurns(last.cooldown.remainingTurns) }),
  ].filter((text): text is string => text !== null)
  const compared = attackVersusDefense(resolution.attackValue, resolution.defenseValue)

  if (!resolution.effective || resolution.effect === null) {
    return {
      headline: i18n.t('battle:skills.notOverDefense', { headline }),
      impact: i18n.t('battle:feedback.noDamage'),
      tone: 'neutral',
      life: null,
      detail: [compared, ...secondary].join(DETAIL_SEPARATOR),
    }
  }

  if (resolution.effect === 'NO_DAMAGE') {
    return {
      headline: i18n.t('battle:skills.reachedNoDamage', { headline }),
      impact: i18n.t('battle:feedback.noHealthLoss'),
      tone: 'neutral',
      life: null,
      detail: [compared, i18n.t('battle:feedback.effectNone'), ...secondary].join(DETAIL_SEPARATOR),
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
  const actor = nameOf(findEntry(battle, last.actor), i18n.t('battle:aParticipant'))
  const target = nameOf(findEntry(battle, last.target), i18n.t('battle:theirTarget'))

  return {
    headline: i18n.t('battle:skills.usedOn', { actor, skill: last.skill.name, target }),
    impact: i18n.t('battle:skills.heal', { amount: String(last.heal.amount) }),
    tone: 'heal',
    life: lifeChange(target, last.targetHealth.before, last.targetHealth.after),
    detail: [
      i18n.t('battle:skills.powerChange', {
        before: String(last.power.before),
        after: String(last.power.after),
      }),
      i18n.t('battle:skills.rechargeTurns', { turns: describeTurns(last.cooldown.remainingTurns) }),
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
    )?.name ?? i18n.t('battle:skills.theAbility')

  return {
    ...describeLastAttack(last, battle),
    notice: i18n.t('battle:skills.degraded', { skill: skillName }),
  }
}
