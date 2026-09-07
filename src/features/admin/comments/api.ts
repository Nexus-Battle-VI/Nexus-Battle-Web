import { httpClient } from '@/lib/http'
import type { ProductComment } from '@/features/product-reviews/api'

/**
 * Contrato real de Community para HU-41 (`CommentModerationController`).
 *
 * Todas las rutas exigen rol Moderador o Administrador (Super Administrador
 * satisface Administrador); Community responde 403 si el testimonio no
 * alcanza, aunque esta pantalla ya se oculta antes con `RequireModerator`.
 */

/**
 * Origen de un comentario en la cola (HU-41.7/HU-41.10, Management#29):
 * reporte de otro jugador, filtro automatico de contenido, o ambos. Community
 * ya calcula este arreglo -sin duplicados- en `ListModerationQueue`; Web no
 * infiere ni recalcula el origen a partir de los conteos.
 */
export type ModerationQueueEntrySource = 'USER_REPORT' | 'AUTOMATIC_FILTER'

export interface ModerationQueueEntry {
  readonly comment: ProductComment
  readonly reportCount: number
  readonly lastReportedAt: string | null
  readonly automaticFlagCount: number
  readonly lastAutomaticFlaggedAt: string | null
  readonly sources: readonly ModerationQueueEntrySource[]
}

export interface ModerationQueuePage {
  readonly items: readonly ModerationQueueEntry[]
  readonly total: number
  readonly limit: number
  readonly offset: number
}

export interface ListModerationQueueParams {
  readonly limit?: number
  readonly offset?: number
}

/** `GET /api/comments/moderation-queue`: comentarios con al menos un reporte (HU-41.1). */
export const fetchModerationQueue = (
  params: ListModerationQueueParams = {},
  signal?: AbortSignal,
): Promise<ModerationQueuePage> => {
  const query = new URLSearchParams()

  if (params.limit !== undefined) query.set('limit', String(params.limit))
  if (params.offset !== undefined) query.set('offset', String(params.offset))

  const suffix = query.toString()

  return httpClient.get<ModerationQueuePage>(
    `/comments/moderation-queue${suffix === '' ? '' : `?${suffix}`}`,
    signal,
  )
}

/**
 * Motivo de la accion (HU-41.2/41.3). Community lo exige en TODA accion, a
 * diferencia de la descripcion opcional de un reporte (HU-46).
 */
export interface ModerationActionInput {
  readonly reason: string
}

export interface EditCommentInput extends ModerationActionInput {
  readonly content: string
}

const moderate = (
  commentId: string,
  action: 'approval' | 'hiding' | 'deletion' | 'marks' | 'edits',
  body: ModerationActionInput | EditCommentInput,
): Promise<ProductComment> =>
  httpClient.post<ProductComment>(`/comments/${encodeURIComponent(commentId)}/${action}`, body)

/** `POST /api/comments/:commentId/approval`. */
export const approveComment = (
  commentId: string,
  input: ModerationActionInput,
): Promise<ProductComment> => moderate(commentId, 'approval', input)

/** `POST /api/comments/:commentId/hiding`. */
export const hideComment = (
  commentId: string,
  input: ModerationActionInput,
): Promise<ProductComment> => moderate(commentId, 'hiding', input)

/**
 * `POST /api/comments/:commentId/deletion`. Borrado FISICO por moderacion
 * (HU-41.9, Management#29): Community remueve la fila de forma permanente.
 * El contrato HTTP no cambio -sigue devolviendo el comentario con
 * `moderationStatus: 'DELETED'`-, pero una lectura posterior ya no lo
 * encuentra, y tampoco reaparece en esta cola.
 */
export const deleteCommentByModeration = (
  commentId: string,
  input: ModerationActionInput,
): Promise<ProductComment> => moderate(commentId, 'deletion', input)

/** `POST /api/comments/:commentId/marks`: marca el comentario para seguimiento. */
export const markComment = (
  commentId: string,
  input: ModerationActionInput,
): Promise<ProductComment> => moderate(commentId, 'marks', input)

/** `POST /api/comments/:commentId/edits`: edita el contenido por moderacion. */
export const editComment = (commentId: string, input: EditCommentInput): Promise<ProductComment> =>
  moderate(commentId, 'edits', input)
