import clsx from 'clsx'

import { Star } from '@/components/ui/icons'

const SCALE = [1, 2, 3, 4, 5] as const

export interface StarRatingInputProps {
  readonly value: number | null
  readonly onChange: (rating: number) => void
  readonly disabled?: boolean
  /** Etiqueta accesible del grupo completo. */
  readonly label?: string
}

/**
 * Selector de calificación de 1 a 5 estrellas (HU-40.4).
 *
 * ES UN `radiogroup` DE BOTONES, no una imagen: cada estrella es un boton
 * real, alcanzable y activable por teclado (Tab + Enter/Espacio), y el valor
 * elegido se anuncia por `aria-checked`, nunca solo por el relleno visual del
 * icono -- HU-40.4 exige operacion por teclado y no depender solo del color.
 */
export const StarRatingInput = ({
  value,
  onChange,
  disabled = false,
  label = 'Calificación',
}: StarRatingInputProps): React.JSX.Element => (
  <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
    {SCALE.map((star) => {
      const selected = value !== null && star <= value

      return (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${String(star)} de 5 estrellas`}
          disabled={disabled}
          onClick={() => {
            onChange(star)
          }}
          className={clsx(
            'rounded p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Star
            aria-hidden="true"
            className={clsx('size-6', selected ? 'fill-brand text-brand' : 'fill-none text-muted')}
          />
        </button>
      )
    })}
  </div>
)
