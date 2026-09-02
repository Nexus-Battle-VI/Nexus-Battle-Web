import { Link, Outlet } from 'react-router'

import { Card } from '@/components/ui/Card'
import { ChevronLeft } from '@/components/ui/icons'
import { HttpError } from '@/lib/http'
import { ECOMMERCE_PATH } from '@/routes/routes'
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
 *
 * El control "Volver" vive UNA sola vez aqui, en la cabecera compartida, y por
 * tanto acompana a todas las secciones hijas (Perfil, Seguridad, Preferencias,
 * Estadisticas y logros, Suscripciones, Metodos de pago). Sale de `/account` y
 * regresa a la pantalla principal autenticada (`ECOMMERCE_PATH`), el mismo
 * destino canonico posterior al login. Es un enlace de React Router -no un
 * boton-: navega. No reconstruye `AppHeader` ni toca `PrimaryNav`.
 */
export const AccountPage = (): React.JSX.Element => {
  const query = useOwnAccount()

  const sessionExpired = query.error instanceof HttpError && query.error.isUnauthorized

  return (
    <div className="space-y-6">
      <header>
        <Link
          to={ECOMMERCE_PATH}
          className="mb-3 inline-flex items-center gap-1 rounded-md text-sm text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Volver
        </Link>
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
          <aside className="min-w-0 space-y-4">
            <Card>
              <AccountSummary account={query.data} />
            </Card>
            <AccountSectionNav roles={query.data.roles} />
          </aside>

          <div className="min-w-0">
            <Outlet context={{ account: query.data } satisfies AccountOutletContext} />
          </div>
        </div>
      )}
    </div>
  )
}
