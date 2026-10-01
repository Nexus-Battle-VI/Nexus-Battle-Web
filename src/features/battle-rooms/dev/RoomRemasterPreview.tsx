import { useEffect, useMemo, useRef, useState } from 'react'

import { useSession } from '@/shared/session'
import { useTheme } from '@/shared/theme'
import { BattleRoomLobbyPage } from '../BattleRoomLobbyPage'
import type { BattleRoom } from '../types'

/**
 * Vista previa de desarrollo del REMASTER VISUAL de "Jugar Online" — sala de
 * espera (Sprint 3, pantalla 2 del informe de auditoria).
 *
 * Mismo criterio que `LobbyRemasterPreview`: intercepta `fetch` para
 * `/v1/combat/rooms*` y ofrece controles para ver, sin backend real ni
 * sesiones concurrentes:
 *
 * - formato 1v1 / 2v2 / 3v3;
 * - sala parcialmente llena / llena (`PREPARING`) / cancelada;
 * - vista como propietario / como participante NO propietario;
 * - chat de sala (queda "inicia sesion" porque no hay `accessToken` real).
 *
 * MONTA `BattleRoomLobbyPage` (componente de produccion) DIRECTAMENTE, SIN
 * ningun `Router` propio: la app ya esta bajo un Router (React Router no
 * admite anidar dos). El `:roomId` que `useParams` necesita lo aporta la
 * propia ruta DEV externa (`__dev/battle-rooms/room-remaster-preview/:roomId`,
 * ver `dev-routes.tsx`), que redirige aqui con el id fijo por defecto.
 */
export const FIXED_ROOM_ID = '22222222-2222-4222-8222-222222222222'
const OWNER_SUBJECT = 'sujeto-propietario-preview-sala'
const GUEST_SUBJECT = 'sujeto-invitado-preview-sala'

type Format = 1 | 2 | 3
type Fullness = 'partial' | 'full'
type Status = 'WAITING_FOR_PLAYERS' | 'PREPARING' | 'CANCELLED'

const humanOf = (
  playerId: string,
  displayName: string,
  index: number,
): BattleRoom['teams'][number]['participants'][number] => ({
  kind: 'HUMAN',
  playerId,
  heroId: `heroe-preview-${String(index)}`,
  joinedAt: '2026-09-20T10:00:00.000Z',
  displayName,
})

