import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import clsx from 'clsx'

import { Eye, EyeOff } from './icons'

/**
 * Campo de contraseña con control accesible mostrar/ocultar (HU-05.4).
 *
 * Reutilizable: hoy en Registro y Login; la pantalla de cambio de contraseña de
 * `/account` (fase posterior) usara este mismo componente.
 *
 * - El input nace `type="password"` y solo alterna a `text` mientras el ojo esta
 *   activo. El booleano es **efimero**: no se persiste en `localStorage`,
 *   `sessionStorage`, Zustand ni ningun estado global, y la contraseña nunca se
 *   registra ni se emite en eventos adicionales.
 * - Todas las props de `<input>` (`id`, `value`, `onChange`, `aria-invalid`,
 *   `aria-describedby`, `autoComplete`, ...) se reenvian al input, de modo que la
 *   etiqueta asociada por `htmlFor={id}` sigue apuntando al campo real.
 */

export interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Obligatorio: asocia la etiqueta (`htmlFor`) y el `aria-controls` del boton. */
  readonly id: string
}

export const PasswordField = ({
  id,
  className,
  ...rest
}: PasswordFieldProps): React.JSX.Element => {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...rest}
        id={id}
        type={visible ? 'text' : 'password'}
        className={clsx(className, 'pr-10')}
      />
      <button
        type="button"
        // El nombre accesible describe la ACCION disponible, y cambia con el
        // estado; `aria-pressed` comunica ademas si el campo esta revelado.
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        aria-controls={id}
        onClick={() => {
          setVisible((previous) => !previous)
        }}
        className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md p-1.5 text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
