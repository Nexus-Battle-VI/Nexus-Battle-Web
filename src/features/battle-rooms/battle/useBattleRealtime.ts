import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import { newCommandId, type CommandIdFactory } from '../commandId'
import {
  defaultSocketFactory,
  openRealtimeConnection,
  type RealtimeConnectionState,
  type SocketFactory,
  type TicketProvider,
} from '../realtime'
import { issueRealtimeTicket } from './api'
import {
  attackIntentReducer,
  initialAttackIntentState,
  type AttackIntent,
  type AttackIntentState,
} from './attackIntent'
import { battleReducer, initialBattleState, type BattleClientState } from './battleReducer'
import {
  initialSkillIntentState,
  skillIntentReducer,
  type SkillIntent,
  type SkillIntentState,
} from './skillIntent'
import {
  isBattleEventMessage,
  isCommandRejectedMessage,
  isResumeOkMessage,
  isSnapshotMessage,
  type TargetRef,
} from './types'

/** Comando rechazado que corresponde al ataque basico (HU-18); el resto de rechazos es de `resume`. */
const ATTACK_COMMAND = 'attack'
/** Comando rechazado que corresponde a una habilidad (HU-19). */
const SKILL_COMMAND = 'useSkill'

export interface BattleRealtime extends BattleClientState {
  readonly connection: RealtimeConnectionState
  /**
   * Codigo estable de un `command.rejected` de `resume` (p. ej. `NOT_A_PARTICIPANT`,
   * `ROOM_NOT_FOUND`), o `null`. Mientras no sea `null` la batalla no es accesible.
   * Los rechazos del ataque basico NO llegan aqui: van a `attack.rejection`.
   */
  readonly rejected: string | null
  /** La intencion de ataque en curso y el ultimo rechazo definitivo (HU-18). */
  readonly attack: AttackIntentState
  /** Envia un ataque basico contra UN objetivo. No hace nada si ya hay uno pendiente o no hay conexion lista. */
  readonly sendAttack: (target: TargetRef) => void
  /** Reenvia la intencion pendiente con el MISMO `commandId` (Combat es idempotente). */
  readonly retryAttack: () => void
  readonly dismissAttackRejection: () => void
  /** La intencion de habilidad en curso y el ultimo rechazo definitivo (HU-19). */
  readonly skill: SkillIntentState
  /**
   * Envia una habilidad contra UN objetivo. No hace nada si ya hay una accion (ataque o habilidad)
   * pendiente o no hay conexion lista: una accion por turno.
   */
  readonly sendSkill: (abilityId: string, target: TargetRef) => void
  /** Reenvia la habilidad pendiente con el MISMO `commandId` (Combat es idempotente). */
  readonly retrySkill: () => void
  readonly dismissSkillRejection: () => void
}

/**
 * Batalla en tiempo real (HU-17, ADR-020) y ataque basico (HU-18).
 *
 * Abre la conexion compartida (ticket -> `auth` -> `auth.ok`) y envia
 * `{"type":"resume","roomId","lastSeq"?}`:
 *
 *  - PRIMERA conexion de la pantalla: sin `lastSeq` -> el servidor responde con un
 *    `snapshot` completo del estado visible.
 *  - RECONEXION dentro de la misma pantalla: con el `lastSeq` en memoria -> el
 *    servidor reenvia en orden solo los eventos que faltan (o un `snapshot`).
 *
 * Solo se guarda en memoria `roomId` y `lastSeq`: nunca se persiste el estado
 * autoritativo en el navegador (un `lastSeq` viejo sin la vista correspondiente
 * dejaria la pantalla sin estado tras recargar; el `snapshot` es lo correcto).
 * Web NO tiene semilla ni estado del generador: no existen en el contrato.
 *
 * Los eventos se aplican por `seq` con `battleReducer`: duplicados y viejos se
 * ignoran; un salto de `seq` pide `resume` por el mismo socket, sin inventar los
 * mensajes perdidos. Mientras la conexion esta caida se conserva lo ultimo que dijo
 * el servidor y no se calcula ningun resultado local.
 *
 * ATAQUE BASICO: `sendAttack` envia SOLO `{type, commandId, roomId, target}`. El
 * `commandId` se genera UNA vez por intencion; no hay reenvio automatico (ni con el
 * mismo id ni con uno nuevo) tras una reconexion: el resultado llega por `resume` o el
 * jugador decide reintentar, con el mismo id. Mientras hay una intencion pendiente no se
 * envia otra (un doble clic no duplica el golpe).
 *
 * HABILIDAD (HU-19): `sendSkill` envia SOLO `{type, commandId, roomId, abilityId, target}`, con las
 * mismas reglas: un `commandId` por intencion, sin reenvio automatico y sin acciones simultaneas
 * (una habilidad y un ataque pendientes se bloquean entre si). Una habilidad que Combat degrada a
 * ataque basico (Poder insuficiente) llega como el resultado de ese mismo `commandId`.
 */
