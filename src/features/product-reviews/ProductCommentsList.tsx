import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { formatDateTime } from '@/lib/format'
import { queryKeys } from '@/shared/query-keys'
import { CommentReportForm } from './CommentReportForm'
import { fetchProductComments, type ProductCommentPage } from './api'

export type ListCommentsTransport = (
  productId: string,
  signal?: AbortSignal,
) => Promise<ProductCommentPage>

export interface ProductCommentsListProps {
  readonly productId: string
  /** Transporte inyectable, mismo patron que `ProductCommentsAndRating`. */
  readonly listComments?: ListCommentsTransport
}

/**
 * Lista de comentarios ya publicados de un producto (HU-40), con la accion
 * "Reportar" de HU-46 (Task #183) sobre cada uno.
 *
 * ES LA REPRESENTACION MINIMA NECESARIA para que exista un comentario real,
 * identificado por `comment.id`, desde el cual reportar: no agrega
 * ordenamiento, "me gusta" ni ninguna funcion social que HU-40 no pidiera.
 * `GET /products/:productId/comments` ya es publico y paginado por
 * Community; esta lista pide solo la primera pagina, que es lo unico que
 * HU-46 necesita para tener comentarios que reportar.
 */
export const ProductCommentsList = ({
  productId,
  listComments = fetchProductComments,
}: ProductCommentsListProps): React.JSX.Element => {
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: queryKeys.community.productComments(productId),
    queryFn: ({ signal }) => listComments(productId, signal),
    enabled: productId !== '',
  })

  const comments = query.data?.items ?? []

  return (
    <QueryState
      isLoading={query.isPending}
      error={query.error}
      isEmpty={comments.length === 0}
      emptyMessage="Todavía no hay comentarios sobre este producto."
    >
      <ul className="space-y-3">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-lg border border-border bg-surface-raised p-3">
            <p className="text-sm text-ink">{comment.content}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">{formatDateTime(comment.createdAt)}</span>
              <Button
                type="button"
                variant="secondary"
                aria-expanded={reportingCommentId === comment.id}
                onClick={() => {
                  setReportingCommentId((current) => (current === comment.id ? null : comment.id))
                }}
              >
                Reportar
              </Button>
            </div>

            {reportingCommentId === comment.id && (
              <CommentReportForm
                commentId={comment.id}
                onCancel={() => {
                  setReportingCommentId(null)
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </QueryState>
  )
}
