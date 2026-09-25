import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { Button } from '@/components/ui/Button'
import { SelectField, type SelectOption } from '@/components/ui/form/SelectField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { HttpError } from '@/lib/http'
import { reportComment, ReportCategory, type CommentReport, type ReportCommentInput } from './api'

/** Motivos en el idioma activo; al backend solo viaja el codigo (`value`). */
const categoryOptions = (t: TFunction): readonly SelectOption[] =>
  Object.values(ReportCategory).map((value) => ({
    value,
    label: t(`reviews:report.categories.${value}`),
  }))

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
  // Guarda la CLAVE del aviso; se traduce al pintar.
  const [categoryError, setCategoryError] = useState<string | undefined>(undefined)
  const { t } = useTranslation()

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
      setCategoryError('reviews:report.categoryRequired')
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
          {t('reviews:report.sent')}
        </p>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('reviews:report.close')}
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={t('reviews:report.formLabel', { id: commentId })}
      className="mt-2 space-y-3 rounded-lg border border-border bg-surface p-3"
    >
      {mutation.isPending && (
        <p role="status" className="text-sm text-muted">
          {t('reviews:sending')}
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'rate-limited' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-2 text-sm text-danger"
        >
          {t('reviews:report.rateLimited')}
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'auth-error' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-2 text-sm text-danger"
        >
          {t('reviews:report.sessionExpired')}
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'not-found' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-2 text-sm text-danger"
        >
          {t('reviews:report.notFound')}
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
          {t('reviews:genericError')}
        </p>
      )}

      <SelectField
        label={t('reviews:report.reason')}
        required
        placeholder={t('reviews:report.reasonPlaceholder')}
        options={categoryOptions(t)}
        value={category}
        disabled={mutation.isPending}
        error={categoryError === undefined ? undefined : t(categoryError)}
        onChange={(event) => {
          setCategory(event.target.value)
          setCategoryError(undefined)
        }}
      />

      <TextareaField
        label={t('reviews:report.description')}
        value={description}
        disabled={mutation.isPending}
        maxLength={500}
        placeholder={t('reviews:report.descriptionPlaceholder')}
        onChange={(event) => {
          setDescription(event.target.value)
        }}
      />

      <div className="flex gap-2">
        <Button type="submit" loading={mutation.isPending}>
          {t('reviews:report.submit')}
        </Button>
        <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={onCancel}>
          {t('common:cancel')}
        </Button>
      </div>
    </form>
  )
}
