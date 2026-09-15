import { Link } from 'react-router'

import { formatDateTime } from '@/lib/format'
import { CatalogNotificationBadge } from './CatalogNotificationBadge'
import { usePendingCatalogNotifications } from './usePendingCatalogNotifications'

/**
 * Resumen de novedades del catalogo en la vista principal (HU-38, Task #185).
 *
 * Adaptacion del mockup de Figma: mismo titulo, subtitulo y composicion
 * (badge + descripcion + fecha por fila), pero dentro del `AppLayout` real en
 * lugar de un frame aislado -sin selector Light/Dark propio, el global de
 * `AppHeader` ya cubre eso-.
 *
 * Consulta e independiente del resto de `CommercePage` (seccion 13/43): un
 * fallo aqui no debe romper carrito ni vitrina, y se resuelve devolviendo
 * `null` cuando no hay nada que mostrar -sin panel vacio-.
 */
export const CatalogNotificationsSummary = (): React.JSX.Element | null => {
  const { items, isLoading, error } = usePendingCatalogNotifications()

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted">
        Cargando novedades del catálogo...
      </p>
    )
  }

  if (error !== null) {
    return (
      <p role="alert" className="text-sm text-danger">
        No se pudieron cargar las novedades del catálogo.
      </p>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <section
      aria-label="Novedades del catálogo"
      className="rounded-lg border border-border bg-surface-raised p-5"
    >
      <h2 className="text-lg font-semibold text-ink">Novedades del catálogo</h2>
      <p className="mt-1 text-sm text-muted">
        Resumen desde tu última sesión. Cambios repetidos al mismo producto se consolidan en una
        sola notificación.
      </p>

      <ul className="mt-4 flex flex-col divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <CatalogNotificationBadge changeType={item.changeType} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{item.description}</p>
              <p className="mt-0.5 text-xs text-muted">{formatDateTime(item.implementedAt)}</p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        to="/notifications"
        className="mt-4 inline-block text-sm font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Ver historial ›
      </Link>
    </section>
  )
}
