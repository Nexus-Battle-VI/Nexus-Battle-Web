import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDateTime } from '@/lib/format'
import { queryKeys } from '@/shared/query-keys'
import type { ProductComment } from '@/features/product-reviews/api'
import {
  approveComment,
  deleteCommentByModeration,
  editComment,
  fetchModerationQueue,
  hideComment,
  markComment,
  type ModerationQueuePage as ModerationQueuePageDto,
} from './api'
import { ModerationActionForm, type ModerationActionKind } from './ModerationActionForm'

const PAGE_SIZE = 20

export type FetchModerationQueueTransport = typeof fetchModerationQueue

export interface ModerationQueuePageProps {
  /** Transporte inyectable, mismo patron que `ProductCommentsAndRating`. */
  readonly listQueue?: FetchModerationQueueTransport
}

interface ActiveAction {
  readonly commentId: string
  readonly action: ModerationActionKind
}

const ACTIONS: readonly {
  readonly kind: ModerationActionKind
  readonly label: string
  readonly variant: 'primary' | 'secondary' | 'danger'
}[] = [
  { kind: 'approve', label: 'Aprobar', variant: 'primary' },
  { kind: 'hide', label: 'Ocultar', variant: 'secondary' },
  { kind: 'delete', label: 'Eliminar', variant: 'danger' },
  { kind: 'mark', label: 'Marcar', variant: 'secondary' },
  { kind: 'edit', label: 'Editar', variant: 'secondary' },
]

const submitFor = (
  action: ModerationActionKind,
): ((
  commentId: string,
  input: { reason: string; content?: string },
) => Promise<ProductComment>) => {
  switch (action) {
    case 'approve':
      return approveComment
    case 'hide':
      return hideComment
    case 'delete':
      return deleteCommentByModeration
    case 'mark':
      return markComment
    case 'edit':
      return (commentId, input) =>
        editComment(commentId, { reason: input.reason, content: input.content ?? '' })
  }
}

/**
 * Cola de moderacion de comentarios (HU-41.4, Task #126).
 *
 * NO ENTRA EN `NAVIGATION`: es una superficie de Moderador/Administrador sin
 * un producto concreto en la mano, mismo criterio de alcance que
 * `admin/products/:productId/inventory` (HU-34) -- se reserva a
 * `RequireModerator` en la ruta, no a un enlace del menu principal, hasta que
 * el equipo decida donde vive el acceso.
 *
 * LA COLA NO SE VACIA AL MODERAR. `GET /comments/moderation-queue` agrupa por
 * comentario REPORTADO, no por comentario pendiente: un comentario ya
 * aprobado sigue apareciendo si conserva sus reportes (asi lo documenta
 * Community en `docs/architecture.md`). Por eso el resultado de una accion
 * actualiza la insignia de estado EN EL SITIO, no retira la fila -- retirarla
 * mostraria un estado que no corresponde al contrato real del servicio.
 */
export const ModerationQueuePage = ({
  listQueue = fetchModerationQueue,
}: ModerationQueuePageProps = {}): React.JSX.Element => {
  const [offset, setOffset] = useState(0)
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null)
  const [overrides, setOverrides] = useState<Readonly<Record<string, ProductComment>>>({})
  const [banner, setBanner] = useState<{
    readonly kind: 'success' | 'error'
    readonly message: string
  } | null>(null)

  const params = { limit: PAGE_SIZE, offset }

  const query = useQuery({
    queryKey: queryKeys.community.moderationQueue(params),
    queryFn: ({ signal }): Promise<ModerationQueuePageDto> => listQueue(params, signal),
  })

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  const commentFor = (comment: ProductComment): ProductComment => overrides[comment.id] ?? comment

  const closeAction = (): void => {
    setActiveAction(null)
  }

  const handleSuccess =
    (actionLabel: string) =>
    (updated: ProductComment): void => {
      setOverrides((current) => ({ ...current, [updated.id]: updated }))
      setBanner({ kind: 'success', message: `${actionLabel}: comentario actualizado.` })
      closeAction()
    }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Breadcrumb
        items={[{ label: 'Inicio', to: '/ecommerce' }, { label: 'Moderación de comentarios' }]}
      />

      <header className="mt-6 mb-8">
        <p className="text-xs uppercase tracking-widest text-muted">Moderación</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Cola de moderación</h1>
        <p className="mt-1 text-sm text-muted">
          Comentarios con al menos un reporte de un jugador (HU-46). Aprobar, ocultar, eliminar,
          editar o marcar no borra el reporte que los trajo aquí.
        </p>
      </header>

      {banner !== null && (
        <p
          role={banner.kind === 'success' ? 'status' : 'alert'}
          className={
            banner.kind === 'success'
              ? 'mb-4 rounded-lg border border-brand bg-brand/10 p-3 text-sm text-ink'
              : 'mb-4 rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger'
          }
        >
          {banner.message}
        </p>
      )}

      <QueryState
        isLoading={query.isPending}
        error={query.error}
        isEmpty={total === 0}
        emptyMessage="No hay comentarios reportados pendientes de revisión."
      >
        <ul className="space-y-4">
          {items.map((entry) => {
            const comment = commentFor(entry.comment)

            return (
              <li key={comment.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-ink">{comment.content}</p>
                      <p className="mt-1 text-xs text-muted">
                        Autor {comment.authorId} · Producto {comment.productId} ·{' '}
                        {formatDateTime(comment.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={comment.moderationStatus} />
                  </div>

                  <p className="mt-3 text-xs text-muted">
                    {entry.reportCount} {entry.reportCount === 1 ? 'reporte' : 'reportes'} · último
                    reporte {formatDateTime(entry.lastReportedAt)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {ACTIONS.map(({ kind, label, variant }) => (
                      <Button
                        key={kind}
                        type="button"
                        variant={variant}
                        aria-expanded={
                          activeAction?.commentId === comment.id && activeAction.action === kind
                        }
                        onClick={() => {
                          setBanner(null)
                          setActiveAction((current) =>
                            current?.commentId === comment.id && current.action === kind
                              ? null
                              : { commentId: comment.id, action: kind },
                          )
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>

                  {activeAction?.commentId === comment.id &&
                    (() => {
                      const meta = ACTIONS.find(
                        (entryAction) => entryAction.kind === activeAction.action,
                      )
                      const actionLabel = meta?.label ?? 'Acción'

                      return (
                        <ModerationActionForm
                          commentId={comment.id}
                          action={activeAction.action}
                          actionLabel={actionLabel}
                          variant={meta?.variant ?? 'primary'}
                          initialContent={activeAction.action === 'edit' ? comment.content : ''}
                          onSubmit={submitFor(activeAction.action)}
                          onSuccess={handleSuccess(actionLabel)}
                          onCancel={closeAction}
                        />
                      )
                    })()}
                </Card>
              </li>
            )
          })}
        </ul>

        {pageCount > 1 && (
          <nav aria-label="Paginación" className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              disabled={currentPage === 1}
              onClick={() => {
                setOffset(Math.max(0, offset - PAGE_SIZE))
              }}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted">
              página {currentPage} de {pageCount}
            </span>
            <Button
              variant="secondary"
              disabled={currentPage >= pageCount}
              onClick={() => {
                setOffset(offset + PAGE_SIZE)
              }}
            >
              Siguiente
            </Button>
          </nav>
        )}
      </QueryState>
    </div>
  )
}
