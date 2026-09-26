import { HttpError } from '@/lib/http'

import type { RealtimeConnectionState } from '../realtime'
import type { LastAttack } from './battleReducer'
import type { BattleView, HealthView, RandomEffect, TargetRef, TurnOrderEntry } from './types'
import { i18n } from '@/shared/i18n/i18n'
import { localizedMessages } from '@/shared/i18n/messages'

/** Nombre visible de un participante: nunca el `playerId` ni ningun identificador tecnico. */
export const combatantName = (entry: TurnOrderEntry): string =>
  entry.kind === 'AI' ? i18n.t('battle:ai') : (entry.displayName ?? i18n.t('battle:player'))

/** El participante que esta jugando ESTA pantalla (mismo `sub` verificado que la sesion). */
export const findSelf = (battle: BattleView, subject: string | null): TurnOrderEntry | null =>
  subject === null
    ? null
    : (battle.turnOrder.find((entry) => entry.playerId !== null && entry.playerId === subject) ??
      null)

export interface CombatantGroups {
  /** Mi equipo (incluido yo). Vacio si el espectador no participa. */
  readonly allies: readonly TurnOrderEntry[]
  /** El otro equipo. */
  readonly opponents: readonly TurnOrderEntry[]
}

/**
 * Reparte la cola entre "mi equipo" y "el rival" SIN reordenarla: el orden de cada
 * grupo es el de la cola del servidor. Si quien mira no es participante (no
 * deberia ocurrir: Combat solo entrega la batalla a sus participantes) todos los
 * de un mismo equipo quedan juntos.
 */
export const groupCombatants = (battle: BattleView, subject: string | null): CombatantGroups => {
  const self = findSelf(battle, subject)
  const myTeam = self?.teamLabel ?? battle.turnOrder[0]?.teamLabel

  return {
    allies: battle.turnOrder.filter((entry) => entry.teamLabel === myTeam),
    opponents: battle.turnOrder.filter((entry) => entry.teamLabel !== myTeam),
  }
}

export interface TurnDescription {
  readonly isMyTurn: boolean
  /** Texto visible y semantico: nunca solo color. */
  readonly headline: string
  readonly detail: string
}

/**
 * Que decir del turno vigente. Se limita a LEER `currentTurn` que publica el
 * servidor: Web nunca calcula `turno + 1` ni decide de quien es el siguiente.
 */
export const describeTurn = (battle: BattleView, subject: string | null): TurnDescription => {
  const current = battle.currentTurn
  const isMyTurn = subject !== null && current.playerId !== null && current.playerId === subject
  const opening = battle.turnsCompleted === 0

  return {
    isMyTurn,
    headline: isMyTurn
      ? i18n.t('battle:turn.yours')
      : i18n.t('battle:turn.of', { name: combatantName(current) }),
    detail: opening
      ? isMyTurn
        ? i18n.t('battle:turn.youStart', { round: String(battle.round) })
        : i18n.t('battle:turn.theyStart', {
            name: combatantName(current),
            round: String(battle.round),
          })
      : i18n.t('battle:battle.round', { round: String(battle.round) }),
  }
}

/** Codigo estable del 422 de Combat cuando los equipos tienen distinto tamano. */
const UNSUPPORTED_TEAM_COMPOSITION = 'UNSUPPORTED_TEAM_COMPOSITION'

const isUnsupportedTeamComposition = (body: unknown): boolean =>
  typeof body === 'object' &&
  body !== null &&
  'code' in body &&
  body.code === UNSUPPORTED_TEAM_COMPOSITION

/**
 * Mensaje legible para un fallo al iniciar la batalla. Textos propios por codigo,
 * nunca el texto crudo de Combat: los 409 interpolan el `roomId` y los 422 pueden
 * arrastrar detalles tecnicos.
 */
export const describeStartBattleFailure = (error: unknown): string => {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 401:
        return i18n.t('battle:sessionExpired')
      case 403:
        // HU-17 (2026-09-22): el 403 de /start ahora tiene dos causas -- no ser
        // participante, o serlo pero no ser el propietario. El boton solo se
        // muestra al propietario, asi que en la practica esto no deberia verse;
        // si ocurre (llamada manual, condicion de carrera), este mensaje cubre
        // ambos casos sin mentir sobre cual aplica.
        return i18n.t('battle:start.forbidden')
      case 404:
        return i18n.t('battle:roomGone')
      case 409:
        return i18n.t('battle:start.conflict')
      case 422:
        if (isUnsupportedTeamComposition(error.body)) {
          return i18n.t('battle:start.unevenTeams')
        }

        return i18n.t('battle:start.ineligible')
      case 503:
        return i18n.t('battle:start.unavailable')
      default:
        return i18n.t('battle:start.failed')
    }
  }

  return i18n.t('battle:start.failed')
}

