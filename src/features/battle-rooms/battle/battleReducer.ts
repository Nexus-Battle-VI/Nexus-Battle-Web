import type {
  BasicAttackResolution,
  BattleEventMessage,
  BattleResult,
  BattleView,
  DegradedFrom,
  HealSkillUsedMessage,
  SkillUsedMessage,
  SnapshotMessage,
  TargetRef,
  UnrecognizedBattleEvent,
} from './types'

/**
 * El ultimo ataque basico que el servidor publico (HU-18), tal cual llego: alimenta el
 * mensaje de resultado. NO se deriva nada de el (ni dano, ni Vida, ni turno).
 */
export interface LastAttack {
  readonly seq: number
  readonly commandId: string
  readonly attacker: TargetRef
  readonly target: TargetRef
  readonly resolution: BasicAttackResolution
  readonly targetHealth: { readonly before: number; readonly after: number }
  /** HU-19: este ataque basico sustituyo a una habilidad (Poder insuficiente); ausente en un ataque normal. */
  readonly degradedFrom?: DegradedFrom
}

/**
 * La ultima habilidad que el servidor publico (HU-19), tal cual llego: alimenta el mensaje de
 * resultado. NO se deriva nada de ella (ni Poder, ni recarga, ni dano, ni turno).
 */
export interface LastSkill {
  readonly seq: number
  readonly commandId: string
  readonly actor: TargetRef
  readonly target: TargetRef
  readonly skill: SkillUsedMessage['skill']
  readonly power: SkillUsedMessage['power']
  readonly cooldown: SkillUsedMessage['cooldown']
  readonly bonus: SkillUsedMessage['bonus']
  readonly resolution: BasicAttackResolution
  readonly targetHealth: { readonly before: number; readonly after: number }
}

/**
 * La ultima habilidad de curacion que el servidor publico (excepcion de HU-12,
 * sin Task de Management), tal cual llego: alimenta el mensaje de resultado.
 * NO se deriva nada de ella. Distinta de `LastSkill`: sin `resolution` ni
 * `bonus` (curar no resuelve un golpe), con `heal` en su lugar.
 */
export interface LastHealSkill {
  readonly seq: number
  readonly commandId: string
  readonly actor: TargetRef
  readonly target: TargetRef
  readonly skill: HealSkillUsedMessage['skill']
  readonly power: HealSkillUsedMessage['power']
  readonly cooldown: HealSkillUsedMessage['cooldown']
  readonly heal: HealSkillUsedMessage['heal']
  readonly targetHealth: { readonly before: number; readonly after: number }
}

/**
 * EN-031: la ultima habilidad de dano directo (Agonia) o epica que el servidor publico, tal cual
 * llego. Ninguna de las dos resuelve Ataque contra Defensa, asi que comparten forma: actor, nombre,
 * Poder, recarga y, SOLO si los hubo, objetivo, dano, curacion y Vida «antes -> despues».
 */
export interface LastEffect {
  readonly seq: number
  readonly commandId: string
  readonly kind: 'directDamage' | 'epic'
  readonly actor: TargetRef
  readonly target: TargetRef | null
  readonly name: string
  readonly power: { readonly before: number; readonly after: number }
  readonly cooldown: { readonly remainingTurns: number }
  readonly appliedDamage: number | null
  readonly healed: number | null
  readonly targetHealth: { readonly before: number; readonly after: number } | null
}

/**
 * El ultimo turno perdido por tiempo que el servidor publico (HU-21), tal cual
 * llego: alimenta el aviso de la franja de resultado. No se deriva nada.
 */
export interface LastTurnTimeout {
  readonly seq: number
  readonly timedOut: TargetRef
  readonly occurredAt: string
}

/**
 * Estado del cliente de la batalla: SOLO lo que el servidor ha publicado.
 *
 * No hay un segundo estado autoritativo: `battle` es la ultima vista recibida
 * (cada evento lleva la vista completa, con la Vida y el turno YA actualizados) y
 * `lastSeq` el ultimo `seq` aplicado. El cliente nunca deriva el turno (`+ 1`) ni
 * la Vida: pinta `battle`.
 */
