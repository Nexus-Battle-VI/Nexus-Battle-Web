import { httpClient } from '@/lib/http'

/**
 * Contrato real de Community para HU-40 (`ProductCommentsController`).
 *
 * Comentar y calificar son operaciones INDEPENDIENTES, aunque compartan
 * `productId`: un jugador puede publicar varios comentarios sobre el mismo
 * producto, y calificarlo no impide seguir comentando. `authorId` nunca viaja
 * en el cuerpo: Community lo resuelve del testimonio, igual que aquí
 * `httpClient` lo adjunta solo.
 */

export interface ProductComment {
  readonly id: string
  readonly productId: string
  readonly authorId: string
  readonly content: string
  readonly images: readonly string[]
  readonly createdAt: string
}

export interface ProductCommentPage {
  readonly items: readonly ProductComment[]
  readonly total: number
  readonly limit: number
  readonly offset: number
}

export interface PublishProductCommentInput {
  readonly content: string
  readonly images?: readonly string[]
}

/** `POST /api/products/:productId/comments`. */
export const publishProductComment = (
  productId: string,
  input: PublishProductCommentInput,
): Promise<ProductComment> =>
  httpClient.post<ProductComment>(`/products/${encodeURIComponent(productId)}/comments`, input)

/** `GET /api/products/:productId/comments`, público. */
export const fetchProductComments = (
  productId: string,
  signal?: AbortSignal,
): Promise<ProductCommentPage> =>
  httpClient.get<ProductCommentPage>(`/products/${encodeURIComponent(productId)}/comments`, signal)

export interface ProductReview {
  readonly id: string
  readonly productId: string
  readonly authorId: string
  readonly rating: number
  readonly createdAt: string
}

/** `POST /api/products/:productId/reviews`. 409 si el jugador ya calificó este producto. */
export const submitProductRating = (productId: string, rating: number): Promise<ProductReview> =>
  httpClient.post<ProductReview>(`/products/${encodeURIComponent(productId)}/reviews`, { rating })

export interface ProductReviewSummary {
  readonly productId: string
  readonly average: number | null
  readonly count: number
}

/** `GET /api/products/:productId/reviews/summary`, público. Calculado por Community, nunca aquí. */
export const fetchProductReviewSummary = (
  productId: string,
  signal?: AbortSignal,
): Promise<ProductReviewSummary> =>
  httpClient.get<ProductReviewSummary>(
    `/products/${encodeURIComponent(productId)}/reviews/summary`,
    signal,
  )