/** Motivos estables de `command.rejected` que hacen inaccesible la batalla. */
export const describeRejection = (code: string): string =>
  code === 'NOT_A_PARTICIPANT'
    ? i18n.t('battle:notParticipant')
    : code === 'ROOM_NOT_FOUND'
      ? i18n.t('battle:roomGone')
      : i18n.t('battle:reject.access')

// ---------------------------------------------------------------------------------
// HU-18: Vida y ataque basico. Solo LEE lo que publica Combat; no calcula dano, ni
// Ataque contra Defensa, ni el turno siguiente.
// ---------------------------------------------------------------------------------

const sameRef = (a: TargetRef, b: TargetRef): boolean =>
  a.teamLabel === b.teamLabel && a.seat === b.seat

/** El participante de la cola con esa identidad estable (`teamLabel`, `seat`). */
export const findEntry = (battle: BattleView, ref: TargetRef): TurnOrderEntry | null =>
  battle.turnOrder.find((entry) => sameRef(entry, ref)) ?? null

/** La Vida que Combat publica para un participante; `null` si no tiene perfil de combate. */
export const combatantHealth = (battle: BattleView, ref: TargetRef): HealthView | null =>
  battle.combatants?.find((combatant) => sameRef(combatant, ref))?.health ?? null

/** La batalla trae Vida: si no (iniciada antes de HU-18) no admite acciones de combate. */
export const hasCombatState = (battle: BattleView): boolean =>
  battle.combatants !== undefined && battle.combatants.length > 0

/** Vida restante mayor que cero. */
export const hasHealth = (health: HealthView | null): health is HealthView =>
  health !== null && health.current > 0

export type HealthTone = 'high' | 'medium' | 'low'

/**
 * Color de la barra segun el documento oficial (§7.6): verde por encima del 60 %,
 * amarillo entre el 40 % y el 60 % (ambos inclusive), rojo por debajo del 40 %.
 * Comparacion entera (`current / max` frente a 60 y 40), sin redondear. El texto
 * `32 / 44` es lo que comunica la Vida; el color solo la refuerza.
 */
export const healthTone = ({ current, max }: HealthView): HealthTone =>
  current * 100 > max * 60 ? 'high' : current * 100 >= max * 40 ? 'medium' : 'low'

/** Fraccion 0..1 que llena la barra (solo presentacion). */
export const healthFraction = ({ current, max }: HealthView): number => current / max

/**
 * Rivales a los que se puede apuntar: los del otro equipo con Vida. Es una AYUDA de
 * interfaz (evita ofrecer un objetivo que Combat rechazaria con `TARGET_UNAVAILABLE`);
 * Combat valida siempre, tambien el equipo.
 */
export const attackableTargets = (
  battle: BattleView,
  subject: string | null,
): readonly TurnOrderEntry[] =>
  groupCombatants(battle, subject).opponents.filter((entry) =>
    hasHealth(combatantHealth(battle, entry)),
  )

/**
 * Companeros que pueden recibir la excepcion de curacion de HU-12 (Reanimacion,
 * sin Task de Management): el propio equipo, SIN uno mismo. A diferencia de
 * `attackableTargets`, NO se filtra por Vida: un companero caido sigue siendo
 * un objetivo valido (es el uso central de "reanimar") y uno herido tambien
 * -- la Tabla 7 no lo restringe a un caido. Lo decide Combat al ejecutar; esto
 * solo ofrece opciones razonables.
 */
export const healableAllies = (
  battle: BattleView,
  subject: string | null,
): readonly TurnOrderEntry[] => {
  const self = findSelf(battle, subject)

  return groupCombatants(battle, subject).allies.filter((entry) => entry.seat !== self?.seat)
}

export const EFFECT_LABELS: Readonly<Record<RandomEffect, string>> = localizedMessages({
  DAMAGE: 'battle:effects.DAMAGE',
  CRITICAL_DAMAGE: 'battle:effects.CRITICAL_DAMAGE',
  EVADE: 'battle:effects.EVADE',
  RESIST: 'battle:effects.RESIST',
  ESCAPE: 'battle:effects.ESCAPE',
  NO_DAMAGE: 'battle:effects.NO_DAMAGE',
})