export interface BattleClientState {
  /** Estado de la sala segun la ultima instantanea (`PREPARING`, `IN_BATTLE`...); `null` sin datos. */
  readonly roomStatus: string | null
  readonly battle: BattleView | null
  /** Ultimo `seq` aplicado. 0 si todavia no se ha aplicado ningun evento. */
  readonly lastSeq: number
  /** `true` tras un `resume.ok`: el cliente esta al dia y recibe eventos en vivo. */
  readonly synced: boolean
  /** Se detecto un salto de `seq`: hay que pedir `resume` en lugar de inventar el estado. */
  readonly needsResync: boolean
  /** El ultimo ataque basico aplicado en vivo o por replay; `null` tras una instantanea. */
  readonly lastAttack: LastAttack | null
  /** La ultima habilidad aplicada en vivo o por replay (HU-19); `null` tras una instantanea. */
  readonly lastSkill: LastSkill | null
  /**
   * La ultima habilidad de curacion aplicada en vivo o por replay (excepcion
   * de HU-12); `null` tras una instantanea.
   */
  readonly lastHealSkill: LastHealSkill | null
  /** EN-031: el ultimo dano directo o epica aplicado; `null` tras una instantanea. */
  readonly lastEffect: LastEffect | null
  /**
   * HU-21: el resultado unico cuando la batalla termino (`battleFinished` o un
   * `snapshot` de una sala `FINISHED`); `null` mientras siga en curso.
   */
  readonly result: BattleResult | null
  /** HU-21: el ultimo `turnTimedOut` aplicado; `null` tras una instantanea. */
  readonly lastTurnTimeout: LastTurnTimeout | null
}

export const initialBattleState: BattleClientState = {
  roomStatus: null,
  battle: null,
  lastSeq: 0,
  synced: false,
  needsResync: false,
  lastAttack: null,
  lastSkill: null,
  lastHealSkill: null,
  lastEffect: null,
  result: null,
  lastTurnTimeout: null,
}

export type BattleAction =
  | { readonly type: 'snapshot'; readonly message: SnapshotMessage }
  | { readonly type: 'event'; readonly message: BattleEventMessage }
  /** EN-031: evento de un tipo que Web no conoce; solo se aplica su vista y su `seq`. */
  | { readonly type: 'unrecognizedEvent'; readonly message: UnrecognizedBattleEvent }
  | { readonly type: 'synced' }
  | { readonly type: 'connectionLost' }
  | { readonly type: 'resyncRequested' }

const lastAttackOf = (
  message: BattleEventMessage,
  previous: LastAttack | null,
): LastAttack | null =>
  message.type === 'basicAttackResolved'
    ? {
        seq: message.seq,
        commandId: message.commandId,
        attacker: message.attacker,
        target: message.target,
        resolution: message.resolution,
        targetHealth: message.targetHealth,
        ...(message.degradedFrom === undefined ? {} : { degradedFrom: message.degradedFrom }),
      }
    : previous

const lastSkillOf = (message: BattleEventMessage, previous: LastSkill | null): LastSkill | null =>
  message.type === 'skillUsed'
    ? {
        seq: message.seq,
        commandId: message.commandId,
        actor: message.actor,
        target: message.target,
        skill: message.skill,
        power: message.power,
        cooldown: message.cooldown,
        bonus: message.bonus,
        resolution: message.resolution,
        targetHealth: message.targetHealth,
      }
    : previous

const lastHealSkillOf = (
  message: BattleEventMessage,
  previous: LastHealSkill | null,
): LastHealSkill | null =>
  message.type === 'healSkillUsed'
    ? {
        seq: message.seq,
        commandId: message.commandId,
        actor: message.actor,
        target: message.target,
        skill: message.skill,
        power: message.power,
        cooldown: message.cooldown,
        heal: message.heal,
        targetHealth: message.targetHealth,
      }
    : previous

