import { useTranslation } from 'react-i18next'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { formatDateTime } from '@/lib/format'
import { CatalogNotificationBadge } from './CatalogNotificationBadge'
import { useCatalogNotificationHistory } from './useCatalogNotificationHistory'

/**
 * Historial de novedades del catalogo (HU-38).
 *
 * Reemplaza el marcador de posicion orientado a "correos transaccionales":
 * HU-38 no es una pantalla de correo, es el historial consultable de cambios
 * del catalogo. Consulta `/me/history`, NUNCA `/me/pending`, y no marca nada
 * como leido -eso solo ocurre desde el resumen de la vista principal, tras
 * presentar los pendientes-.
 *
 * El contrato no devuelve un campo `status` (leida/no leida): no se inventa
 * uno aqui.
 */
export const NotificationsPage = (): React.JSX.Element => {
  const { items, isLoading, error } = useCatalogNotificationHistory()
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Breadcrumb
        items={[
          { label: t('notifications:home'), to: '/ecommerce' },
          { label: t('notifications:history.crumb') },
        ]}
      />

      <header>
        <h1 className="text-2xl font-semibold text-ink">{t('notifications:history.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('notifications:history.subtitle')}</p>
      </header>

      {isLoading && (
        <p role="status" className="text-sm text-muted">
          {t('notifications:loading')}
        </p>
      )}

      {!isLoading && error !== null && (
        <p role="alert" className="text-sm text-danger">
          {t('notifications:history.failed')}
        </p>
      )}

      {!isLoading && error === null && items.length === 0 && (
        <p className="text-sm text-muted">{t('notifications:history.empty')}</p>
      )}

      {!isLoading && error === null && items.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface-raised">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 p-4">
              <CatalogNotificationBadge changeType={item.changeType} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{item.description}</p>
                <p className="mt-0.5 text-xs text-muted">{formatDateTime(item.implementedAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
