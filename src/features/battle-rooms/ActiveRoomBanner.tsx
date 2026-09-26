import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { Swords } from '@/components/ui/icons'
import { useSession } from '@/shared/session'

import { useMyActiveRooms } from './hooks'
import { modeLabel } from './presentation'
import type { BattleRoom, BattleRoomStatus } from './types'

interface ActiveStatusCopy {
  readonly title: string
  readonly action: string
  readonly toBattle: boolean
}

/** Texto y destino por estado. Solo estados NO terminales: Combat no devuelve otros. */
const STATUS_COPY: Readonly<Partial<Record<BattleRoomStatus, ActiveStatusCopy>>> = {
  WAITING_FOR_PLAYERS: {
    title: 'battle:active.WAITING_FOR_PLAYERS',
    action: 'battle:backToRoom',
    toBattle: false,
  },
  PREPARING: {
    title: 'battle:active.PREPARING',
    action: 'battle:backToRoom',
    toBattle: false,
  },
  IN_BATTLE: {
    title: 'battle:active.IN_BATTLE',
    action: 'battle:active.continue',
    toBattle: true,
  },
}

/** "1 vs 1", "2 vs 2"... a partir de la capacidad real de cada equipo. */
const formatOf = (room: BattleRoom): string =>
  room.teams.map((team) => String(team.capacity)).join(' vs ')

/** Equipo del jugador en la sala, o `null` si solo la creo y aun no se unio. */
const myTeamOf = (room: BattleRoom, subject: string): string | null =>
  room.teams.find((team) =>
    team.participants.some((participant) => participant.playerId === subject),
  )?.label ?? null

interface ActiveRoomItemProps {
  readonly room: BattleRoom
  readonly subject: string
}

const ActiveRoomItem = ({ room, subject }: ActiveRoomItemProps): React.JSX.Element | null => {
  const copy = STATUS_COPY[room.status]
  const { t } = useTranslation()

  if (copy === undefined) {
    return null
  }

  const myTeam = myTeamOf(room, subject)
  const details = [
    modeLabel(room.mode),
    formatOf(room),
    myTeam === null ? null : t('battle:active.myTeam', { team: myTeam }),
    room.createdBy === subject ? t('battle:active.owner') : null,
  ].filter((detail): detail is string => detail !== null)
  const target = copy.toBattle ? `/play/rooms/${room.id}/battle` : `/play/rooms/${room.id}`

  return (
    <li className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-ink">{t(copy.title)}</p>
        <p className="text-sm text-muted">{details.join(' · ')}</p>
      </div>
      <Link
        to={target}
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {t(copy.action)}
      </Link>
    </li>
  )
}

/**
 * "Partida en curso" en Jugar Online: la sala (o salas) del jugador que aun no
 * terminaron, con el acceso directo que corresponde a su estado real.
 *
 * La fuente es SIEMPRE el servidor (`GET /v1/combat/me/rooms`): sobrevive a
 * navegar a otra pagina, recargar y volver a iniciar sesion, sin guardar el id
 * de la sala en el navegador. Nunca muestra el id de la sala.
 *
 * Sin salas, cargando o con error, no pinta nada: es un atajo, no puede
 * bloquear ni ensuciar el resto de la pantalla (el listado sigue disponible).
 */
export const ActiveRoomBanner = (): React.JSX.Element | null => {
  const subject = useSession((state) => state.subject)
  const rooms = useMyActiveRooms()
  const { t } = useTranslation()
  const active = (rooms.data ?? []).filter((room) => STATUS_COPY[room.status] !== undefined)

  if (subject === null || active.length === 0) {
    return null
  }

  return (
    <section
      aria-label={active.length === 1 ? t('battle:active.labelOne') : t('battle:active.labelMany')}
      className="flex gap-3 rounded-lg border border-brand bg-brand/10 p-4"
    >
      <span aria-hidden="true" className="hidden shrink-0 text-brand sm:block">
        <Swords className="h-6 w-6" />
      </span>
      <ul className="flex min-w-0 flex-1 flex-col gap-4">
        {active.map((room) => (
          <ActiveRoomItem key={room.id} room={room} subject={subject} />
        ))}
      </ul>
    </section>
  )
}
