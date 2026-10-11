import { useLayoutEffect, useState } from 'react'
import { Route, Routes } from 'react-router'

import { AdminHomePage } from '@/app/admin/AdminHomePage'
import { AdminLayout } from '@/app/admin/AdminLayout'
import { AuctionMetricsDevPreview } from '@/features/admin/auction-metrics/dev/AuctionMetricsDevPreview'
import { KnowledgeAdminPage } from '@/features/admin/chatbot/KnowledgeAdminPage'
import { TicketsAdminPage } from '@/features/admin/chatbot/TicketsAdminPage'
import { ModerationQueueDevPreview } from '@/features/admin/comments/dev/ModerationQueueDevPreview'
import { handleModerationRequest } from '@/features/admin/comments/dev/moderationQueueSimulation'
import type { AdminProductSummary } from '@/features/admin/products/api'
import { CreateProductPage } from '@/features/admin/products/CreateProductPage'
import { ProductManagementPage } from '@/features/admin/products/ProductManagementPage'
import { RoleManagementPage } from '@/features/admin/roles/RoleManagementPage'
import { BannerManagementDevPreview } from '@/features/notifications/dev/BannerManagementDevPreview'
import { useSession } from '@/shared/session'

/**
 * Vista previa de desarrollo de la Consola del Consejo (EN-031): el salon, la
 * barra lateral y el panel de inicio, con pendientes de ejemplo, y las
 * paginas ya migradas al kit (`./products`, `./products/new`, `./moderation`, `./banners`, `./roles`, `./chatbot/tickets`, `./chatbot/knowledge`, `./auction-metrics`) con datos inyectados por props.
 *
 * NO ES UNA PANTALLA DEL PRODUCTO. Intercepta `fetch` para la cola de
 * moderacion y los tickets del chatbot y pone una sesion con el rol elegido
 * SOLO mientras esta montada; al desmontar devuelve ambos a su estado. Solo
 * existe con `import.meta.env.DEV`.
 */
const ROLES = [
  ['Moderador', ['MODERATOR']],
  ['Administrador', ['ADMINISTRATOR']],
  ['Super administrador', ['SUPER_ADMINISTRATOR']],
  ['Game Master', ['PLAYER', 'GAME_MASTER']],
] as const

const PRODUCTS: readonly AdminProductSummary[] = [
  ['Espada del Alba', 'ARMA', 'ACTIVE', 'play'],
  ['Escudo de Roble', 'ARMADURA', 'ACTIVE', 'inventory'],
  ['Pocion de Furia', 'ITEM', 'SUSPENDED', 'gem'],
].map(([name, type, status, icon], index) => ({
  productId: `consejo-vista-previa-producto-${String(index)}`,
  sku: `SKU-${String(index)}`,
  name: name ?? '',
  imageUrl: `/assets/shell/nav/icon-${icon ?? 'gem'}-dark.png`,
  type: type as AdminProductSummary['type'],
  lifecycleStatus: status as AdminProductSummary['lifecycleStatus'],
  creditsPrice: 120 * (index + 1),
  premium: index === 0,
  realMoneyPrice: null,
  availableUnits: index === 2 ? 0 : 25,
  attributes: { values: { dropChanceBasisPoints: 500 } },
}))

/** Cuenta de ejemplo para la busqueda de Roles. */
const EXAMPLE_ACCOUNT = {
  id: 'consejo-vista-previa-cuenta',
  email: 'ana@ejemplo.test',
  displayName: 'Ana Guardiana',
  status: 'ACTIVE',
  roles: ['PLAYER', 'MODERATOR'],
  mfaEnrolled: true,
}

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const simulate = (url: string, init?: RequestInit): Response | null => {
  // La misma cola simulada que la vista previa de Moderacion: la insignia y la
  // pagina comparten cache, asi que ambas deben ver los mismos comentarios.
  if (url.includes('/api/comments/')) return handleModerationRequest(url, init)
  if (url.includes('/v1/chatbot/admin/tickets')) {
    return json(
      ['consejo-vista-previa-1', 'consejo-vista-previa-2'].map((id) => ({
        id,
        actor: 'jugador',
        question: '¿Cómo recojo mi cofre?',
        view: null,
        createdAt: new Date().toISOString(),
      })),
    )
  }
  return null
}

export const AdminConsolePreview = (): React.JSX.Element => {
  const [role, setRole] = useState('Super administrador')

  useLayoutEffect(() => {
    const original = globalThis.fetch
    const previous = useSession.getState()
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const simulated = simulate(url, init)
      return simulated !== null ? Promise.resolve(simulated) : original(input, init)
    }
    useSession.setState({
      subject: 'consejo-vista-previa',
      accessToken: 'token-consejo-vista-previa',
      expiresAt: Date.now() + 3_600_000,
      roles: ['SUPER_ADMINISTRATOR'],
    })
    return () => {
      globalThis.fetch = original
      useSession.setState({
        subject: previous.subject,
        accessToken: previous.accessToken,
        expiresAt: previous.expiresAt,
        roles: previous.roles,
      })
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Rol de ejemplo"
        className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface-raised/90 p-3"
      >
        <strong className="mr-2 self-center text-sm text-ink">Vista previa EN-031 · Consola</strong>
        {ROLES.map(([label, roles]) => (
          <button
            key={label}
            type="button"
            aria-pressed={role === label}
            className="rounded-md border border-border px-3 py-1 text-sm aria-pressed:bg-brand aria-pressed:text-brand-ink"
            onClick={() => {
              setRole(label)
              useSession.setState({ roles: [...roles] })
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="products/new" element={<CreateProductPage />} />
          <Route path="moderation" element={<ModerationQueueDevPreview />} />
          <Route path="chatbot/tickets" element={<TicketsAdminPage />} />
          <Route path="auction-metrics" element={<AuctionMetricsDevPreview />} />
          <Route path="chatbot/knowledge" element={<KnowledgeAdminPage />} />
          <Route path="banners" element={<BannerManagementDevPreview />} />
          <Route
            path="roles"
            element={
              <RoleManagementPage
                onSearch={() => Promise.resolve(EXAMPLE_ACCOUNT)}
                onAssign={() => Promise.resolve(EXAMPLE_ACCOUNT)}
                onRevoke={() => Promise.resolve(EXAMPLE_ACCOUNT)}
                confirmAction={() => true}
              />
            }
          />
          <Route
            path="products"
            element={
              <ProductManagementPage
                onSearch={() =>
                  Promise.resolve({
                    items: PRODUCTS,
                    page: 1,
                    pageSize: 20,
                    total: PRODUCTS.length,
                  })
                }
              />
            }
          />
        </Route>
      </Routes>
    </div>
  )
}
