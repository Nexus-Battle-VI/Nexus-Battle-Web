import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  approveComment,
  deleteCommentByModeration,
  editComment,
  fetchModerationQueue,
  hideComment,
  markComment,
} from './api'

const PRODUCT_ID = '3f2a1e4c-6b7d-4a8e-9c1f-2d3e4f5a6b7c'
const COMMENT_ID = 'comment-1'

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const COMMENT_BODY = {
  id: COMMENT_ID,
  productId: PRODUCT_ID,
  authorId: 'acc-1',
  content: 'Contenido publicitario repetido.',
  images: [],
  createdAt: '2026-09-03T10:00:00.000Z',
  moderationStatus: 'APPROVED',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchModerationQueue', () => {
  it('llama a GET /comments/moderation-queue sin parametros por defecto', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { items: [], total: 0, limit: 20, offset: 0 }))
    vi.stubGlobal('fetch', fetchImpl)

    await fetchModerationQueue()

    const [url] = fetchImpl.mock.calls[0] as [string]
    expect(url).toBe('/api/comments/moderation-queue')
  })

  it('incluye limit y offset cuando se proporcionan', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { items: [], total: 0, limit: 5, offset: 10 }))
    vi.stubGlobal('fetch', fetchImpl)

    await fetchModerationQueue({ limit: 5, offset: 10 })

    const [url] = fetchImpl.mock.calls[0] as [string]
    expect(url).toBe('/api/comments/moderation-queue?limit=5&offset=10')
  })

  it('devuelve cada entrada con su comentario, conteo de reportes y ultimo reporte', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        items: [
          { comment: COMMENT_BODY, reportCount: 3, lastReportedAt: '2026-09-03T11:00:00.000Z' },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    )
    vi.stubGlobal('fetch', fetchImpl)

    const page = await fetchModerationQueue()

    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toEqual({
      comment: COMMENT_BODY,
      reportCount: 3,
      lastReportedAt: '2026-09-03T11:00:00.000Z',
    })
  })
})

describe.each([
  ['approveComment', approveComment, 'approval'],
  ['hideComment', hideComment, 'hiding'],
  ['deleteCommentByModeration', deleteCommentByModeration, 'deletion'],
  ['markComment', markComment, 'marks'],
] as const)('%s', (_name, action, segment) => {
  it(`llama a POST /comments/:commentId/${segment} con el motivo`, async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, COMMENT_BODY))
    vi.stubGlobal('fetch', fetchImpl)

    const result = await action(COMMENT_ID, { reason: 'Motivo de prueba.' })

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`/api/comments/${COMMENT_ID}/${segment}`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Motivo de prueba.' })
    expect(result).toEqual(COMMENT_BODY)
  })
})

describe('editComment', () => {
  it('llama a POST /comments/:commentId/edits con el motivo y el contenido nuevo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, COMMENT_BODY))
    vi.stubGlobal('fetch', fetchImpl)

    await editComment(COMMENT_ID, {
      reason: 'Enlace externo retirado.',
      content: 'Contenido editado.',
    })

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`/api/comments/${COMMENT_ID}/edits`)
    expect(JSON.parse(init.body as string)).toEqual({
      reason: 'Enlace externo retirado.',
      content: 'Contenido editado.',
    })
  })
})
