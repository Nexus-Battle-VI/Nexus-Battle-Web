import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'

export interface CheckboxFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'type'
> {
  readonly label: string
  readonly hint?: string
}

/**
 * Casilla con etiqueta y ayuda, dibujada como una fila con recuadro.
 *
 * La ayuda va enlazada con `aria-describedby` y no solo colocada debajo: en
 * este formulario la casilla «Producto premium» CAMBIA que campos son
 * obligatorios, asi que su consecuencia tiene que llegar tambien a quien no ve
 * la pantalla.
 */
export const CheckboxField = ({
  label,
  hint,
  className,
  ...rest
}: CheckboxFieldProps): React.JSX.Element => {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div
      className={
        className ?? 'flex items-start gap-3 rounded-md border border-border bg-surface/40 p-4'
      }
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]"
        {...(hint === undefined ? {} : { 'aria-describedby': hintId })}
        {...rest}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {hint !== undefined && (
          <p id={hintId} className="mt-0.5 text-xs text-muted">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}
