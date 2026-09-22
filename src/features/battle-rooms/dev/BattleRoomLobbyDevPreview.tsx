import { useEffect, useState } from 'react'

import { useSession } from '@/shared/session'
import { BattleRoomLobbyPage } from '../BattleRoomLobbyPage'
import type { BattleRoom } from '../types'

/**
 * Vista previa de desarrollo del lobby de preparacion (HU-15.3, punto C).
 *
 * Existe por la misma razon que el resto de `__dev/*`: la pantalla real
 * exige un jugador con heroe equipado en Player-Inventory (regla de negocio
 * que NUNCA se relaja, ni siquiera aqui) y una sesion real, y el entorno
 * local no puede satisfacer eso sin levantar el stack completo. Este
 * preview intercepta `fetch` para `/api/v1/combat/rooms*` (mismo patron que
 * `ModerationQueueDevPreview`) y falsea una sesion SIN `accessToken`, para
 * que `useBattleRoomRealtime` quede en `disabled` y no intente abrir un
 * WebSocket real -- misma convencion que usan las pruebas de
 * `BattleRoomLobbyPage.test.tsx` (`AUTHENTICATED_NO_SOCKET`).
 *
 * MONTA EL COMPONENTE DE PRODUCCION (`BattleRoomLobbyPage`), no una copia:
 * si el lobby real cambia, este preview cambia con el.
 *
 * NO ES UNA PUERTA TRASERA: solo existe con `import.meta.env.DEV`, no
 * desactiva la validacion de heroe equipado (esa regla vive en Combat/
 * Player-Inventory, fuera del alcance de este archivo), y no expone ningun
 * atajo que salte `POST /join` real en produccion.
 */
export const FIXED_ROOM_ID = '11111111-1111-4111-8111-111111111111'

const OWNER_SUBJECT = 'sujeto-propietario-preview'
const GUEST_SUBJECT = 'sujeto-invitado-preview'

const baseRoom = (): BattleRoom => ({
  id: FIXED_ROOM_ID,
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    {
      label: 'A',
      capacity: 2,
      participants: [
        {
          kind: 'HUMAN',
          playerId: OWNER_SUBJECT,
          heroId: 'heroe-guerrero-tanque',
          joinedAt: '2026-09-20T10:00:00.000Z',
          displayName: 'Richard',
        },
      ],
    },
    {
      label: 'B',
      capacity: 2,
      participants: [
        {
          kind: 'HUMAN',
          playerId: GUEST_SUBJECT,
          heroId: 'heroe-mago-fuego',
          joinedAt: '2026-09-20T10:01:00.000Z',
          displayName: 'Invitada',
        },
      ],
    },
  ],
  reward: { amount: 250 },
  createdBy: OWNER_SUBJECT,
  createdAt: '2026-09-20T09:55:00.000Z',
  version: 2,
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const handleCombatRequest = (
  url: URL,
  init: RequestInit | undefined,
  room: BattleRoom,
): Response => {
  if (url.pathname.endsWith('/v1/combat/rooms') && (init?.method ?? 'GET') === 'GET') {
    return jsonResponse([room])
  }

  // `cancel`/`leave`/`join` no tienen efecto persistente en este preview
  // (solo demuestra el diseño, no el ciclo de vida real): devuelven la
  // misma sala sin mutarla, para que el boton se pueda pulsar sin lanzar un
  // error de red.
  if (/\/v1\/combat\/rooms\/[^/]+\/(cancel|leave|join)$/u.test(url.pathname)) {
    return jsonResponse(room)
  }

  return jsonResponse({ message: 'Ruta no simulada en este preview.' }, 404)
}

export const BattleRoomLobbyDevPreview = (): React.JSX.Element => {
  const [viewAs, setViewAs] = useState<'owner' | 'guest'>('owner')

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
    const room = baseRoom()

    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url,
        globalThis.location.origin,
      )

      if (url.pathname.includes('/v1/combat/rooms')) {
        return Promise.resolve(handleCombatRequest(url, init, room))
      }

      return original(input, init)
    }

    return () => {
      globalThis.fetch = original
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface/40 px-4 py-2 text-xs text-muted">
        <p>
          Vista previa de desarrollo. La sala esta simulada (intercepta `fetch`): cancelar/abandonar
          no llegan a Combat de verdad.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded px-2 py-1 ${viewAs === 'owner' ? 'bg-brand text-white' : 'border border-border'}`}
            onClick={() => {
              setViewAs('owner')
            }}
          >
            Ver como propietario
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 ${viewAs === 'guest' ? 'bg-brand text-white' : 'border border-border'}`}
            onClick={() => {
              setViewAs('guest')
            }}
          >
            Ver como invitado
          </button>
        </div>
      </div>
      <BattleRoomLobbyPage />
    </div>
  )
}
