import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { TextField } from '@/components/ui/form/TextField'
import { HttpError } from '@/lib/http'
import { queryKeys } from '@/shared/query-keys'
import { StarRatingInput } from './StarRatingInput'
import {
  publishProductComment,
  submitProductRating,
  type ProductComment,
  type PublishProductCommentInput,
} from './api'

const MAX_IMAGES = 5

export type PublishCommentTransport = (
  productId: string,
  input: PublishProductCommentInput,
) => Promise<ProductComment>
export type SubmitRatingTransport = (productId: string, rating: number) => Promise<unknown>

export interface ProductCommentsAndRatingProps {
  readonly productId: string
  /** Transportes inyectables para ejercitar el flujo sin red (mismo patron que `AccountDeletionRequest`). */
  readonly publishComment?: PublishCommentTransport
  readonly submitRating?: SubmitRatingTransport
}

type Outcome =
  | { readonly kind: 'success'; readonly ratedToo: boolean }
  | { readonly kind: 'already-rated' }
  | { readonly kind: 'auth-error' }
  | { readonly kind: 'validation-error'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string }

const GENERIC_ERROR = 'No se pudo completar la operación. Intenta nuevamente más tarde.'

/**
 * "Comentarios y calificación" (HU-40, HU-40.4 / Task #174).
 *
 * COMENTAR Y CALIFICAR SON OPERACIONES INDEPENDIENTES en el backend -- un
 * jugador publica cuantos comentarios quiera, y como mucho una calificación
 * por producto -- y este componente lo respeta: publica el comentario
 * primero, y solo si hay una estrella elegida intenta la calificación
 * despues. Un 409 en la calificación (ya calificado) NO deshace ni oculta el
 * comentario que sí se publicó, y el formulario de comentario sigue
 * disponible despues, tal como exige la condicion de finalizacion de
 * HU-40.4: "la existencia de una calificación previa no impide representar
 * la posibilidad de publicar nuevos comentarios".
 *
 * NINGUNA REGLA DE NEGOCIO SE DECIDE AQUÍ. El rango 1-5 lo impone
 * `StarRatingInput` solo para no enviar algo que el backend rechazaría de
 * entrada; la unicidad de la calificación y la validación del comentario las
 * decide Community, y esta pantalla solo traduce su respuesta.
 */
