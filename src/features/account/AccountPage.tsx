import { Outlet } from 'react-router'

import { Card } from '@/components/ui/Card'
import { HttpError } from '@/lib/http'
import { AccountSummary } from './AccountSummary'
import { AccountSectionNav } from './AccountSectionNav'
import type { AccountOutletContext } from './outletContext'
import { useOwnAccount } from './useOwnAccount'

/**
 * "Mi cuenta" (HU-05.4).
 *
 * Shell de la seccion: cabecera propia, resumen de cuenta + navegacion interna
 * en la columna de contexto, y el contenido de la seccion activa en el panel
 * principal (`<Outlet>`). Resuelve `GET /api/accounts/me` UNA vez y reparte la
 * cuenta a las secciones por contexto de outlet; aqui se gestionan los estados
 * de carga, error y sesion caducada para no repetirlos en cada seccion.
 *
 * No trae un segundo encabezado global ni repite el logo: eso vive en
 * `AppHeader`, que ademas oculta el conmutador de tema global mientras se esta
 * en `/account` (el control de tema vive en "Preferencias").
 */
export const AccountPage = (): React.JSX.Element => {
  const query = useOwnAccount()

  const sessionExpired = query.error instanceof HttpError && query.error.isUnauthorized

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Mi cuenta</h1>
        <p className="mt-1 text-sm text-muted">
          Administra tu perfil, seguridad y preferencias de Nexus Battles VI.
        </p>
      </header>

      {query.isLoading && (
        <p role="status" className="text-sm text-muted">
          Cargando tu cuenta...
        </p>
      )}

      {query.isError && (
        <Card>
          <p role="alert" className="text-sm text-danger">
            {sessionExpired
              ? 'Tu sesion ha caducado. Vuelve a iniciar sesion para gestionar tu cuenta.'
              : query.error instanceof Error
                ? query.error.message
                : 'No se pudo cargar tu cuenta.'}
          </p>
        </Card>
      )}

      {query.isSuccess && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_1fr]">
          <aside className="space-y-4">
            <Card>
              <AccountSummary account={query.data} />
            </Card>
            <AccountSectionNav />
          </aside>

          <div className="min-w-0">
            <Outlet context={{ account: query.data } satisfies AccountOutletContext} />
          </div>
        </div>
      )}
    </div>
  )
}
