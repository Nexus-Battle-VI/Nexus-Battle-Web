import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { AccountPage } from '../AccountPage'
import { PREVIEW_ACCOUNT } from './previewRoutes'

/**
 * Vista previa de desarrollo de "Mi cuenta" (HU-05.4).
 *
 * Existe SOLO para revisar visualmente la pantalla mientras el entorno local no
 * puede establecer una sesion real (el proveedor de identidad de desarrollo no
 * siembra credenciales; ver informe). No cambia `/account` productivo, no toca
 * `RequireSession` y no finge autenticacion: monta el MISMO `AccountPage` de
 * produccion y le da la cuenta por la cache de consultas, marcada como fixture.
 *
 * No monta su propio router: es el elemento de la ruta `__dev/account` del arbol
 * real, y `AccountPage` resuelve sus secciones por el `<Outlet>` de esa ruta
 * (`accountPreviewChildren`). `dev-routes.tsx` solo la agrega con
 * `import.meta.env.DEV`.
 */

const previewQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
})
previewQueryClient.setQueryData(queryKeys.account.me, PREVIEW_ACCOUNT)

export const AccountDevPreview = (): React.JSX.Element => (
  <QueryClientProvider client={previewQueryClient}>
    <div className="min-h-dvh">
      <p className="bg-brand/10 px-4 py-2 text-center text-xs text-ink">
        Vista previa de desarrollo — datos de ejemplo (fixture DEV). No es una sesion real.
      </p>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <AccountPage />
      </main>
    </div>
  </QueryClientProvider>
)