export const ProductCommentsAndRating = ({
  productId,
  publishComment = publishProductComment,
  submitRating = submitProductRating,
}: ProductCommentsAndRatingProps): React.JSX.Element => {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [rating, setRating] = useState<number | null>(null)
  const [alreadyRated, setAlreadyRated] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | undefined>(undefined)

  const mutation = useMutation({
    mutationFn: async (): Promise<Outcome> => {
      const trimmed = content.trim()

      if (trimmed.length === 0) {
        return { kind: 'validation-error', message: 'Escribe un comentario antes de publicar.' }
      }

      const nonEmptyImages = images.map((image) => image.trim()).filter((image) => image !== '')

      try {
        await publishComment(productId, {
          content: trimmed,
          ...(nonEmptyImages.length > 0 ? { images: nonEmptyImages } : {}),
        })
      } catch (error: unknown) {
        if (error instanceof HttpError && error.isUnauthorized) return { kind: 'auth-error' }
        if (error instanceof HttpError && error.isClientError) {
          return { kind: 'validation-error', message: error.message }
        }
        // Un fallo que no es 401 ni 4xx es indisponibilidad del servicio, no
        // un dato de entrada rechazado: el mensaje NUNCA es `error.message`
        // aqui, para no filtrar detalle tecnico de un 500 (mismo criterio que
        // `AccountDeletionRequest`).
        return { kind: 'error', message: GENERIC_ERROR }
      }

      void queryClient.invalidateQueries({
        queryKey: queryKeys.community.productComments(productId),
      })

      if (rating === null) {
        return { kind: 'success', ratedToo: false }
      }

      try {
        await submitRating(productId, rating)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.community.productReviewSummary(productId),
        })
        return { kind: 'success', ratedToo: true }
      } catch (error: unknown) {
        if (error instanceof HttpError && error.status === 409) return { kind: 'already-rated' }
        if (error instanceof HttpError && error.isUnauthorized) return { kind: 'auth-error' }
        if (error instanceof HttpError && error.isClientError) {
          return { kind: 'validation-error', message: error.message }
        }
        // El comentario ya se publico: un fallo AJENO al empujar la
        // calificacion no debe presentarse como si nada se hubiera guardado.
        return { kind: 'success', ratedToo: false }
      }
    },
    onSuccess: (outcome) => {
      if (outcome.kind === 'success' || outcome.kind === 'already-rated') {
        setContent('')
        setImages([])
      }
      if (outcome.kind === 'success' && outcome.ratedToo) {
        setAlreadyRated(true)
        setRating(null)
      }
      if (outcome.kind === 'already-rated') {
        setAlreadyRated(true)
        setRating(null)
      }
    },
  })

  const handleSubmit = (event: React.SyntheticEvent): void => {
    event.preventDefault()
    setValidationMessage(undefined)

    if (content.trim().length === 0) {
      setValidationMessage('Escribe un comentario antes de publicar.')
      return
    }

    mutation.mutate()
  }

  const addImageField = (): void => {
    setImages((current) => (current.length >= MAX_IMAGES ? current : [...current, '']))
  }
  const updateImageField = (index: number, value: string): void => {
    setImages((current) => current.map((image, i) => (i === index ? value : image)))
  }
  const removeImageField = (index: number): void => {
    setImages((current) => current.filter((_, i) => i !== index))
  }

  const outcome = mutation.data

  return (
    <section className="space-y-4" aria-labelledby="product-reviews-title">
      <h3 id="product-reviews-title" className="text-sm font-semibold text-ink">
        Comentarios y calificación
      </h3>

      {mutation.isPending && (
        <p role="status" className="text-sm text-muted">
          Enviando…
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'success' && (
        <p
          role="status"
          className="rounded-lg border border-success bg-success/10 p-3 text-sm text-ink"
        >
          {outcome.ratedToo
            ? 'Tu comentario y tu calificación se publicaron correctamente.'
            : 'Tu comentario se publicó correctamente.'}
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'already-rated' && (
        <p
          role="status"
          className="rounded-lg border border-border bg-surface-raised p-3 text-sm text-ink"
        >
          Tu comentario se publicó correctamente. Ya habías registrado una calificación para este
          producto antes: se mantiene la que ya tenías.
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'auth-error' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          Tu sesión ha caducado. Vuelve a iniciar sesión para comentar o calificar.
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'validation-error' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {outcome.message}
        </p>
      )}

      {!mutation.isPending && outcome?.kind === 'error' && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {outcome.message}
        </p>
      )}

      {validationMessage !== undefined && !mutation.isPending && outcome === undefined && (
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {validationMessage}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextareaField
          label="Comentario"
          required
          value={content}
          disabled={mutation.isPending}
          maxLength={2000}
          placeholder="Cuéntanos qué te pareció este producto."
          onChange={(event) => {
            setContent(event.target.value)
          }}
        />

        <div>
          <span className="block text-sm font-medium text-ink">Imágenes (opcional)</span>
          <div className="mt-1.5 space-y-2">
            {images.map((image, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <TextField
                    label={`Imagen ${String(index + 1)}`}
                    type="url"
                    value={image}
                    disabled={mutation.isPending}
                    placeholder="https://…"
                    onChange={(event) => {
                      updateImageField(index, event.target.value)
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={mutation.isPending}
                  onClick={() => {
                    removeImageField(index)
                  }}
                >
                  Quitar
                </Button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <Button
                type="button"
                variant="secondary"
                disabled={mutation.isPending}
                onClick={addImageField}
              >
                Agregar imagen
              </Button>
            )}
          </div>
        </div>

        {alreadyRated ? (
          <p className="text-sm text-muted">Ya calificaste este producto anteriormente.</p>
        ) : (
          <div>
            <span className="block text-sm font-medium text-ink">Calificación (opcional)</span>
            <div className="mt-1.5">
              <StarRatingInput value={rating} disabled={mutation.isPending} onChange={setRating} />
            </div>
          </div>
        )}

        <Button type="submit" loading={mutation.isPending}>
          Publicar
        </Button>
      </form>
    </section>
  )
}
