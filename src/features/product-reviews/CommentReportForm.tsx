import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { SelectField, type SelectOption } from '@/components/ui/form/SelectField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { HttpError } from '@/lib/http'
import { reportComment, ReportCategory, type CommentReport, type ReportCommentInput } from './api'

const CATEGORY_OPTIONS: readonly SelectOption[] = [
  { value: ReportCategory.Spam, label: 'Spam' },
  { value: ReportCategory.OffensiveContent, label: 'Contenido ofensivo' },
  { value: ReportCategory.Harassment, label: 'Acoso' },
  { value: ReportCategory.FalseInformation, label: 'Información falsa' },
  { value: ReportCategory.InappropriateContent, label: 'Contenido inapropiado' },
  { value: ReportCategory.CopyrightViolation, label: 'Violación de derechos de autor' },
]

const GENERIC_ERROR = 'No se pudo completar la operación. Intenta nuevamente más tarde.'
const RATE_LIMIT_MESSAGE =
  'Has alcanzado el límite de reportes permitido. Intenta nuevamente más adelante.'

export type ReportCommentTransport = (
  commentId: string,
  input: ReportCommentInput,
) => Promise<CommentReport>

export interface CommentReportFormProps {
  readonly commentId: string
  /** Cierra el formulario sin enviar nada. */
  readonly onCancel: () => void
  /** Transporte inyectable, mismo patron que `ProductCommentsAndRating`. */
  readonly report?: ReportCommentTransport
}

type Outcome =
  | { readonly kind: 'success' }
  | { readonly kind: 'validation-error'; readonly message: string }
  | { readonly kind: 'auth-error' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'rate-limited' }
  | { readonly kind: 'error' }

/**
 * Formulario de reporte de un comentario (HU-46, Task #183).
 *
 * REPORTAR NO ES UN VEREDICTO. El comentario que se reporta no se oculta ni
 * se marca como infractor aqui: el reporte solo entra a la cola de
 * moderacion de Community, que es quien decide. El texto de exito lo dice
 * explicitamente para no sugerir lo contrario.
 *
 * NINGUN LIMITE SE INVENTA AQUI. RF-46 no fija cuantos reportes admite un
 * jugador; el 429 se traduce a un aviso generico, nunca a una cifra concreta.
 */
export const CommentReportForm = ({
  commentId,
  onCancel,
  report = reportComment,
}: CommentReportFormProps): React.JSX.Element => {
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [categoryError, setCategoryError] = useState<string | undefined>(undefined)

  const mutation = useMutation({
    mutationFn: async (): Promise<Outcome> => {
      const trimmedDescription = description.trim()

      try {
        await report(commentId, {
          category: category as ReportCategory,
          ...(trimmedDescription === '' ? {} : { description: trimmedDescription }),
        })
      } catch (error: unknown) {
        if (error instanceof HttpError && error.status === 429) return { kind: 'rate-limited' }
        if (error instanceof HttpError && error.isUnauthorized) return { kind: 'auth-error' }
        if (error instanceof HttpError && error.isNotFound) return { kind: 'not-found' }
        if (error instanceof HttpError && error.isClientError) {
          return { kind: 'validation-error', message: error.message }
        }
        // Un fallo que no es 401/404/429/4xx es indisponibilidad del
        // servicio, no un dato rechazado: nunca `error.message` aqui, para no
        // filtrar detalle tecnico de un 500 (mismo criterio que
        // `ProductCommentsAndRating`).
        return { kind: 'error' }
      }

      return { kind: 'success' }
    },
  })

  const handleSubmit = (event: React.SyntheticEvent): void => {
    event.preventDefault()

    if (category === '') {
      setCategoryError('Selecciona un motivo para continuar.')
      return
    }

    setCategoryError(undefined)
    mutation.mutate()
  }

  const outcome = mutation.data

  if (!mutation.isPending && outcome?.kind === 'success') {
    return (
      <div className="mt-2 space-y-2 rounded-lg border border-border bg-surface p-3">
        <p role="status" className="text-sm text-ink">
          Tu reporte fue enviado para revisión.
        </p>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cerrar
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={`Reportar comentario ${commentId}`}
      className="mt-2 space-y-3 rounded-lg border border-border bg-surface p-3"
    >
      {mutation.isPending && (
        <p role="status" className="text-sm text-muted">
          Enviando…
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'rate-limited' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-2 text-sm text-danger"
        >
          {RATE_LIMIT_MESSAGE}
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'auth-error' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-2 text-sm text-danger"
        >
          Tu sesión ha caducado. Vuelve a iniciar sesión para reportar este comentario.
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

      <SelectField
        label="Motivo del reporte"
        required
        placeholder="Selecciona un motivo"
        options={CATEGORY_OPTIONS}
        value={category}
        disabled={mutation.isPending}
        error={categoryError}
        onChange={(event) => {
          setCategory(event.target.value)
          setCategoryError(undefined)
        }}
      />

      <TextareaField
        label="Descripción adicional (opcional)"
        value={description}
        disabled={mutation.isPending}
        maxLength={500}
        placeholder="Cuéntanos más sobre el motivo del reporte…"
        onChange={(event) => {
          setDescription(event.target.value)
        }}
      />

      <div className="flex gap-2">
        <Button type="submit" loading={mutation.isPending}>
          Enviar reporte
        </Button>
        <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
