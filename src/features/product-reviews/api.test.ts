import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchProductComments,
  fetchProductReviewSummary,
  publishProductComment,
  reportComment,
  ReportCategory,
  submitProductRating,
} from './api'

const PRODUCT_ID = '3f2a1e4c-6b7d-4a8e-9c1f-2d3e4f5a6b7c'

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('publishProductComment', () => {
  it('llama a POST /products/:productId/comments con el cuerpo real', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        id: 'comment-1',
        productId: PRODUCT_ID,
        authorId: 'acc-1',
        content: 'Hola',
        images: [],
        createdAt: '2026-09-03T10:00:00.000Z',
      }),
    )
    vi.stubGlobal('fetch', fetchImpl)

    const result = await publishProductComment(PRODUCT_ID, { content: 'Hola' })

    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/products/${PRODUCT_ID}/comments`,
      expect.objectContaining({ method: 'POST' }),
    )
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBe(JSON.stringify({ content: 'Hola' }))
    expect(result.id).toBe('comment-1')
  })
})

describe('fetchProductComments', () => {
  it('llama a GET /products/:productId/comments', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { items: [], total: 0, limit: 20, offset: 0 }))
    vi.stubGlobal('fetch', fetchImpl)

    const result = await fetchProductComments(PRODUCT_ID)

    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/products/${PRODUCT_ID}/comments`,
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual({ items: [], total: 0, limit: 20, offset: 0 })
  })
})

describe('submitProductRating', () => {
  it('llama a POST /products/:productId/reviews con la calificacion', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        id: 'review-1',
        productId: PRODUCT_ID,
        authorId: 'acc-1',
        rating: 4,
        createdAt: '2026-09-03T10:00:00.000Z',
      }),
    )
    vi.stubGlobal('fetch', fetchImpl)

    await submitProductRating(PRODUCT_ID, 4)

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBe(JSON.stringify({ rating: 4 }))
  })
})

describe('reportComment', () => {
  it('llama a POST /comments/:commentId/reports con la categoria y sin descripcion', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        id: 'report-1',
        commentId: 'comment-1',
        authorId: 'acc-1',
        category: ReportCategory.Spam,
        description: null,
        createdAt: '2026-09-03T10:00:00.000Z',
      }),
    )
    vi.stubGlobal('fetch', fetchImpl)

    const result = await reportComment('comment-1', { category: ReportCategory.Spam })

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/comments/comment-1/reports',
      expect.objectContaining({ method: 'POST' }),
    )
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBe(JSON.stringify({ category: 'SPAM' }))
    expect(result.id).toBe('report-1')
  })

  it('incluye la descripcion opcional cuando se proporciona', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        id: 'report-2',
        commentId: 'comment-1',
        authorId: 'acc-1',
        category: ReportCategory.Harassment,
        description: 'Insulta a otro jugador.',
        createdAt: '2026-09-03T10:00:00.000Z',
      }),
    )
    vi.stubGlobal('fetch', fetchImpl)

    await reportComment('comment-1', {
      category: ReportCategory.Harassment,
      description: 'Insulta a otro jugador.',
    })

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBe(
      JSON.stringify({ category: 'HARASSMENT', description: 'Insulta a otro jugador.' }),
    )
  })

  it('el identificador del comentario reportado se codifica en la ruta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        id: 'report-3',
        commentId: 'comentario con espacio',
        authorId: 'acc-1',
        category: ReportCategory.Spam,
        description: null,
        createdAt: '2026-09-03T10:00:00.000Z',
      }),
    )
    vi.stubGlobal('fetch', fetchImpl)

    await reportComment('comentario con espacio', { category: ReportCategory.Spam })

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/comments/comentario%20con%20espacio/reports',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('fetchProductReviewSummary', () => {
  it('llama a GET /products/:productId/reviews/summary y devuelve el promedio calculado por Community', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { productId: PRODUCT_ID, average: 4.5, count: 2 }))
    vi.stubGlobal('fetch', fetchImpl)

    const result = await fetchProductReviewSummary(PRODUCT_ID)

    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/products/${PRODUCT_ID}/reviews/summary`,
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual({ productId: PRODUCT_ID, average: 4.5, count: 2 })
  })
})
