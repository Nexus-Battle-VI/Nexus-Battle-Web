import { useEffect } from 'react'

import { CatalogBanner } from '../CatalogBanner'
import { CatalogNotificationsSummary } from '../CatalogNotificationsSummary'

/**
 * Vista previa de desarrollo del resumen de novedades + banner (HU-38, Task
 * #185), tal como aparecerian montados en `CommercePage`.
 *
 * Misma razon que el resto de este directorio (`ModerationQueueDevPreview`,
 * `CreateProductDevPreview`): las novedades y el banner dependen de
 * Notifications respondiendo de verdad, que el entorno local no levanta. Se
 * intercepta `fetch` para `/api/v1/notifications/*` y `/api/v1/banners`
 * mientras el preview esta montado -incluido el POST de lectura, para ver el
 * flujo real "se presenta, luego se marca como leido"-.
 *
 * NO ES UNA PUERTA TRASERA. Solo existe con `import.meta.env.DEV` -Vite
 * elimina la rama entera en produccion- y NO monta la ruta productiva.
 */
const PENDING = [
  {
    id: 'preview-n1',
    notificationIds: ['preview-n1'],
    changeType: 'PRODUCT_CREATED',
    description: 'Se agregó "Piedra de afilar" al catálogo.',
    productId: '00000000-0000-4000-8000-000000000001',
    implementedAt: new Date().toISOString(),
    consolidatedCount: 1,
  },
  {
    id: 'preview-n2',
    notificationIds: ['preview-n2', 'preview-n3', 'preview-n4', 'preview-n5'],
    changeType: 'PRODUCT_SUSPENDED',
    description: '"Machete Óxidado" (que posees) fue suspendido temporalmente.',
    productId: '00000000-0000-4000-8000-000000000002',
    implementedAt: new Date(Date.now() - 3_600_000).toISOString(),
    consolidatedCount: 4,
  },
]

const BANNERS = [
  {
    id: 'preview-b1',
    title: 'Mantenimiento programado',
    content: 'El catálogo estará en mantenimiento el sábado de 2am a 4am.',
    publishAt: new Date(Date.now() - 86_400_000).toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  },
  {
    id: 'preview-b2',
    title: 'Nuevo evento de temporada',
    content: 'Prepárate para el evento de temporada que comienza el próximo lunes.',
    publishAt: new Date(Date.now() - 86_400_000).toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  },
]

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const handlePreviewRequest = (url: string): Response | null => {
  if (url.includes('/v1/notifications/me/pending')) return jsonResponse({ items: PENDING })
  if (url.includes('/v1/notifications/me/read')) return jsonResponse({ status: 'ok' })
  if (url.includes('/v1/banners')) return jsonResponse({ items: BANNERS })

  return null
}

export const CatalogNotificationsDevPreview = (): React.JSX.Element => {
  useEffect(() => {
    const original = globalThis.fetch

    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const simulated = handlePreviewRequest(url)

      return simulated !== null ? Promise.resolve(simulated) : original(input, init)
    }

    return () => {
      globalThis.fetch = original
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <p className="rounded-md border border-border bg-surface/40 px-4 py-2 text-xs text-muted">
        Vista previa de desarrollo. Las novedades y el banner están simulados: no llegan a
        Notifications.
      </p>
      <CatalogBanner />
      <CatalogNotificationsSummary />
    </div>
  )
}
