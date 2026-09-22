import type { TargetRef } from './types'

/**
 * Una intencion de ataque basico (HU-18): lo unico que Web decide es a QUIEN quiere
 * atacar. El resultado lo decide Combat.
 *
 * `commandId` identifica la INTENCION, no el envio: se genera una sola vez por accion
 * del jugador y un reintento reutiliza el MISMO id. Asi Combat es idempotente (devuelve
 * el resultado guardado, sin sortear ni restar Vida otra vez); un id nuevo por cada
 * envio duplicaria el golpe.
 */
export interface AttackIntent {
  readonly commandId: string
  readonly target: TargetRef
}

export interface AttackIntentState {
  /** La intencion enviada que todavia no tiene resultado; `null` si no hay ninguna. */
  readonly intent: AttackIntent | null
  /**
   * No se sabe si Combat llego a procesarla: se perdio la conexion o el servidor pidio
   * reintentar (`COMMAND_CONFLICT`). Solo entonces se ofrece «Reintentar», con el mismo
   * `commandId`.
   */
  readonly unconfirmed: boolean
  /** Codigo estable del ultimo rechazo definitivo (`NOT_YOUR_TURN`, `INVALID_TARGET`...). */
  readonly rejection: string | null
}

export const initialAttackIntentState: AttackIntentState = {
  intent: null,
  unconfirmed: false,
  rejection: null,
}

/** Rechazo que NO cierra la intencion: Combat pide reintentar con el mismo `commandId`. */
const RETRYABLE_REJECTION = 'COMMAND_CONFLICT'

export type AttackIntentAction =
  | { readonly type: 'sent'; readonly intent: AttackIntent }
  /** Llego el resultado (en vivo o por `resume`) del comando con este `commandId`. */
  | { readonly type: 'resolved'; readonly commandId: string }
  | { readonly type: 'rejected'; readonly code: string; readonly commandId?: string }
  | { readonly type: 'connectionLost' }
  | { readonly type: 'retried' }
  | { readonly type: 'dismissed' }

/**
 * Reductor PURO de la intencion de ataque. Todo lo que no corresponde a la intencion
 * vigente (otro `commandId`, ninguna intencion) se ignora: un rechazo o un resultado
 * ajeno nunca cambia el estado de MI ataque.
 */
export const attackIntentReducer = (
  state: AttackIntentState,
  action: AttackIntentAction,
): AttackIntentState => {
  switch (action.type) {
    case 'sent':
      return { intent: action.intent, unconfirmed: false, rejection: null }
    case 'resolved':
      return state.intent?.commandId === action.commandId ? initialAttackIntentState : state
    case 'rejected': {
      if (state.intent === null || action.commandId !== state.intent.commandId) {
        return state
      }

      return action.code === RETRYABLE_REJECTION
        ? { ...state, unconfirmed: true }
        : { intent: null, unconfirmed: false, rejection: action.code }
    }
    case 'connectionLost':
      return state.intent !== null && !state.unconfirmed ? { ...state, unconfirmed: true } : state
    case 'retried':
      return state.intent !== null && state.unconfirmed ? { ...state, unconfirmed: false } : state
    case 'dismissed':
      return state.rejection === null ? state : { ...state, rejection: null }
  }
}