const buildRoom = (format: Format, fullness: Fullness, status: Status): BattleRoom => {
  const namesA = ['Richard', 'Diego', 'Felipe']
  const namesB = ['Invitada', 'Carla', 'Elena']
  const teamAParticipants = Array.from({ length: format }, (_value, index) =>
    humanOf(
      index === 0 ? OWNER_SUBJECT : `sujeto-a-${String(index)}`,
      namesA[index] ?? 'Jugador',
      index,
    ),
  )
  const teamBFullCount = fullness === 'full' ? format : Math.max(format - 1, 0)
  const teamBParticipants = Array.from({ length: teamBFullCount }, (_value, index) =>
    humanOf(
      index === 0 ? GUEST_SUBJECT : `sujeto-b-${String(index)}`,
      namesB[index] ?? 'Jugador',
      index,
    ),
  )

  return {
    id: FIXED_ROOM_ID,
    mode: 'PVP',
    status,
    teams: [
      { label: 'A', capacity: format, participants: teamAParticipants },
      { label: 'B', capacity: format, participants: teamBParticipants },
    ],
    reward: { amount: format === 1 ? 2 : 4 },
    createdBy: OWNER_SUBJECT,
    createdAt: '2026-09-20T09:55:00.000Z',
    version: 3,
  }
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export const RoomRemasterPreview = (): React.JSX.Element => {
  const [format, setFormat] = useState<Format>(2)
  const [fullness, setFullness] = useState<Fullness>('partial')
  const [status, setStatus] = useState<Status>('WAITING_FOR_PLAYERS')
  const [viewAs, setViewAs] = useState<'owner' | 'guest'>('owner')

  const currentRoom = useMemo(
    () => buildRoom(format, status === 'PREPARING' ? 'full' : fullness, status),
    [format, fullness, status],
  )
  // Mismo criterio que `LobbyRemasterPreview`: el interceptor lee la sala
  // ACTUAL por esta ref (nunca por un cierre atado al momento de instalar el
  // parche), asi que instalarlo puede hacerse UNA sola vez (deps `[]`) y
  // ningun cambio de formato/estado desinstala `globalThis.fetch` -- sin esa
  // ventana no hay carrera posible con una peticion real de React Query en
  // vuelo bajo StrictMode.
  const roomRef = useRef(currentRoom)
  useEffect(() => {
    roomRef.current = currentRoom
  }, [currentRoom])

  useEffect(() => {
    const previous = useSession.getState()
    useSession.setState({
      subject: viewAs === 'owner' ? OWNER_SUBJECT : GUEST_SUBJECT,
      accessToken: null,
      expiresAt: null,
    })

    return () => {
      useSession.setState(previous)
    }
  }, [viewAs])

  useEffect(() => {
    const original = globalThis.fetch

    const patched = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url,
        globalThis.location.origin,
      )
      const room = roomRef.current

      if (url.pathname.endsWith('/v1/combat/rooms') && (init?.method ?? 'GET') === 'GET') {
        // La lista solo trae salas `WAITING_FOR_PLAYERS` (mismo contrato real
        // documentado en `BattleRoomLobbyPage`): para `PREPARING`/`CANCELLED`
        // se cae al detalle por id, como en produccion.
        return Promise.resolve(jsonResponse(room.status === 'WAITING_FOR_PLAYERS' ? [room] : []))
      }
      if (/\/v1\/combat\/rooms\/[^/]+$/u.test(url.pathname) && (init?.method ?? 'GET') === 'GET') {
        return Promise.resolve(jsonResponse(room))
      }
      if (/\/v1\/combat\/rooms\/[^/]+\/(cancel|leave|start)$/u.test(url.pathname)) {
        return Promise.resolve(jsonResponse(room))
      }

      return original(input, init)
    }

    globalThis.fetch = patched

    return () => {
      if (globalThis.fetch === patched) {
        globalThis.fetch = original
      }
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-warning bg-surface px-4 py-2 text-xs text-muted">
        <p>
          Vista previa de desarrollo — remaster visual "Jugar Online" (sala de espera). La sala esta
          simulada (intercepta `fetch`). No es evidencia E2E.
        </p>
        <div className="flex flex-wrap gap-2">
          <fieldset className="flex gap-1">
            <legend className="sr-only">Formato</legend>
            {([1, 2, 3] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded px-2 py-1 ${format === option ? 'bg-brand text-white' : 'border border-border'}`}
                onClick={() => {
                  setFormat(option)
                }}
              >
                {option}v{option}
              </button>
            ))}
          </fieldset>
          <fieldset className="flex gap-1">
            <legend className="sr-only">Estado</legend>
            {(['WAITING_FOR_PLAYERS', 'PREPARING', 'CANCELLED'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded px-2 py-1 ${status === option ? 'bg-brand text-white' : 'border border-border'}`}
                onClick={() => {
                  setStatus(option)
                }}
              >
                {option}
              </button>
            ))}
          </fieldset>
          {status === 'WAITING_FOR_PLAYERS' && (
            <button
              type="button"
              className={`rounded px-2 py-1 ${fullness === 'full' ? 'bg-brand text-white' : 'border border-border'}`}
              onClick={() => {
                setFullness(fullness === 'full' ? 'partial' : 'full')
              }}
            >
              {fullness === 'full' ? 'llena' : 'parcial'}
            </button>
          )}
          <button
            type="button"
            className={`rounded px-2 py-1 ${viewAs === 'owner' ? 'bg-brand text-white' : 'border border-border'}`}
            onClick={() => {
              setViewAs(viewAs === 'owner' ? 'guest' : 'owner')
            }}
          >
            {viewAs === 'owner' ? 'propietario' : 'invitado'}
          </button>
          <button
            type="button"
            className="rounded border border-border px-2 py-1"
            onClick={() => {
              useTheme.getState().toggleTheme()
            }}
          >
            Alternar tema
          </button>
        </div>
      </div>
      <BattleRoomLobbyPage />
    </div>
  )
}
