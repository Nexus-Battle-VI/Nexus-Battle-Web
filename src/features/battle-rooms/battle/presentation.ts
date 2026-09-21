import { HttpError } from '@/lib/http'

import type { RealtimeConnectionState } from '../realtime'
import type { LastAttack } from './battleReducer'
import type { BattleView, HealthView, RandomEffect, TargetRef, TurnOrderEntry } from './types'

/** Nombre visible de un participante: nunca el `playerId` ni ningun identificador tecnico. */
export const combatantName = (entry: TurnOrderEntry): string =>
  entry.kind === 'AI' ? 'Oponente IA' : (entry.displayName ?? 'Jugador')

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
    headline: isMyTurn ? 'Tu turno' : `Turno de ${combatantName(current)}`,
    detail: opening
      ? `${isMyTurn ? 'Tú inicias' : `Inicia ${combatantName(current)}`} la batalla · Ronda ${String(battle.round)}`
      : `Ronda ${String(battle.round)}`,
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
        return 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.'
      case 403:
        return 'No participas en esta batalla.'
      case 404:
        return 'La sala ya no existe.'
      case 409:
        return 'La sala no está lista para comenzar o cambió de estado. Vuelve a la lista de salas e inténtalo de nuevo.'
      case 422:
        if (isUnsupportedTeamComposition(error.body)) {
          return 'Los equipos de esta sala tienen distinto tamaño y el orden de turnos solo está definido para equipos con el mismo número de participantes. La batalla no comenzó; vuelve a la lista de salas.'
        }

        return 'Un participante ya no cumple los requisitos para combatir: su héroe o su equipamiento cambió. La batalla no comenzó; revisa tu héroe y vuelve a la sala.'
      case 503:
        return 'El servicio no pudo validar a los participantes en este momento. Inténtalo de nuevo en unos segundos.'
      default:
        return 'No fue posible iniciar la batalla. Inténtalo de nuevo.'
    }
  }

  return 'No fue posible iniciar la batalla. Inténtalo de nuevo.'
}

/** Motivos estables de `command.rejected` que hacen inaccesible la batalla. */
export const describeRejection = (code: string): string =>
  code === 'NOT_A_PARTICIPANT'
    ? 'No participas en esta batalla.'
    : code === 'ROOM_NOT_FOUND'
      ? 'La sala ya no existe.'
      : 'No fue posible acceder a esta batalla.'

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

const EFFECT_LABELS: Readonly<Record<RandomEffect, string>> = {
  DAMAGE: 'Daño normal',
  CRITICAL_DAMAGE: 'Golpe crítico',
  EVADE: 'Evasión',
  RESIST: 'Resistencia',
  ESCAPE: 'Escape',
  NO_DAMAGE: 'No causa daño',
}

export interface AttackFeedback {
  readonly headline: string
  readonly detail: string
}

/**
 * Texto del ultimo ataque, SOLO con lo que Combat envio: los numeros salen de la
 * resolucion (`attackValue`, `defenseValue`, `percent`, `appliedDamage`) y la Vida de
 * `targetHealth`. No se recalcula nada.
 */
export const describeLastAttack = (last: LastAttack, battle: BattleView): AttackFeedback => {
  const attackerEntry = findEntry(battle, last.attacker)
  const targetEntry = findEntry(battle, last.target)
  const attacker = attackerEntry === null ? 'Un participante' : combatantName(attackerEntry)
  const target = targetEntry === null ? 'su objetivo' : combatantName(targetEntry)
  const { resolution } = last

  if (!resolution.effective || resolution.effect === null) {
    return {
      headline: `${attacker} atacó a ${target}: sin efecto`,
      detail: `El Ataque (${String(resolution.attackValue)}) no superó la Defensa (${String(resolution.defenseValue)}).`,
    }
  }

  const compared = `El Ataque (${String(resolution.attackValue)}) superó la Defensa (${String(resolution.defenseValue)}).`

  if (resolution.effect === 'NO_DAMAGE') {
    return {
      headline: `${attacker} atacó a ${target}: ${EFFECT_LABELS.NO_DAMAGE}`,
      detail: `${compared} El efecto fue «no causa daño».`,
    }
  }

  const percent = resolution.percent === null ? '' : ` (${String(resolution.percent)} %)`
  const reduced =
    resolution.calculatedDamage === resolution.appliedDamage
      ? ''
      : ` (calculado ${String(resolution.calculatedDamage)}: la Vida no baja de 0)`

  return {
    headline: `${attacker} atacó a ${target}: ${EFFECT_LABELS[resolution.effect]}${percent}`,
    detail: `${compared} Daño aplicado: ${String(resolution.appliedDamage)}${reduced}. Vida de ${target}: ${String(last.targetHealth.before)} → ${String(last.targetHealth.after)}.`,
  }
}

/** Texto por CODIGO estable de un rechazo del ataque basico; nunca el texto del servidor. */
export const describeAttackRejection = (code: string): string => {
  switch (code) {
    case 'NOT_YOUR_TURN':
      return 'No es tu turno. Tu ataque no se ejecutó.'
    case 'BATTLE_NOT_ACTIVE':
      return 'La batalla no está en curso.'
    case 'INVALID_TARGET':
      return 'El objetivo elegido ya no existe en la batalla.'
    case 'SAME_TEAM_TARGET':
      return 'No puedes atacar a alguien de tu propio equipo.'
    case 'TARGET_UNAVAILABLE':
      return 'El objetivo ya no tiene Vida. Elige otro.'
    case 'ACTOR_UNAVAILABLE':
      return 'Tu héroe ya no tiene Vida y no puede atacar.'
    case 'UNSUPPORTED_COMBAT_PROFILE':
      return 'El ataque básico todavía no está disponible para este héroe o para esta batalla.'
    case 'NOT_A_PARTICIPANT':
      return 'No participas en esta batalla.'
    case 'ROOM_NOT_FOUND':
      return 'La sala ya no existe.'
    default:
      return 'No fue posible ejecutar el ataque. Inténtalo de nuevo.'
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
      hint: 'Esta batalla comenzó antes de que existieran las acciones de combate y no admite ataques.',
    }
  }

  if (!describeTurn(battle, subject).isMyTurn) {
    return { visible: false, enabled: false, hint: 'Podrás atacar cuando sea tu turno.' }
  }

  const self = findSelf(battle, subject)

  if (self !== null && !hasHealth(combatantHealth(battle, self))) {
    return { visible: true, enabled: false, hint: 'Tu héroe no tiene Vida y no puede atacar.' }
  }

  if (connection !== 'open' || !synced) {
    return { visible: true, enabled: false, hint: 'Esperando la conexión con la batalla…' }
  }

  if (pending) {
    return { visible: true, enabled: false, hint: 'Esperando el resultado de tu ataque…' }
  }

  if (attackableTargets(battle, subject).length === 0) {
    return { visible: true, enabled: false, hint: 'No hay rivales con Vida a los que atacar.' }
  }

  if (target === null) {
    return { visible: true, enabled: false, hint: 'Elige un objetivo.' }
  }

  return { visible: true, enabled: true, hint: null }
}