const lastEffectOf = (
  message: BattleEventMessage,
  previous: LastEffect | null,
): LastEffect | null => {
  if (message.type === 'directDamageSkillUsed') {
    return {
      seq: message.seq,
      commandId: message.commandId,
      kind: 'directDamage',
      actor: message.actor,
      target: message.target,
      name: message.skill.name,
      power: message.power,
      cooldown: message.cooldown,
      appliedDamage: message.damage.appliedDamage,
      healed: null,
      targetHealth: message.targetHealth,
    }
  }

  if (message.type === 'epicUsed') {
    return {
      seq: message.seq,
      commandId: message.commandId,
      kind: 'epic',
      actor: message.actor,
      target: message.target ?? null,
      name: message.epic.name,
      power: message.power,
      cooldown: message.cooldown,
      appliedDamage: message.damage?.appliedDamage ?? null,
      healed: message.heal?.amount ?? null,
      targetHealth: message.targetHealth ?? null,
    }
  }

  return previous
}

/** Mismas reglas de orden para todo evento: `apply` si toca aplicarlo, si no el estado a devolver. */
const orderedStep = (state: BattleClientState, seq: number): BattleClientState | 'apply' => {
  // HU-21: la batalla ya termino; ningun evento posterior se aplica.
  if (state.roomStatus === 'FINISHED' || seq <= state.lastSeq) {
    return state
  }

  if (seq !== state.lastSeq + 1) {
    return state.needsResync ? state : { ...state, needsResync: true }
  }

  return 'apply'
}

/**
 * Reductor PURO de la batalla (HU-17, HU-18):
 *
 *  - `snapshot`: reemplaza el estado por el visible del servidor. Una instantanea no
 *    trae acciones, asi que el ultimo ataque y la ultima habilidad (que quedarian viejos) se
 *    descartan.
 *  - `event`: aplica SOLO si `seq === lastSeq + 1`. Un `seq` repetido o anterior
 *    (duplicado, evento viejo) se IGNORA -- no duplica efectos, no repite el resultado,
 *    no resta Vida dos veces y no retrocede el turno -- y un salto (`seq > lastSeq + 1`)
 *    NO se aplica: marca `needsResync` para recuperar con `resume`, sin reconstruir
 *    mensajes perdidos. HU-21: tras `FINISHED` no se aplica NINGUN otro evento (el
 *    servidor no deberia enviarlo; si lo hace, se ignora).
 *  - `connectionLost`: deja de considerarse sincronizado; conserva lo ultimo que
 *    dijo el servidor (no inventa nada mientras dura la desconexion).
 */
export const battleReducer = (
  state: BattleClientState,
  action: BattleAction,
): BattleClientState => {
  switch (action.type) {
    case 'snapshot':
      return {
        ...state,
        roomStatus: action.message.status,
        battle: action.message.battle,
        lastSeq: action.message.seq,
        needsResync: false,
        lastAttack: null,
        lastSkill: null,
        lastHealSkill: null,
        lastEffect: null,
        result: action.message.result ?? null,
        lastTurnTimeout: null,
      }
    case 'event': {
      const { message } = action
      const step = orderedStep(state, message.seq)

      if (step !== 'apply') {
        return step
      }

      return {
        ...state,
        roomStatus: message.type === 'battleFinished' ? 'FINISHED' : 'IN_BATTLE',
        battle: message.battle,
        lastSeq: message.seq,
        lastAttack: lastAttackOf(message, state.lastAttack),
        lastSkill: lastSkillOf(message, state.lastSkill),
        lastHealSkill: lastHealSkillOf(message, state.lastHealSkill),
        lastEffect: lastEffectOf(message, state.lastEffect),
        result: message.type === 'battleFinished' ? message.result : state.result,
        lastTurnTimeout:
          message.type === 'turnTimedOut'
            ? { seq: message.seq, timedOut: message.timedOut, occurredAt: message.occurredAt }
            : state.lastTurnTimeout,
      }
    }
    case 'unrecognizedEvent': {
      const step = orderedStep(state, action.message.seq)

      return step !== 'apply'
        ? step
        : {
            ...state,
            roomStatus: 'IN_BATTLE',
            battle: action.message.battle,
            lastSeq: action.message.seq,
          }
    }
    case 'synced':
      return { ...state, synced: true, needsResync: false }
    case 'connectionLost':
      return state.synced ? { ...state, synced: false } : state
    case 'resyncRequested':
      return state.needsResync ? { ...state, needsResync: false, synced: false } : state
  }
}
