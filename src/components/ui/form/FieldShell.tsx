import type { ReactNode } from 'react'
import { useId } from 'react'

import { FIELD_ERROR_CLASS, FIELD_HINT_CLASS, FIELD_LABEL_CLASS } from './fieldStyles'

export interface FieldShellProps {
  readonly label: string
  readonly hint?: string
  readonly error?: string | undefined
  readonly required?: boolean
  /** Recibe los identificadores ya resueltos para enlazarlos con el control. */
  readonly children: (ids: FieldIds) => ReactNode
}

export interface FieldIds {
  readonly id: string
  /**
   * Valor de `aria-describedby`. Apunta a la ayuda, al error o a ambos, y es
   * `undefined` cuando no hay ninguno: una cadena vacia enlazaria con nada y
   * los lectores de pantalla anunciarian una descripcion inexistente.
   */
  readonly describedBy: string | undefined
  readonly invalid: boolean
}

/**
 * Etiqueta, ayuda y error de un campo, resueltos una sola vez.
 *
 * NO dibuja el control: lo recibe como funcion y le entrega los identificadores
 * ya calculados. Asi un `input`, un `select` y un `textarea` comparten la misma
 * estructura accesible sin que ninguno tenga que repetir el cableado de
 * `aria-describedby`, que es justo lo que se olvida cuando cada campo se
 * escribe a mano.
 *
 * El error se anuncia con `role="alert"`: aparece despues de un intento de
 * envio, y sin el nadie que navegue con lector de pantalla se entera de por que
 * el formulario no avanzo.
 */
export const FieldShell = ({
  label,
  hint,
  error,
  required = false,
  children,
}: FieldShellProps): React.JSX.Element => {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const described = [hint === undefined ? null : hintId, error === undefined ? null : errorId]
    .filter((value): value is string => value !== null)
    .join(' ')

  return (
    <div className="flex flex-col">
      <label htmlFor={id} className={FIELD_LABEL_CLASS}>
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      <div className="mt-1.5">
        {children({
          id,
          describedBy: described === '' ? undefined : described,
          invalid: error !== undefined,
        })}
      </div>
      {hint !== undefined && (
        <p id={hintId} className={FIELD_HINT_CLASS}>
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} role="alert" className={FIELD_ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  )
}