/**
 * Lo que la pantalla cuenta de una accion, con jerarquia de lectura:
 *
 * 1. `headline`: QUIEN hizo QUE a QUIEN ("Ana golpeo a Bruno").
 * 2. `impact`: CUANTO, en grande ("−3 Vida", "+5 Vida", "Sin daño").
 * 3. `life`: como quedo la Vida ("Bruno: 26 → 23").
 * 4. `detail`: el detalle tecnico secundario (Ataque contra Defensa, efecto y
 *    porcentaje, Poder, recarga), que se conserva para quien lo quiera leer.
 *
 * `notice` es un aviso previo opcional (p. ej. Poder insuficiente). Todo sale
 * de lo que Combat envio: aqui no se recalcula ningun resultado.
 */
export interface ActionFeedback {
  readonly notice?: string
  readonly headline: string
  readonly impact: string | null
  /** Refuerzo visual del impacto (el texto ya lo dice): daño, curacion o neutro. */
  readonly tone: 'damage' | 'heal' | 'neutral'
  readonly life: string | null
  readonly detail: string
}

export type AttackFeedback = ActionFeedback

/** Separador de los datos secundarios. */
export const DETAIL_SEPARATOR = ' · '

/** Signo menos tipografico: "−3 Vida" se lee como una perdida, no como un guion. */
export const damageImpact = (applied: number): string =>
  applied > 0
    ? i18n.t('battle:feedback.damage', { amount: String(applied) })
    : i18n.t('battle:feedback.noDamage')

/** "Bruno: 26 → 23", con la Vida antes y despues que publico Combat. */
export const lifeChange = (name: string, before: number, after: number): string =>
  `${name}: ${String(before)} → ${String(after)}`

/** "Ataque 17 vs Defensa 11". */
export const attackVersusDefense = (attack: number, defense: number): string =>
  i18n.t('battle:feedback.attackVsDefense', { attack: String(attack), defense: String(defense) })

/** "Golpe crítico 170 %" (o solo la etiqueta si Combat no envio porcentaje). */
export const effectWithPercent = (effect: RandomEffect, percent: number | null): string =>
  percent === null
    ? EFFECT_LABELS[effect]
    : i18n.t('battle:feedback.effectPercent', {
        effect: EFFECT_LABELS[effect],
        percent: String(percent),
      })

/**
 * Titular de un golpe EFECTIVO de ataque basico segun el efecto que sorteo
 * Combat. Evasion, resistencia y escape con daño mayor que 0 NO se redactan
 * como "esquivo por completo": el porcentaje redujo el golpe, no lo anulo.
 */
const hitHeadline = (
  effect: Exclude<RandomEffect, 'NO_DAMAGE'>,
  attacker: string,
  target: string,
  applied: number,
): string => {
  switch (effect) {
    case 'DAMAGE':
      return i18n.t('battle:feedback.hit.DAMAGE', { attacker, target })
    case 'CRITICAL_DAMAGE':
      return i18n.t('battle:feedback.hit.CRITICAL_DAMAGE', { attacker, target })
    case 'EVADE':
      return applied > 0
        ? i18n.t('battle:feedback.hit.EVADE_partial', { attacker, target })
        : i18n.t('battle:feedback.hit.EVADE', { attacker, target })
    case 'RESIST':
      return applied > 0
        ? i18n.t('battle:feedback.hit.RESIST_partial', { attacker, target })
        : i18n.t('battle:feedback.hit.RESIST', { attacker, target })
    case 'ESCAPE':
      return applied > 0
        ? i18n.t('battle:feedback.hit.ESCAPE_partial', { attacker, target })
        : i18n.t('battle:feedback.hit.ESCAPE', { attacker, target })
  }
}

/**
 * Texto del ultimo ataque, SOLO con lo que Combat envio: los numeros salen de la
 * resolucion (`attackValue`, `defenseValue`, `percent`, `appliedDamage`) y la Vida de
 * `targetHealth`. No se recalcula nada.
 */
