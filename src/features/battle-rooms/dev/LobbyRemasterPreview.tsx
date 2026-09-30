import { useEffect, useRef, useState } from 'react'

import { useSession } from '@/shared/session'
import { useTheme } from '@/shared/theme'
import { BattleRoomsPage } from '../BattleRoomsPage'
import type { BattleRoom } from '../types'

/**
 * Vista previa de desarrollo del REMASTER VISUAL de "Jugar Online" — lobby
 * general (Sprint 3, pantalla 1 del informe de auditoria).
 *
 * Richard no puede reproducir en local un listado con salas PVP/PVE, 1v1/2v2/
 * 3v3 y apuestas activas a la vez (necesitaria varias sesiones reales creando
 * salas concurrentemente). Este preview intercepta `fetch` para
 * `/v1/combat/rooms` (mismo patron que `BattleRoomLobbyDevPreview`) y ofrece
 * un selector de ESCENARIO para ver, sin red real:
 *
 * - listado con varias salas (PVP/PVE, 1v1/2v2/3v3, con y sin apuesta);
 * - lista vacia;
 * - error de carga;
 * - loading (nunca resuelve, para inspeccionar el estado de carga).
 *
 * MONTA `BattleRoomsPage` — el componente de produccion completo (crear sala,
 * salas disponibles, filtros, chat del lobby) — no una copia. El chat queda
 * en su estado real "inicia sesion para escribir" porque este preview no
 * simula un WebSocket (la sesion falsa no tiene `accessToken`, igual que el
 * resto de previews `__dev/*`).
 *
 * NO ES UNA PUERTA TRASERA y NO ES EVIDENCIA E2E: solo existe con
 * `import.meta.env.DEV`.
 */
const OWNER_SUBJECT = 'sujeto-propietario-preview-lobby'

type Scenario = 'many' | 'empty' | 'error' | 'loading'

const room = (overrides: Partial<BattleRoom> & Pick<BattleRoom, 'id'>): BattleRoom => ({
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    { label: 'A', capacity: 1, participants: [] },
    { label: 'B', capacity: 1, participants: [] },
  ],
  reward: { amount: 2 },
  createdBy: OWNER_SUBJECT,
  createdAt: '2026-09-20T09:55:00.000Z',
  version: 1,
  ...overrides,
})

const MANY_ROOMS: readonly BattleRoom[] = [
  room({ id: 'sala-pvp-1v1', mode: 'PVP', reward: { amount: 2 } }),
  room({
    id: 'sala-pvp-2v2-apuesta',
    mode: 'PVP',
    reward: { amount: 4 },
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
            stake: { amount: 50, status: 'ACTIVE' },
          },
        ],
      },
      { label: 'B', capacity: 2, participants: [] },
    ],
    stakePool: { total: 50 },
  }),
  room({
    id: 'sala-pve-3v3',
    mode: 'PVE',
    reward: { amount: 4 },
    teams: [
      { label: 'A', capacity: 3, participants: [] },
      {
        label: 'B',
        capacity: 3,
        participants: Array.from({ length: 3 }, () => ({
          kind: 'AI' as const,
          playerId: null,
          heroId: null,
          joinedAt: '2026-09-20T09:55:00.000Z',
        })),
      },
    ],
  }),
  room({ id: 'sala-pvp-llena', mode: 'PVP', status: 'PREPARING', reward: { amount: 2 } }),
]

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export const LobbyRemasterPreview = (): React.JSX.Element => {
  const [scenario, setScenario] = useState<Scenario>('many')
  // El interceptor de `fetch` lee el escenario ACTUAL por esta ref, no por un
  // cierre capturado en el momento de instalar el parche. Si el efecto que
  // instala el parche dependiera de `scenario` (como en un intento anterior),
  // cada cambio de escenario desinstalaria y reinstalaria `globalThis.fetch`
  // -- y bajo StrictMode (que monta/desmonta/remonta efectos en desarrollo)
  // esa ventana de desinstalacion puede coincidir con una peticion real de
  // React Query en vuelo, que entonces golpea el backend real y devuelve 404.
  // Instalar el parche UNA sola vez (deps `[]`, mismo patron ya usado por
  // `BattleRoomLobbyDevPreview`) y leer el escenario por ref elimina esa
  // ventana de raiz: nunca hay un instante sin interceptor activo.
  const scenarioRef = useRef(scenario)
  useEffect(() => {
    scenarioRef.current = scenario
  }, [scenario])

  useEffect(() => {
    const previous = useSession.getState()
    useSession.setState({ subject: OWNER_SUBJECT, accessToken: null, expiresAt: null })

    return () => {
      useSession.setState(previous)
    }
  }, [])

  useEffect(() => {
    const original = globalThis.fetch

    const patched = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url,
        globalThis.location.origin,
      )

      if (url.pathname.includes('/v1/combat/rooms') && (init?.method ?? 'GET') === 'GET') {
        const scenarioNow = scenarioRef.current

        if (scenarioNow === 'loading') {
          return new Promise<Response>(() => undefined)
        }
        if (scenarioNow === 'error') {
          return Promise.resolve(jsonResponse({ message: 'Error simulado del preview.' }, 500))
        }
        if (scenarioNow === 'empty') {
          return Promise.resolve(jsonResponse([]))
        }
        return Promise.resolve(jsonResponse(MANY_ROOMS))
      }

      if (/\/v1\/combat\/rooms\/[^/]+\/(cancel|join)$/u.test(url.pathname)) {
        return Promise.resolve(jsonResponse(MANY_ROOMS[0]))
      }
      if (url.pathname.endsWith('/v1/combat/rooms') && (init?.method ?? 'GET') === 'POST') {
        return Promise.resolve(jsonResponse(MANY_ROOMS[0]))
      }
      if (url.pathname.includes('/v1/combat/me/rooms')) {
        return Promise.resolve(jsonResponse([]))
      }

      return original(input, init)
    }

    globalThis.fetch = patched

    return () => {
      // Solo restaura si sigue siendo NUESTRO parche: evita pisar el `fetch`
      // real si, bajo StrictMode, la limpieza se ejecuta fuera de orden.
      if (globalThis.fetch === patched) {
        globalThis.fetch = original
      }
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-warning bg-surface px-4 py-2 text-xs text-muted">
        <p>
          Vista previa de desarrollo — remaster visual "Jugar Online" (lobby). Listado y creacion
          estan simulados (intercepta `fetch`). No es evidencia E2E.
        </p>
        <div className="flex flex-wrap gap-2">
          {(['many', 'empty', 'error', 'loading'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded px-2 py-1 ${scenario === option ? 'bg-brand text-white' : 'border border-border'}`}
              onClick={() => {
                setScenario(option)
              }}
            >
              {option}
            </button>
          ))}
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
      <BattleRoomsPage />
    </div>
  )
}
