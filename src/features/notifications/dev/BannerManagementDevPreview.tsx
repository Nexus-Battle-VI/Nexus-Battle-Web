import { useEffect } from 'react'

import { BannerManagementPage } from '@/features/notifications/admin/BannerManagementPage'

/**
 * Vista previa de desarrollo de la gestion del banner informativo (HU-38,
 * Task #181).
 *
 * Misma razon que `CreateProductDevPreview`: la pantalla real vive tras
 * `RequireAdministrator`, y el entorno local no puede establecer una sesion
 * de verdad. Se intercepta `fetch` para `/api/v1/admin/banners` mientras el
 * preview esta montado -incluido el POST de creacion, para ver el listado
 * actualizarse tras publicar-.
 *
 * NO ES UNA PUERTA TRASERA. Solo existe con `import.meta.env.DEV` y NO monta
 * la ruta productiva.
 */
interface StubBanner {
  readonly id: string
  readonly title: string
  readonly content: string
  readonly publishAt: string
  readonly expiresAt: string
  readonly status: string
  readonly isActive: boolean
  readonly createdBy: string
  readonly createdAt: string
}

const banners: StubBanner[] = [
  {
    id: 'preview-b1',
    title: 'Mantenimiento programado',
    content: 'El catálogo estará en mantenimiento el sábado de 2am a 4am.',
    publishAt: new Date(Date.now() - 86_400_000).toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    status: 'ACTIVE',
    isActive: true,
    createdBy: 'admin-preview',
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: 'preview-b2',
    title: 'Aviso ya expirado',
    content: 'Este aviso ya no está vigente, solo aparece en el listado administrativo.',
    publishAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    expiresAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
    status: 'EXPIRED',
    isActive: false,
    createdBy: 'admin-preview',
    createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  },
]

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const handlePreviewRequest = (url: string, init?: RequestInit): Response | null => {
  if (!url.includes('/v1/admin/banners')) return null

  if (init?.method === 'POST') {
    const body = JSON.parse((init.body as string | undefined) ?? '{}') as {
      title: string
      content: string
      publishAt: string
      expiresAt: string
    }
    const id = `preview-b${String(banners.length + 1)}`

    banners.unshift({
      id,
      ...body,
      status: 'ACTIVE',
      isActive: true,
      createdBy: 'admin-preview',
      createdAt: new Date().toISOString(),
    })

    return jsonResponse({ id }, 201)
  }

  return jsonResponse({ items: banners })
}

export const BannerManagementDevPreview = (): React.JSX.Element => {
  useEffect(() => {
    const original = globalThis.fetch

    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const simulated = handlePreviewRequest(url, init)

      return simulated !== null ? Promise.resolve(simulated) : original(input, init)
    }

    return () => {
      globalThis.fetch = original
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl p-6">
      <p className="mb-4 rounded-md border border-border bg-surface/40 px-4 py-2 text-xs text-muted">
        Vista previa de desarrollo. El banner está simulado: no llega a Notifications.
      </p>
      <BannerManagementPage />
    </div>
  )
}
