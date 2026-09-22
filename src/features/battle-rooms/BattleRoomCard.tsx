import { useId, useState } from 'react'
import { Link } from 'react-router'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Coins } from '@/components/ui/icons'

import { modeLabel, occupancyOf, teamByLetter } from './presentation'
import type { JoinBattleRoomFailure } from './presentation'
import {
  creditAmountText,
  describeStakeReservation,
  parseStakeInput,
  roomHasStakes,
} from './battle/stakePresentation'
import type { BattleRoom, TeamLetter } from './types'

export interface BattleRoomCardProps {
  readonly room: BattleRoom
  /** `true` si la sesion actual es quien creo esta sala. Solo controla si se ve el boton: la autoridad real es el backend. */
  readonly isOwn: boolean
  /** `true` si el sujeto de la sesion actual ya es participante de esta sala (creador o no). */
  readonly isParticipant: boolean
  readonly onCancel: (roomId: string) => void
  readonly cancelling: boolean
  /**
   * HU-15.3/HU-23: unirse a un equipo explicito, con la apuesta propia opcional
   * (`null` = no apostar). La autoridad final sigue siendo Combat/Wallet.
   */
  readonly onJoin: (roomId: string, team: TeamLetter, stakeAmount: number | null) => void
  /** Equipo con una solicitud de union en curso PARA ESTA sala, o `null` si ninguna. */
  readonly joiningTeam: TeamLetter | null
  /**
   * Fallo del ultimo intento de union a ESTA sala (HU-15.3 + HU-16.3,
   * `joinBattleRoomFailure`), o `null` si ninguno. `action`, cuando existe,
   * es siempre una ruta ya existente de la app (nunca una pantalla nueva).
   */
  readonly joinError: JoinBattleRoomFailure | null
}

/**
 * Fila del listado de salas disponibles. Muestra unicamente datos reales de
 * `BattleRoomResponse` (modalidad, estado, cupos, recompensa) — sin nombre de
 * sala, mapa, region ni jugadores conectados, porque Combat no devuelve nada
 * de eso.
 *
 * `room.id` (UUID tecnico) NO se muestra al jugador de NINGUNA forma visual
 * (HU-14.4, refinamiento final): ni como texto, ni como `title`/tooltip
 * nativo del navegador -un `title` seria igualmente visible al pasar el
 * mouse, asi que tampoco es aceptable-. Sigue usandose intacto, sin
 * transformar, para todo lo tecnico: la key de React, la cancelacion, la
 * union y la busqueda por ID del panel (exigida por el enunciado de HU-14.4).
 * El unico lugar donde el id sobrevive en el DOM es `data-testid`: un
 * atributo que ninguna persona ve ni al inspeccionar visualmente la
 * pantalla, presente solo para que las pruebas puedan localizar una tarjeta
 * concreta sin depender de texto que si es visible (modalidad/estado/
 * recompensa pueden repetirse entre salas distintas).
 *
 * HU-15.3: el boton "Unirse — Próximamente" se sustituye por dos acciones
 * reales, una por equipo. Cada boton muestra su propia ocupacion y se
 * deshabilita visualmente cuando ese equipo esta lleno o la sala no admite
 * union (`status !== 'WAITING_FOR_PLAYERS'`) — pero esa es solo una
 * comodidad de UI: si la sala se llena justo antes de que el clic llegue al
 * backend, la solicitud se envia igual y el 409 real se muestra tal cual
 * (ver `AvailableBattleRoomsPanel`), nunca se oculta. Quien YA es
 * participante ve un enlace a la sala en vez de los botones de union.
 *
 * HU-23 (D1): cada quien indica SU propio monto al unirse; nadie iguala a
 * nadie. Sin monto (vacio o `0`) el boton une DIRECTAMENTE, exactamente como
 * antes de HU-23; con monto, primero se muestra cuanto se va a reservar y se
 * confirma (D8: la reserva es sincrona). Si la sala ya tiene apuestas activas
 * se anuncia con el total agregado que publica Combat (§10: nunca el monto de
 * un rival).
 */