export const useBattleRealtime = (
  roomId: string | null,
  socketFactory: SocketFactory = defaultSocketFactory,
  ticketProvider: TicketProvider = issueRealtimeTicket,
  createCommandId: CommandIdFactory = newCommandId,
): BattleRealtime => {
  const [state, dispatch] = useReducer(battleReducer, initialBattleState)
  const [attack, attackDispatch] = useReducer(attackIntentReducer, initialAttackIntentState)
  const [skill, skillDispatch] = useReducer(skillIntentReducer, initialSkillIntentState)
  const [connection, setConnection] = useState<RealtimeConnectionState>('connecting')
  const [rejected, setRejected] = useState<string | null>(null)
  const lastSeqRef = useRef(0)
  const syncedRef = useRef(false)
  const attackRef = useRef<AttackIntentState>(initialAttackIntentState)
  const skillRef = useRef<SkillIntentState>(initialSkillIntentState)
  const sendRef = useRef<((payload: unknown) => void) | null>(null)

  useEffect(() => {
    lastSeqRef.current = state.lastSeq
  }, [state.lastSeq])

  useEffect(() => {
    syncedRef.current = state.synced
  }, [state.synced])

  useEffect(() => {
    attackRef.current = attack
  }, [attack])

  useEffect(() => {
    skillRef.current = skill
  }, [skill])

  useEffect(() => {
    if (roomId === null) {
      return
    }

    const link = openRealtimeConnection({
      socketFactory,
      ticketProvider,
      onStateChange: (next) => {
        setConnection(next)

        if (next !== 'open') {
          sendRef.current = null
        }
      },
      onAuthenticated: (send) => {
        sendRef.current = send
        send(
          lastSeqRef.current > 0
            ? { type: 'resume', roomId, lastSeq: lastSeqRef.current }
            : { type: 'resume', roomId },
        )
      },
      onConnectionLost: () => {
        sendRef.current = null
        dispatch({ type: 'connectionLost' })
        attackDispatch({ type: 'connectionLost' })
        skillDispatch({ type: 'connectionLost' })
      },
      onMessage: (message) => {
        if (isSnapshotMessage(message)) {
          if (message.roomId === roomId) {
            dispatch({ type: 'snapshot', message })
          }
        } else if (isBattleEventMessage(message)) {
          if (message.roomId === roomId) {
            dispatch({ type: 'event', message })

            if (message.type === 'basicAttackResolved') {
              // El resultado de MI comando cierra la intencion, llegue en vivo o por
              // `resume`; el de otro participante no coincide con ningun `commandId`. Una
              // habilidad degradada a ataque basico llega aqui con el `commandId` de la
              // habilidad: cierra la intencion de habilidad.
              attackDispatch({ type: 'resolved', commandId: message.commandId })
              skillDispatch({ type: 'resolved', commandId: message.commandId })
            } else if (message.type === 'skillUsed') {
              skillDispatch({ type: 'resolved', commandId: message.commandId })
            }
          }
        } else if (isResumeOkMessage(message)) {
          if (message.roomId === roomId) {
            dispatch({ type: 'synced' })
          }
        } else if (isCommandRejectedMessage(message)) {
          if (message.command === ATTACK_COMMAND) {
            attackDispatch({
              type: 'rejected',
              code: message.code,
              ...(message.commandId === undefined ? {} : { commandId: message.commandId }),
            })
          } else if (message.command === SKILL_COMMAND) {
            skillDispatch({
              type: 'rejected',
              code: message.code,
              ...(message.commandId === undefined ? {} : { commandId: message.commandId }),
            })
          } else if (message.command === undefined) {
            setRejected(message.code)
          }
        }
      },
    })

    return () => {
      link.close()
      sendRef.current = null
    }
  }, [roomId, socketFactory, ticketProvider])

  // Un salto de `seq` (mensajes perdidos) se recupera con `resume` por el mismo
  // socket; nunca reconstruyendo el estado localmente.
  useEffect(() => {
    if (state.needsResync && roomId !== null && sendRef.current !== null) {
      sendRef.current({ type: 'resume', roomId, lastSeq: state.lastSeq })
      dispatch({ type: 'resyncRequested' })
    }
  }, [state.needsResync, state.lastSeq, roomId])

  const sendAttack = useCallback(
    (target: TargetRef): void => {
      const send = sendRef.current

      // Solo con la conexion lista y sin otra intencion en vuelo. `attackRef` se adelanta
      // aqui (no espera al render) para que un doble clic inmediato tambien se bloquee.
      if (
        roomId === null ||
        send === null ||
        !syncedRef.current ||
        attackRef.current.intent !== null ||
        skillRef.current.intent !== null
      ) {
        return
      }

      const intent: AttackIntent = {
        commandId: createCommandId(),
        target: { teamLabel: target.teamLabel, seat: target.seat },
      }

      attackRef.current = { intent, unconfirmed: false, rejection: null }
      attackDispatch({ type: 'sent', intent })
      send({ type: ATTACK_COMMAND, commandId: intent.commandId, roomId, target: intent.target })
    },
    [roomId, createCommandId],
  )

  const retryAttack = useCallback((): void => {
    const send = sendRef.current
    const current = attackRef.current

    if (roomId === null || send === null || !syncedRef.current) {
      return
    }

    if (current.intent === null || !current.unconfirmed) {
      return
    }

    attackRef.current = { ...current, unconfirmed: false }
    attackDispatch({ type: 'retried' })
    send({
      type: ATTACK_COMMAND,
      commandId: current.intent.commandId,
      roomId,
      target: current.intent.target,
    })
  }, [roomId])

  const dismissAttackRejection = useCallback((): void => {
    attackDispatch({ type: 'dismissed' })
  }, [])

  const sendSkill = useCallback(
    (abilityId: string, target: TargetRef): void => {
      const send = sendRef.current

      // Igual que el ataque: solo con la conexion lista y sin otra accion en vuelo, adelantando la
      // referencia para que un doble clic inmediato tambien se bloquee.
      if (
        roomId === null ||
        send === null ||
        !syncedRef.current ||
        attackRef.current.intent !== null ||
        skillRef.current.intent !== null
      ) {
        return
      }

      const intent: SkillIntent = {
        commandId: createCommandId(),
        abilityId,
        target: { teamLabel: target.teamLabel, seat: target.seat },
      }

      skillRef.current = { intent, unconfirmed: false, rejection: null }
      skillDispatch({ type: 'sent', intent })
      send({
        type: SKILL_COMMAND,
        commandId: intent.commandId,
        roomId,
        abilityId: intent.abilityId,
        target: intent.target,
      })
    },
    [roomId, createCommandId],
  )

  const retrySkill = useCallback((): void => {
    const send = sendRef.current
    const current = skillRef.current

    if (roomId === null || send === null || !syncedRef.current) {
      return
    }

    if (current.intent === null || !current.unconfirmed) {
      return
    }

    skillRef.current = { ...current, unconfirmed: false }
    skillDispatch({ type: 'retried' })
    send({
      type: SKILL_COMMAND,
      commandId: current.intent.commandId,
      roomId,
      abilityId: current.intent.abilityId,
      target: current.intent.target,
    })
  }, [roomId])

  const dismissSkillRejection = useCallback((): void => {
    skillDispatch({ type: 'dismissed' })
  }, [])

  return {
    ...state,
    connection: roomId === null ? 'disabled' : connection,
    rejected,
    attack,
    sendAttack,
    retryAttack,
    dismissAttackRejection,
    skill,
    sendSkill,
    retrySkill,
    dismissSkillRejection,
  }
}
