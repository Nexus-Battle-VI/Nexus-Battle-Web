import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Button, type ButtonVariant } from '@/components/ui/Button'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { HttpError } from '@/lib/http'
import type { ProductComment } from '@/features/product-reviews/api'
import type { EditCommentInput, ModerationActionInput } from './api'

const GENERIC_ERROR = 'No se pudo completar la operación. Inténtalo nuevamente más tarde.'
const REASON_MAX_LENGTH = 500

export type ModerationActionKind = 'approve' | 'hide' | 'delete' | 'mark' | 'edit'

export interface ModerationActionFormProps {
  readonly commentId: string
  readonly action: ModerationActionKind
  readonly actionLabel: string
  readonly variant?: ButtonVariant
  /** Solo se usa cuando `action === 'edit'`, para prellenar el contenido vigente. */
  readonly initialContent?: string
  readonly onSubmit: (
    commentId: string,
    input: ModerationActionInput | EditCommentInput,
  ) => Promise<ProductComment>
  readonly onSuccess: (updated: ProductComment) => void
  readonly onCancel: () => void
}

type Outcome =
  | { readonly kind: 'validation-error'; readonly message: string }
  | { readonly kind: 'auth-error' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'error' }

/**
 * Formulario de UNA accion de moderacion (HU-41.2/41.3, Task #126).
 *
 * Reutilizable para las cinco acciones: solo cambia el verbo, el endpoint
 * (via `onSubmit`, inyectado por la pantalla) y si pide contenido nuevo
 * (`edit`). El motivo es SIEMPRE obligatorio -- a diferencia del reporte
 * (HU-46), Community lo exige en toda accion de moderacion.
 *
 * NO DUPLICA REGLAS DE NEGOCIO: la validacion de longitud del motivo es de
 * FORMA (evita un viaje de red vacio), no una regla que esta pantalla decida.
 * El resultado real -- exito o rechazo -- lo dice siempre la respuesta del
 * servicio.
 */
export const ModerationActionForm = ({
  commentId,
  action,
  actionLabel,
  variant = 'primary',
  initialContent = '',
  onSubmit,
  onSuccess,
  onCancel,
}: ModerationActionFormProps): React.JSX.Element => {
  const [reason, setReason] = useState('')
  const [content, setContent] = useState(initialContent)
  const [reasonError, setReasonError] = useState<string | undefined>(undefined)

  const mutation = useMutation({
    mutationFn: async (): Promise<Outcome | null> => {
      try {
        const input =
          action === 'edit'
            ? { reason: reason.trim(), content: content.trim() }
            : { reason: reason.trim() }
        const updated = await onSubmit(commentId, input)

        onSuccess(updated)

        return null
      } catch (error: unknown) {
        if (error instanceof HttpError && error.isUnauthorized) return { kind: 'auth-error' }
        if (error instanceof HttpError && error.isNotFound) return { kind: 'not-found' }
        if (error instanceof HttpError && error.isClientError) {
          return { kind: 'validation-error', message: error.message }
        }
        // Un fallo que no es 401/404/4xx es indisponibilidad del servicio, no
        // un dato rechazado: nunca `error.message` aqui, mismo criterio que
        // `CommentReportForm`.
        return { kind: 'error' }
      }
    },
  })

  const handleSubmit = (event: React.SyntheticEvent): void => {
    event.preventDefault()

    if (reason.trim() === '') {
      setReasonError('El motivo es obligatorio.')
      return
    }

    if (action === 'edit' && content.trim() === '') {
      setReasonError(undefined)
      return
    }

    setReasonError(undefined)
    mutation.mutate()
  }

  const outcome = mutation.data ?? undefined

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={`${actionLabel} comentario ${commentId}`}
      className="mt-2 space-y-3 rounded-lg border border-border bg-surface p-3"
    >
      {mutation.isPending && (
        <p role="status" className="text-sm text-muted">
          Enviando…
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'auth-error' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-2 text-sm text-danger"
        >
          Tu sesión ha caducado. Vuelve a iniciar sesión para moderar este comentario.
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'not-found' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-2 text-sm text-danger"
        >
          Este comentario ya no está disponible.
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'validation-error' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-2 text-sm text-danger"
        >
          {outcome.message}
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'error' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-2 text-sm text-danger"
        >
          {GENERIC_ERROR}
        </p>
      )}

      {action === 'edit' && (
        <TextareaField
          label="Nuevo contenido"
          required
          value={content}
          disabled={mutation.isPending}
          maxLength={2000}
          onChange={(event) => {
            setContent(event.target.value)
          }}
        />
      )}

      <TextareaField
        label="Motivo de la acción"
        required
        value={reason}
        disabled={mutation.isPending}
        maxLength={REASON_MAX_LENGTH}
        error={reasonError}
        placeholder="Explica por qué se toma esta acción…"
        onChange={(event) => {
          setReason(event.target.value)
          setReasonError(undefined)
        }}
      />

      <div className="flex gap-2">
        <Button type="submit" variant={variant} loading={mutation.isPending}>
          {actionLabel}
        </Button>
        <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
