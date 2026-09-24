import { Link, useParams } from 'react-router'

import { useSession } from '@/shared/session'
import type { CommandIdFactory } from '../commandId'
import type { SocketFactory, TicketProvider } from '../realtime'

import { BattleScreen } from './BattleScreen'
import { describeRejection } from './presentation'
import { useBattleRealtime } from './useBattleRealtime'

export interface BattlePageProps {
  /** Inyectables para pruebas (mismo patron que `useBattleRoomRealtime`). */
  readonly socketFactory?: SocketFactory
  readonly ticketProvider?: TicketProvider
  /** Fija el `commandId` del ataque en las pruebas; en produccion es un UUID nuevo por intencion. */
  readonly createCommandId?: CommandIdFactory
}

const BackToRooms = (): React.JSX.Element => (
  <Link
    to="/play"
    className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
  >
    Volver a Jugar Online
  </Link>
)

const Notice = ({
  children,
  alert = false,
}: {
  readonly children: React.ReactNode
  readonly alert?: boolean
}): React.JSX.Element => (
  <section aria-label="Batalla" className="flex flex-col items-start gap-3">
    <p
      role={alert ? 'alert' : 'status'}
      className={alert ? 'text-sm text-danger' : 'text-sm text-muted'}
    >
      {children}
    </p>
    <BackToRooms />
  </section>
)

/**
 * Pantalla de batalla de una sala (HU-17). Continua el MISMO flujo de Jugar Online
 * (`/play` -> lobby -> batalla), sin una entrada paralela.
 *
 * La transicion a la batalla depende SIEMPRE del servidor:
 *
 *  - `PREPARING`: el LOBBY (`BattleRoomLobbyPage`) es quien pide el inicio ahora
 *    -- solo el propietario, con un boton explicito (control de inicio del
 *    propietario, 2026-09-22) -- y solo navega aqui cuando Combat ya publico
 *    `IN_BATTLE`. Esta pantalla YA NO llama a `POST .../start`: si de todos
 *    modos llega aqui con la sala aun `PREPARING` (enlace directo, recarga
 *    antes del evento realtime) simplemente espera el `battleStarted` por
 *    WebSocket, nunca lo dispara ella misma.
 *  - `IN_BATTLE`: pinta la cola y el turno que Combat publica.
 *
 * El heroe y el nombre que se ven salen del estado real autorizado (la cola), no
 * de datos fijos del cliente. La Vida, el resultado del ultimo ataque y el turno
 * tambien: los publica Combat (HU-18) y aqui solo se pintan.
 */
export const BattlePage = ({
  socketFactory,
  ticketProvider,
  createCommandId,
}: BattlePageProps): React.JSX.Element => {
  const { roomId = null } = useParams<{ roomId: string }>()
  const subject = useSession((state) => state.subject)
  const realtime = useBattleRealtime(roomId, socketFactory, ticketProvider, createCommandId)

  if (roomId === null) {
    return <Notice alert>No se indicó ninguna batalla.</Notice>
  }

  if (realtime.connection === 'disabled') {
    return <Notice alert>Tu sesión expiró. Vuelve a iniciar sesión para ver la batalla.</Notice>
  }

  if (realtime.rejected !== null) {
    return <Notice alert>{describeRejection(realtime.rejected)}</Notice>
  }

  // HU-21: una sala FINISHED sin `result` es de un Combat anterior a HU-21; se
  // avisa sin inventar un resultado.
  if (realtime.roomStatus === 'FINISHED' && realtime.result === null) {
    return <Notice>La batalla terminó.</Notice>
  }

  if (realtime.battle !== null) {
    return (
      <BattleScreen
        battle={realtime.battle}
        subject={subject}
        connection={realtime.connection}
        synced={realtime.synced}
        lastAttack={realtime.lastAttack}
        lastSkill={realtime.lastSkill}
        lastHealSkill={realtime.lastHealSkill}
        result={realtime.result}
        lastTurnTimeout={realtime.lastTurnTimeout}
        serverClock={realtime.serverClock}
        combat={{
          attack: realtime.attack,
          onAttack: realtime.sendAttack,
          onRetry: realtime.retryAttack,
          onDismissRejection: realtime.dismissAttackRejection,
          skill: realtime.skill,
          onUseSkill: realtime.sendSkill,
          onRetrySkill: realtime.retrySkill,
          onDismissSkillRejection: realtime.dismissSkillRejection,
        }}
      />
    )
  }

  if (realtime.roomStatus === 'CANCELLED') {
    return <Notice alert>La sala fue cancelada. Elige otra sala para continuar.</Notice>
  }

  if (realtime.roomStatus === 'WAITING_FOR_PLAYERS') {
    return (
      <Notice>
        La sala todavía espera jugadores.{' '}
        <Link to={`/play/rooms/${encodeURIComponent(roomId)}`} className="underline">
          Volver a la sala
        </Link>
      </Notice>
    )
  }

  if (realtime.roomStatus === 'PREPARING') {
    // El lobby es quien pide el inicio ahora; esta pantalla solo espera el
    // `battleStarted` por WebSocket (ver docstring de `BattlePage`).
    return (
      <section aria-label="Batalla" className="flex flex-col items-start gap-3">
        <p role="status" className="text-sm text-muted">
          Preparando la batalla…
        </p>
        <BackToRooms />
      </section>
    )
  }

  if (realtime.connection === 'failed') {
    return (
      <Notice alert>
        No se pudo autenticar la conexión en tiempo real. Vuelve a entrar a la batalla.
      </Notice>
    )
  }

  return (
    <p role="status" className="text-sm text-muted">
      {realtime.connection === 'reconnecting' ? 'Reconectando…' : 'Conectando con la batalla…'}
    </p>
  )
}
