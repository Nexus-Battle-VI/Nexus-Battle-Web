import type { ReactNode } from 'react'
import clsx from 'clsx'

/**
 * Campo de las pantallas de Autenticacion (remaster EN-031): etiqueta, ayuda,
 * contador y error asociados al control. Sustituye las tres copias que tenian
 * Login, Registro y Recuperacion, con el mismo cableado accesible: el control
 * recibe `aria-invalid` y `aria-describedby` en lugar de repetirlos a mano, asi
 * ningun campo se queda sin ellos justo cuando es el que falla.
 */
export interface AuthFieldControlProps {
  readonly id: string
  readonly 'aria-invalid': boolean
  readonly 'aria-describedby': string | undefined
  readonly 'aria-required'?: true
  readonly className: string
}

export interface AuthFieldProps {
  readonly id: string
  readonly label: string
  readonly hint?: string
  readonly counter?: string
  readonly error?: string
  /** Marca el control con `aria-required` (Registro lo exige en todos). */
  readonly required?: boolean
  readonly children: (props: AuthFieldControlProps) => ReactNode
}

export const AuthField = ({
  id,
  label,
  hint,
  counter,
  error,
  required = false,
  children,
}: AuthFieldProps): React.JSX.Element => {
  const describedBy = [
    hint === undefined ? null : `${id}-hint`,
    counter === undefined ? null : `${id}-counter`,
    error === undefined ? null : `${id}-error`,
  ]
    .filter((value) => value !== null)
    .join(' ')

  return (
    <div className="auth-field w-full min-w-0">
      <label htmlFor={id} className="auth-label">
        {label}
      </label>

      <div className="mt-1.5">
        {children({
          id,
          'aria-invalid': error !== undefined,
          'aria-describedby': describedBy === '' ? undefined : describedBy,
          ...(required ? { 'aria-required': true as const } : {}),
          className: clsx('auth-control', error !== undefined && 'auth-control--invalid'),
        })}
      </div>

      {(hint !== undefined || counter !== undefined) && (
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          {hint !== undefined && (
            <p id={`${id}-hint`} className="auth-hint">
              {hint}
            </p>
          )}
          {counter !== undefined && (
            <p id={`${id}-counter`} className="auth-hint tabular-nums">
              {counter}
            </p>
          )}
        </div>
      )}

      {error !== undefined && (
        // El error no se senala solo con color: lleva tambien una marca textual,
        // porque quien no distingue el rojo necesita otra pista.
        <p id={`${id}-error`} className="auth-error">
          <span aria-hidden="true" className="font-bold leading-5">
            !
          </span>
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
