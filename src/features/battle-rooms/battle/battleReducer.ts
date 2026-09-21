import type { BattleEventMessage, BattleView, SnapshotMessage } from './types'

/**
 * Estado del cliente de la batalla: SOLO lo que el servidor ha publicado.
 *
 * No hay un segundo estado autoritativo: `battle` es la ultima vista recibida
 * (cada evento lleva la vista completa) y `lastSeq` el ultimo `seq` aplicado.
 * El cliente nunca deriva el turno (`+ 1`): pinta `battle.currentTurn`.
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
}

export const initialBattleState: BattleClientState = {
  roomStatus: null,
  battle: null,
  lastSeq: 0,
  synced: false,
  needsResync: false,
}

export type BattleAction =
  | { readonly type: 'snapshot'; readonly message: SnapshotMessage }
  | { readonly type: 'event'; readonly message: BattleEventMessage }
  | { readonly type: 'synced' }
  | { readonly type: 'connectionLost' }
  | { readonly type: 'resyncRequested' }

/**
 * Reductor PURO de la batalla (HU-17):
 *
 *  - `snapshot`: reemplaza el estado por el visible del servidor.
 *  - `event`: aplica SOLO si `seq === lastSeq + 1`. Un `seq` repetido o anterior
 *    (duplicado, evento viejo) se IGNORA -- no duplica efectos ni retrocede el
 *    turno -- y un salto (`seq > lastSeq + 1`) NO se aplica: marca `needsResync`
 *    para recuperar con `resume`, sin reconstruir mensajes perdidos.
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
