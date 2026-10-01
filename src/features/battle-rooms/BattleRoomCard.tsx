import { useId, useState } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { formatInteger } from '@/shared/i18n/format'

import './battle-rooms.css'
import { BattlePixelIcon } from './BattlePixelIcon'

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
  const { t } = useTranslation()

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
      // 5a pasada (seccion 6A del brief): recupera el marco PixelLab
      // (`.br-pixellab-secondary`, Dark y Light) para "Unirse".
      <Button
        variant="battle-secondary"
        className="br-pixellab-secondary"
        loading={thisTeamPending}
        disabled={!canJoin || full || otherTeamPending}
        onClick={() => {
          requestJoin(letter)
        }}
      >
        {t('battle:card.join', {
          team: letter,
          filled: String(team.participants.length),
          capacity: String(team.capacity),
        })}
      </Button>
    )
  }

  return (
    <li
      data-testid={`battle-room-${room.id}`}
      className={clsx(
        'br-room-card motion-safe:transition-shadow motion-safe:duration-150',
        room.mode === 'PVE' && 'br-room-card--pve',
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <BattlePixelIcon icon={room.mode === 'PVP' ? 'pvp' : 'pve'} size="md" />
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="br-section-title text-sm">{modeLabel(room.mode)}</span>
            <StatusBadge status={room.status} />
          </div>
          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--br-muted)' }}>
            <span>
              {t('battle:card.players', { filled: String(filled), total: String(total) })}
            </span>
            <span aria-hidden="true">·</span>
            <BattlePixelIcon icon="credits" size="sm" className="h-3.5 w-auto" />
            <span>{formatInteger(room.reward.amount)}</span>
            {hasStakes && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium" style={{ color: 'var(--br-accent-2)' }}>
                  {t('battle:card.activeStakes', {
                    amount: creditAmountText(room.stakePool?.total ?? 0),
                  })}
                </span>
              </>
            )}
          </p>
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
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {isOwn && (
          // 5a pasada (secciones 6A/19 del brief): recupera el marco
          // PixelLab (`.br-pixellab-danger`, Dark y Light).
          <Button
            variant="battle-danger"
            className="br-pixellab-danger"
            loading={cancelling}
            onClick={() => {
              onCancel(room.id)
            }}
          >
            {t('battle:cancel')}
          </Button>
        )}
        {isParticipant ? (
          <Link
            to={`/play/rooms/${room.id}`}
            className="br-btn-secondary br-pixellab-secondary inline-flex shrink-0 items-center justify-center whitespace-nowrap text-sm font-medium text-ink"
          >
            {t('battle:card.viewRoom')}
          </Link>
        ) : pendingJoin !== null ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/40 p-2">
            <p role="status" className="text-xs text-ink">
              {describeStakeReservation(pendingJoin.amount)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="battle-secondary"
                onClick={() => {
                  setPendingJoin(null)
                }}
              >
                {t('battle:cancel')}
              </Button>
              <Button
                variant="battle-primary"
                loading={joiningTeam === pendingJoin.team}
                onClick={confirmJoin}
              >
                {t('battle:card.confirmJoin', { team: pendingJoin.team })}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <label
                htmlFor={stakeFieldId}
                className="text-xs"
                style={{ color: 'var(--br-muted)' }}
              >
                {t('battle:card.stakeLabel')}
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
                className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm text-ink"
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
