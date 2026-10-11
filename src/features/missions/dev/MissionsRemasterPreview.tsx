import { NavLink, Outlet } from 'react-router'

import { missionContentFixture } from '@/test/mission-content-fixture'
import { useSession } from '@/shared/session'
import { useTheme, type Theme } from '@/shared/theme'

import {
  PREVIEW_ENROLLMENT_ID,
  previewActive,
  previewBoard,
  previewDetail,
  previewDifficulties,
  previewEstimate,
  previewHeroes,
  previewHistory,
  previewLog,
  previewReport,
  previewSummary,
} from './missionsPreviewFixtures'

/**
 * Vista previa de desarrollo del remaster visual de Misiones (EN-031).
 *
 * NO ES UNA PANTALLA DEL PRODUCTO. Las pantallas reales viven tras
 * `RequireSession` y necesitan Missions, Player-Inventory y Combat
 * respondiendo de verdad. Esta vista MONTA LOS COMPONENTES DE PRODUCCION (las
 * paginas de `features/missions`), no copias: falsea una sesion e intercepta
 * `fetch` para las rutas de Missions mientras esta montada, con la misma
 * tecnica que `PlayerInventoryDevPreview`.
 *
 * El progreso revela la bitacora guionizada de tres en tres, cada dos
 * segundos, para ver el diorama reproducirla de punta a punta.
 *
 * Solo se alcanza con `import.meta.env.DEV` (ver `src/routes/dev-routes.tsx`).
 */
let fetchPatchInstalled = false
let revealed = 0

const json = (body: unknown, status = 200): Promise<Response> =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  )

const respond = (url: URL, init: RequestInit | undefined): Promise<Response> | null => {
  const path = url.pathname
  const now = new Date().toISOString()
  if (path === '/api/inventories/me/heroes') return json(previewHeroes)
  if (path === '/api/v1/admin/missions') return json([missionContentFixture()])
  if (path.startsWith('/api/v1/admin/missions/')) {
    return init?.method === 'PUT' ? json(missionContentFixture()) : json(missionContentFixture())
  }
  if (path.startsWith('/api/v1/catalog/products')) return json({ items: [], total: 0 })
  if (!path.startsWith('/api/v1/missions')) return null
  if (path === '/api/v1/missions') return json({ items: previewBoard })
  if (path === '/api/v1/missions/me/active') return json(previewActive(now))
  if (path === '/api/v1/missions/me/history') return json(previewHistory)
  if (path === '/api/v1/missions/me/history/summary') return json(previewSummary)
  if (path === '/api/v1/missions/me/achievements') return json({ items: [] })
  if (path.startsWith('/api/v1/missions/me/reports/')) return json(previewReport)
  if (path.startsWith('/api/v1/missions/me/progress/')) {
    const after = Number(url.searchParams.get('after') ?? '0')
    revealed = revealed >= previewLog.length ? previewLog.length : revealed + 3
    const entries = previewLog.slice(0, revealed).filter((entry) => entry.seq > after)
    const finished = revealed >= previewLog.length
    return json({
      enrollmentId: PREVIEW_ENROLLMENT_ID,
      missionId: 'msn_templo_olvidado',
      missionName: 'El Templo Olvidado',
      difficulty: 'HEROIC',
      status: finished ? 'COMPLETED' : 'IN_PROGRESS',
      startedAt: now,
      endsAt: null,
      serverTime: now,
      progressPercent: finished ? 100 : 45,
      remainingSeconds: finished ? 0 : 23_400,
      simulated: true,
      finished,
      reportAvailable: finished,
      hero: { heroId: 'heroe-vista-previa', name: 'Kaelen', maxHealth: 40, health: 31 },
      entries,
      lastSeq: revealed,
      nextRevealAt: finished ? null : new Date(Date.now() + 2000).toISOString(),
    })
  }
  if (path.endsWith('/difficulties')) return json(previewDifficulties)
  if (path.endsWith('/estimate'))
    return json(previewEstimate(url.searchParams.get('difficulty') ?? ''))
  if (path.includes('/strategies/')) return json({ code: 'STRATEGY_NOT_FOUND' }, 404)
  if (path.endsWith('/enrollments')) {
    return json(
      {
        enrollmentId: PREVIEW_ENROLLMENT_ID,
        missionId: 'msn_templo_olvidado',
        heroId: 'heroe-vista-previa',
        difficulty: 'NORMAL',
        status: 'IN_PROGRESS',
        startedAt: now,
        endsAt: null,
      },
      201,
    )
  }
  if (path.startsWith('/api/v1/missions/')) return json(previewDetail)
  return null
}

const installFetchPatch = (): void => {
  if (fetchPatchInstalled) return
  fetchPatchInstalled = true
  const original = globalThis.fetch
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(href, window.location.origin)
    return respond(url, init) ?? original(input, init)
  }
}

const THEMES: readonly { readonly value: Theme; readonly label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

const LINKS: readonly { readonly to: string; readonly label: string }[] = [
  { to: '.', label: 'Tablón' },
  { to: 'm/msn_templo_olvidado', label: 'Detalle' },
  { to: `progress/${PREVIEW_ENROLLMENT_ID}`, label: 'Progreso (diorama)' },
  { to: 'history', label: 'Historial' },
  { to: 'reports/matricula-informe', label: 'Informe' },
  { to: 'admin', label: 'Editor (admin)' },
]

/**
 * Se instala al cargar el modulo, antes del primer render: las paginas montadas
 * debajo preguntan a Missions en cuanto aparecen. El modulo solo se carga al
 * abrir la ruta de la vista previa.
 */
installFetchPatch()
useSession.setState({
  subject: 'jugador-vista-previa',
  accessToken: 'vista-previa',
  expiresAt: Date.now() + 3_600_000,
})

export const MissionsRemasterPreview = (): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  const setTheme = useTheme((state) => state.setTheme)

  return (
    <div className="min-h-dvh">
      <nav className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-raised px-4 py-2 text-sm">
        <strong className="mr-2 text-ink">Vista previa · Misiones (EN-031)</strong>
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '.'}
            onClick={() => {
              revealed = 0
            }}
            className={({ isActive }) =>
              isActive ? 'font-semibold text-brand underline' : 'text-brand hover:underline'
            }
          >
            {link.label}
          </NavLink>
        ))}
        <span className="ml-auto flex gap-2">
          {THEMES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={theme === option.value}
              className="rounded border border-border px-2 py-0.5 text-ink aria-pressed:bg-brand/20"
              onClick={() => {
                setTheme(option.value)
              }}
            >
              {option.label}
            </button>
          ))}
        </span>
      </nav>
      <main className="missions-main mx-auto w-full px-3 py-4 sm:px-4">
        <Outlet />
      </main>
    </div>
  )
}
