import { useEffect } from 'react'

import { ModerationQueuePage } from '../ModerationQueuePage'

/**
 * Vista previa de desarrollo de la cola de moderación (HU-41.4).
 *
 * Existe por la misma razón que `CreateProductDevPreview`: la pantalla real
 * vive tras `RequireModerator` y necesita Community respondiendo de verdad, y
 * el entorno local no levanta ese servicio. Sin esto, revisar el diseño
 * obligaría a desplegar el stack completo.
 *
 * NO ES UNA PUERTA TRASERA. Solo existe con `import.meta.env.DEV` -- Vite
 * elimina la rama entera en producción -- y NO monta la ruta productiva.
 * A diferencia de `CreateProductDevPreview` (que resuelve el envío sin tocar
 * la red), aquí se intercepta `fetch` para las rutas de `/api/comments/*`
 * mientras el preview está montado: es la forma de ver el flujo REAL
 * -incluida la actualización de la insignia tras una acción- sin depender de
 * `ModerationQueuePage` aceptando transportes inyectables que la pantalla
 * productiva no necesita.
 */
interface StubComment {
  id: string
  productId: string
  authorId: string
  content: string
  images: readonly string[]
  createdAt: string
  moderationStatus: string
}

const now = new Date().toISOString()

const comments: Record<string, StubComment> = {
  'comment-1': {
    id: 'comment-1',
    productId: '3f2a1e4c-6b7d-4a8e-9c1f-2d3e4f5a6b7c',
    authorId: 'acc-0b1d5b0e',
    content: 'Compra en este otro sitio, es más barato: enlace-sospechoso.example',
    images: [],
    createdAt: now,
    moderationStatus: 'PENDING',
  },
  'comment-2': {
    id: 'comment-2',
    productId: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
    authorId: 'acc-2f3e4d5c',
    content: 'Este producto es una estafa, no funciona como dicen.',
    images: [],
    createdAt: now,
    moderationStatus: 'MARKED',
  },
}

const reports: Record<string, { reportCount: number; lastReportedAt: string }> = {
  'comment-1': { reportCount: 4, lastReportedAt: now },
  'comment-2': { reportCount: 1, lastReportedAt: now },
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const ACTION_TO_STATUS: Readonly<Record<string, string>> = {
  approval: 'APPROVED',
  hiding: 'HIDDEN',
  deletion: 'DELETED',
  marks: 'MARKED',
  edits: 'EDITED',
}

const handleModerationRequest = (input: string, init?: RequestInit): Response => {
  const url = new URL(input, globalThis.location.origin)

  if (url.pathname === '/api/comments/moderation-queue') {
    const items = Object.keys(comments).map((commentId) => ({
      comment: comments[commentId],
      ...reports[commentId],
    }))

    return jsonResponse({ items, total: items.length, limit: 20, offset: 0 })
  }

  const match = /^\/api\/comments\/([^/]+)\/(approval|hiding|deletion|marks|edits)$/u.exec(
    url.pathname,
  )

  if (match) {
    const commentId = match[1] ?? ''
    const action = match[2] ?? ''
    const existing = comments[commentId]

    if (existing === undefined) {
      return jsonResponse({ message: 'No existe un comentario con ese identificador.' }, 404)
    }

    const body = JSON.parse((init?.body as string | undefined) ?? '{}') as {
      reason?: string
      content?: string
    }

    if (body.reason === undefined || body.reason.trim() === '') {
      return jsonResponse({ message: 'El motivo de la accion de moderacion es obligatorio.' }, 400)
    }

    const nextStatus = ACTION_TO_STATUS[action] ?? existing.moderationStatus

    const updated: StubComment = {
      ...existing,
      content: action === 'edits' ? (body.content ?? existing.content) : existing.content,
      moderationStatus: nextStatus,
    }

    comments[commentId] = updated

    return jsonResponse(updated)
  }

  return jsonResponse({ message: 'Ruta no simulada en este preview.' }, 404)
}

export const ModerationQueueDevPreview = (): React.JSX.Element => {
  useEffect(() => {
    const original = globalThis.fetch

    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (url.includes('/api/comments/')) {
        return Promise.resolve(handleModerationRequest(url, init))
      }

      return original(input, init)
    }

    return () => {
      globalThis.fetch = original
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl p-6">
      <p className="mb-4 rounded-md border border-border bg-surface/40 px-4 py-2 text-xs text-muted">
        Vista previa de desarrollo. La cola y las acciones de moderación están simuladas: no llegan
        a Community.
      </p>
      <ModerationQueuePage />
    </div>
  )
}
