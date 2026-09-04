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

/**
 * Estado de moderacion de un comentario (HU-41). `PENDING` para todo
 * comentario recien publicado; los otros cinco son el resultado de la accion
 * de moderacion correspondiente.
 */
export const ModerationStatus = {
  Pending: 'PENDING',
  Approved: 'APPROVED',
  Deleted: 'DELETED',
  Hidden: 'HIDDEN',
  Edited: 'EDITED',
  Marked: 'MARKED',
} as const

export type ModerationStatus = (typeof ModerationStatus)[keyof typeof ModerationStatus]

export interface ProductComment {
  readonly id: string
  readonly productId: string
  readonly authorId: string
  readonly content: string
  readonly images: readonly string[]
  readonly createdAt: string
  readonly moderationStatus: ModerationStatus
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

/**
 * Categorías de violación de HU-46. Vocabulario cerrado: son exactamente las
 * seis que declara `ReportCategory` en Community
 * (`comment-report-values.ts`), ni una más.
 */
export const ReportCategory = {
  Spam: 'SPAM',
  OffensiveContent: 'OFFENSIVE_CONTENT',
  Harassment: 'HARASSMENT',
  FalseInformation: 'FALSE_INFORMATION',
  InappropriateContent: 'INAPPROPRIATE_CONTENT',
  CopyrightViolation: 'COPYRIGHT_VIOLATION',
} as const

export type ReportCategory = (typeof ReportCategory)[keyof typeof ReportCategory]

export interface ReportCommentInput {
  readonly category: ReportCategory
  readonly description?: string
}

export interface CommentReport {
  readonly id: string
  readonly commentId: string
  readonly authorId: string
  readonly category: string
  readonly description: string | null
  readonly createdAt: string
}

/**
 * `POST /api/comments/:commentId/reports`.
 *
 * `authorId` NUNCA viaja en el cuerpo: Community lo resuelve del testimonio,
 * igual que en `publishProductComment`. 429 si el jugador excedió el límite
 * de reportes -- HU-46 no fija ese número, así que esta capa tampoco lo
 * conoce ni lo muestra.
 */
export const reportComment = (
  commentId: string,
  input: ReportCommentInput,
): Promise<CommentReport> =>
  httpClient.post<CommentReport>(`/comments/${encodeURIComponent(commentId)}/reports`, input)