export const BattleRoomCard = ({
  room,
  isOwn,
  isParticipant,
  onCancel,
  cancelling,
  onJoin,
  joiningTeam,
  joinError,
}: BattleRoomCardProps): React.JSX.Element => {
  const { filled, total } = occupancyOf(room)
  const teamA = teamByLetter(room, 'A')
  const teamB = teamByLetter(room, 'B')
  const canJoin = room.status === 'WAITING_FOR_PLAYERS'
  const stakeFieldId = useId()

  const [stakeInput, setStakeInput] = useState('0')
  const [stakeError, setStakeError] = useState<string | null>(null)
  const [pendingJoin, setPendingJoin] = useState<{
    readonly team: TeamLetter
    readonly amount: number
  } | null>(null)

  const stake = parseStakeInput(stakeInput)
  const hasStakes = roomHasStakes(room)

  const requestJoin = (letter: TeamLetter): void => {
    if (stake.error !== null) {
      setStakeError(stake.error)
      return
    }

    setStakeError(null)

    if (stake.amount === null) {
      onJoin(room.id, letter, null)
      return
    }

    setPendingJoin({ team: letter, amount: stake.amount })
  }

  const confirmJoin = (): void => {
    if (pendingJoin === null) {
      return
    }

    onJoin(room.id, pendingJoin.team, pendingJoin.amount)
    setPendingJoin(null)
  }

  const joinButton = (letter: TeamLetter, team: typeof teamA): React.JSX.Element | null => {
    if (team === undefined) {
      return null
    }

    const full = team.participants.length >= team.capacity
    const thisTeamPending = joiningTeam === letter
    const otherTeamPending = joiningTeam !== null && joiningTeam !== letter

    return (
      <Button
        variant="secondary"
        loading={thisTeamPending}
        disabled={!canJoin || full || otherTeamPending}
        onClick={() => {
          requestJoin(letter)
        }}
      >
        Unirse — Equipo {letter} ({team.participants.length}/{team.capacity})
      </Button>
    )
  }

  return (
    <li
      data-testid={`battle-room-${room.id}`}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors motion-safe:duration-150 hover:border-brand/40 hover:bg-surface-raised sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={room.status} />
          <span className="text-sm font-medium text-ink">{modeLabel(room.mode)}</span>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <span>
            {filled}/{total} jugadores
          </span>
          <span aria-hidden="true">·</span>
          <Coins aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-brand" />
          <span>{room.reward.amount.toLocaleString('es-CO')}</span>
        </p>
        {hasStakes && (
          <p className="text-xs font-medium text-brand">
            {`Apuestas activas: ${creditAmountText(room.stakePool?.total ?? 0)}`}
          </p>
        )}
        {joinError !== null && (
          <p
            role="alert"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-danger"
          >
            <span>{joinError.message}</span>
            {joinError.action !== null && (
              <Link to={joinError.action.to} className="font-medium underline hover:no-underline">
                {joinError.action.label}
              </Link>
            )}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
        {isOwn && (
          <Button
            variant="danger"
            loading={cancelling}
            onClick={() => {
              onCancel(room.id)
            }}
          >
            Cancelar
          </Button>
        )}
        {isParticipant ? (
          <Link
            to={`/play/rooms/${room.id}`}
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Ver sala
          </Link>
        ) : pendingJoin !== null ? (
          <div className="flex flex-col items-stretch gap-2 rounded-lg border border-brand/40 p-2 sm:items-end">
            <p role="status" className="text-xs text-ink">
              {describeStakeReservation(pendingJoin.amount)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setPendingJoin(null)
                }}
              >
                Cancelar
              </Button>
              <Button loading={joiningTeam === pendingJoin.team} onClick={confirmJoin}>
                {`Confirmar y unirse al equipo ${pendingJoin.team}`}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-stretch gap-1 sm:items-end">
              <label htmlFor={stakeFieldId} className="text-xs text-muted">
                Apostar créditos (opcional)
              </label>
              <input
                id={stakeFieldId}
                type="number"
                min={0}
                step="1"
                inputMode="numeric"
                value={stakeInput}
                aria-invalid={stakeError !== null}
                onChange={(event) => {
                  setStakeInput(event.target.value)
                }}
                className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-ink sm:w-28"
              />
              {stakeError !== null && (
                <p role="alert" className="text-xs text-danger">
                  {stakeError}
                </p>
              )}
            </div>
            {joinButton('A', teamA)}
            {joinButton('B', teamB)}
          </>
        )}
      </div>
    </li>
  )
}
