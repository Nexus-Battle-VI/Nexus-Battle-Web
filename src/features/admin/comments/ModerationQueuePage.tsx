import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

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
  type ModerationQueueEntry,
  type ModerationQueueEntrySource,
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

const SOURCE_LABELS: Readonly<Record<ModerationQueueEntrySource, string>> = {
  USER_REPORT: 'Reportado por usuarios',
  AUTOMATIC_FILTER: 'Detectado automáticamente',
}

/**
 * Texto de origen de una fila (HU-41.10): reportes, detecciones automaticas
 * (HU-41.7) o ambos, con sus fechas cuando existen. Web no recalcula el
 * origen -Community ya lo entrega en `entry.sources`, sin duplicados-, solo
 * decide como redactarlo.
 */
const originSummary = (entry: ModerationQueueEntry): string => {
  const parts: string[] = []

  if (entry.reportCount > 0) {
    const noun = entry.reportCount === 1 ? 'reporte' : 'reportes'
    const suffix =
      entry.lastReportedAt !== null
        ? ` · último reporte ${formatDateTime(entry.lastReportedAt)}`
        : ''

    parts.push(`${String(entry.reportCount)} ${noun}${suffix}`)
  }

  if (entry.automaticFlagCount > 0) {
    const noun = entry.automaticFlagCount === 1 ? 'detección automática' : 'detecciones automáticas'
    const suffix =
      entry.lastAutomaticFlaggedAt !== null
        ? ` · última detección ${formatDateTime(entry.lastAutomaticFlaggedAt)}`
        : ''

    parts.push(`${String(entry.automaticFlagCount)} ${noun}${suffix}`)
  }

  return parts.join(' · ')
}

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
 * Entra en `NAVIGATION` para Moderador, Administrador y Super Administrador
 * desde HU-41.10 (Management#312); `RequireModerator` sigue siendo la puerta
 * real en la ruta -el enlace de menu es solo comodidad de descubrimiento, no
 * autorizacion-.
 *
 * LA COLA NO SE VACIA AL MODERAR. `GET /comments/moderation-queue` agrupa por
 * comentario con al menos un reporte de usuario (HU-46) o una deteccion
 * automatica del filtro de contenido (HU-41.7): un comentario ya aprobado
 * sigue apareciendo si conserva alguno de los dos (asi lo documenta Community
 * en `docs/architecture.md`). Por eso el resultado de aprobar/ocultar/editar/
 * marcar actualiza la insignia de estado EN EL SITIO, no retira la fila --
 * retirarla mostraria un estado que no corresponde al contrato real del
 * servicio.
 *
 * ELIMINAR ES LA EXCEPCION (HU-41.9/HU-41.10, Management#29): Community borra
 * la fila FISICAMENTE, asi que ya no puede reaparecer en una lectura
 * posterior de la cola. Por eso, y solo para esta accion, la fila SI se
 * retira de la vista y se invalida la consulta para reflejar el contrato
 * real -- ninguna otra accion hace esto.
 */
export const ModerationQueuePage = ({
  listQueue = fetchModerationQueue,
}: ModerationQueuePageProps = {}): React.JSX.Element => {
  const queryClient = useQueryClient()
  const [offset, setOffset] = useState(0)
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null)
  const [overrides, setOverrides] = useState<Readonly<Record<string, ProductComment>>>({})
  const [deletedIds, setDeletedIds] = useState<ReadonlySet<string>>(new Set())
  const [banner, setBanner] = useState<{
    readonly kind: 'success' | 'error'
    readonly message: string
  } | null>(null)

  const params = { limit: PAGE_SIZE, offset }

  const query = useQuery({
    queryKey: queryKeys.community.moderationQueue(params),
    queryFn: ({ signal }): Promise<ModerationQueuePageDto> => listQueue(params, signal),
  })

  const items = (query.data?.items ?? []).filter((entry) => !deletedIds.has(entry.comment.id))
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

  /**
   * Eliminar borra la fila FISICAMENTE en Community (HU-41.9): a diferencia
   * de `handleSuccess`, aqui se retira la fila de la vista -no se deja una
   * insignia "Eliminado" que ya no corresponde a nada- y se invalida la
   * consulta para que una nueva pagina o un refresco reflejen el total real.
   */
  const handleDeleteSuccess = (commentId: string): void => {
    setDeletedIds((current) => new Set(current).add(commentId))
    setOverrides((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => id !== commentId)),
    )
    setBanner({ kind: 'success', message: 'Eliminar: comentario eliminado permanentemente.' })
    closeAction()
    void queryClient.invalidateQueries({ queryKey: ['community', 'moderation-queue'] })
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
          Comentarios reportados por otros jugadores (HU-46), detectados automáticamente por el
          filtro de contenido (HU-41.7), o ambos. Aprobar, ocultar, editar o marcar no retira la
          fila; eliminar sí, porque borra el comentario de forma permanente.
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
        emptyMessage="No hay comentarios reportados ni detectados pendientes de revisión."
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
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={comment.moderationStatus} />
                      <div className="flex flex-wrap justify-end gap-1">
                        {entry.sources.map((source) => (
                          <span
                            key={source}
                            className="inline-flex rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
                          >
                            {SOURCE_LABELS[source]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted">{originSummary(entry)}</p>

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
                          onSuccess={
                            activeAction.action === 'delete'
                              ? () => {
                                  handleDeleteSuccess(comment.id)
                                }
                              : handleSuccess(actionLabel)
                          }
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