export const describeLastAttack = (last: LastAttack, battle: BattleView): AttackFeedback => {
  const attackerEntry = findEntry(battle, last.attacker)
  const targetEntry = findEntry(battle, last.target)
  const attacker =
    attackerEntry === null ? i18n.t('battle:aParticipant') : combatantName(attackerEntry)
  const target = targetEntry === null ? i18n.t('battle:theirTarget') : combatantName(targetEntry)
  const { resolution } = last
  const compared = attackVersusDefense(resolution.attackValue, resolution.defenseValue)

  if (!resolution.effective || resolution.effect === null) {
    return {
      headline: i18n.t('battle:feedback.notOverDefense', { attacker, target }),
      impact: i18n.t('battle:feedback.noDamage'),
      tone: 'neutral',
      life: null,
      detail: [compared, i18n.t('battle:feedback.mustExceed')].join(DETAIL_SEPARATOR),
    }
  }

  if (resolution.effect === 'NO_DAMAGE') {
    return {
      headline: i18n.t('battle:feedback.reachedNoDamage', { attacker, target }),
      impact: i18n.t('battle:feedback.noHealthLoss'),
      tone: 'neutral',
      life: null,
      detail: [compared, i18n.t('battle:feedback.effectNone')].join(DETAIL_SEPARATOR),
    }
  }

  const reduced =
    resolution.calculatedDamage === resolution.appliedDamage
      ? null
      : i18n.t('battle:feedback.calculated', { amount: String(resolution.calculatedDamage) })

  return {
    headline: hitHeadline(resolution.effect, attacker, target, resolution.appliedDamage),
    impact: damageImpact(resolution.appliedDamage),
    tone: resolution.appliedDamage > 0 ? 'damage' : 'neutral',
    life: lifeChange(target, last.targetHealth.before, last.targetHealth.after),
    detail: [compared, effectWithPercent(resolution.effect, resolution.percent), reduced]
      .filter((part): part is string => part !== null)
      .join(DETAIL_SEPARATOR),
  }
}

/** Texto por CODIGO estable de un rechazo del ataque basico; nunca el texto del servidor. */
export const describeAttackRejection = (code: string): string => {
  switch (code) {
    case 'NOT_YOUR_TURN':
      return i18n.t('battle:attack.errors.NOT_YOUR_TURN')
    case 'BATTLE_NOT_ACTIVE':
      return i18n.t('battle:attack.errors.BATTLE_NOT_ACTIVE')
    case 'INVALID_TARGET':
      return i18n.t('battle:attack.errors.INVALID_TARGET')
    case 'SAME_TEAM_TARGET':
      return i18n.t('battle:attack.errors.SAME_TEAM_TARGET')
    case 'TARGET_UNAVAILABLE':
      return i18n.t('battle:attack.errors.TARGET_UNAVAILABLE')
    case 'ACTOR_UNAVAILABLE':
      return i18n.t('battle:attack.errors.ACTOR_UNAVAILABLE')
    case 'UNSUPPORTED_COMBAT_PROFILE':
      return i18n.t('battle:attack.errors.UNSUPPORTED_COMBAT_PROFILE')
    case 'NOT_A_PARTICIPANT':
      return i18n.t('battle:notParticipant')
    case 'ROOM_NOT_FOUND':
      return i18n.t('battle:roomGone')
    default:
      return i18n.t('battle:attack.errors.default')
  }
}

export interface AttackAvailability {
  /** Se muestra el boton: es mi turno y la batalla trae estado de combate. */
  readonly visible: boolean
  readonly enabled: boolean
  /** Por que no se puede atacar ahora (texto para todos, no solo tooltip), o `null`. */
  readonly hint: string | null
}

export interface AttackAvailabilityInput {
  readonly battle: BattleView
  readonly subject: string | null
  readonly connection: RealtimeConnectionState
  readonly synced: boolean
  /** Hay una intencion enviada sin resultado. */
  readonly pending: boolean
  readonly target: TargetRef | null
}

/**
 * Cuando se ofrece el «Ataque basico»: en MI turno, con un objetivo valido, con la
 * conexion lista y sin otro ataque en curso. NO depende del Poder (RF-18): siempre
 * disponible. Es una ayuda de interfaz; Combat valida turno, objetivo y Vida.
 */
export const attackAvailability = ({
  battle,
  subject,
  connection,
  synced,
  pending,
  target,
}: AttackAvailabilityInput): AttackAvailability => {
  if (!hasCombatState(battle)) {
    return {
      visible: false,
      enabled: false,
      hint: i18n.t('battle:attack.hints.legacy'),
    }
  }

  if (!describeTurn(battle, subject).isMyTurn) {
    return { visible: false, enabled: false, hint: i18n.t('battle:attack.hints.waitTurn') }
  }

  const self = findSelf(battle, subject)

  if (self !== null && !hasHealth(combatantHealth(battle, self))) {
    return { visible: true, enabled: false, hint: i18n.t('battle:attack.hints.noHealth') }
  }

  if (connection !== 'open' || !synced) {
    return { visible: true, enabled: false, hint: i18n.t('battle:attack.hints.connection') }
  }

  if (pending) {
    return { visible: true, enabled: false, hint: i18n.t('battle:attack.hints.pending') }
  }

  if (attackableTargets(battle, subject).length === 0) {
    return { visible: true, enabled: false, hint: i18n.t('battle:attack.hints.noTargets') }
  }

  if (target === null) {
    return { visible: true, enabled: false, hint: i18n.t('battle:attack.hints.chooseTarget') }
  }

  return { visible: true, enabled: true, hint: null }
}
