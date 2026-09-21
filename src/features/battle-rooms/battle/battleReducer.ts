import type {
  BasicAttackResolution,
  BattleEventMessage,
  BattleView,
  DegradedFrom,
  SkillUsedMessage,
  SnapshotMessage,
  TargetRef,
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
}

export const initialBattleState: BattleClientState = {
  roomStatus: null,
  battle: null,
  lastSeq: 0,
  synced: false,
  needsResync: false,
  lastAttack: null,
  lastSkill: null,
}

export type BattleAction =
  | { readonly type: 'snapshot'; readonly message: SnapshotMessage }
  | { readonly type: 'event'; readonly message: BattleEventMessage }
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
 *    mensajes perdidos.
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
      }
    case 'event': {
      const { message } = action

      if (message.seq <= state.lastSeq) {
        return state
      }

      if (message.seq !== state.lastSeq + 1) {
        return state.needsResync ? state : { ...state, needsResync: true }
      }

      return {
        ...state,
        roomStatus: 'IN_BATTLE',
        battle: message.battle,
        lastSeq: message.seq,
        lastAttack: lastAttackOf(message, state.lastAttack),
        lastSkill: lastSkillOf(message, state.lastSkill),
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
