import type { TargetRef } from './types'

/**
 * Una intencion de usar una habilidad (HU-19): lo unico que Web decide es CUAL habilidad y contra
 * QUIEN. El costo, la recarga, los efectos y el resultado los decide Combat.
 *
 * `commandId` identifica la INTENCION, no el envio: se genera una sola vez por accion del jugador y
 * un reintento reutiliza el MISMO id. Asi Combat es idempotente (devuelve el resultado guardado,
 * sin sortear, sin cobrar Poder ni marcar recarga otra vez); un id nuevo por cada envio
 * duplicaria la accion.
 */
export interface SkillIntent {
  readonly commandId: string
  /** `productId` de Catalog de la habilidad, tal como lo publica Combat en `skills[].abilityId`. */
  readonly abilityId: string
  readonly target: TargetRef
}

export interface SkillIntentState {
  /** La intencion enviada que todavia no tiene resultado; `null` si no hay ninguna. */
  readonly intent: SkillIntent | null
  /**
   * No se sabe si Combat llego a procesarla: se perdio la conexion o el servidor pidio reintentar
   * (`COMMAND_CONFLICT`). Solo entonces se ofrece «Reintentar», con el mismo `commandId`.
   */
  readonly unconfirmed: boolean
  /** Codigo estable del ultimo rechazo definitivo (`SKILL_ON_COOLDOWN`, `UNKNOWN_SKILL`...). */
  readonly rejection: string | null
}

export const initialSkillIntentState: SkillIntentState = {
  intent: null,
  unconfirmed: false,
  rejection: null,
}

/** Rechazo que NO cierra la intencion: Combat pide reintentar con el mismo `commandId`. */
const RETRYABLE_REJECTION = 'COMMAND_CONFLICT'

export type SkillIntentAction =
  | { readonly type: 'sent'; readonly intent: SkillIntent }
  /** Llego el resultado (en vivo o por `resume`) del comando con este `commandId`. */
  | { readonly type: 'resolved'; readonly commandId: string }
  | { readonly type: 'rejected'; readonly code: string; readonly commandId?: string }
  | { readonly type: 'connectionLost' }
  | { readonly type: 'retried' }
  | { readonly type: 'dismissed' }
  /** HU-21: la batalla termino; la accion que no llego a procesarse ya no aplica. */
  | { readonly type: 'finished' }

/**
 * Reductor PURO de la intencion de habilidad. Todo lo que no corresponde a la intencion vigente
 * (otro `commandId`, ninguna intencion) se ignora: un rechazo o un resultado ajeno nunca cambia el
 * estado de MI habilidad.
 *
 * Una habilidad degradada a ataque basico (Poder insuficiente) NO es un rechazo: llega como el
 * resultado de ese mismo `commandId` y cierra la intencion como cualquier otro resultado.
 */
export const skillIntentReducer = (
  state: SkillIntentState,
  action: SkillIntentAction,
): SkillIntentState => {
  switch (action.type) {
    case 'sent':
      return { intent: action.intent, unconfirmed: false, rejection: null }
    case 'resolved':
      return state.intent?.commandId === action.commandId ? initialSkillIntentState : state
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
    case 'finished':
      return state.intent === null ? state : initialSkillIntentState
  }
}
