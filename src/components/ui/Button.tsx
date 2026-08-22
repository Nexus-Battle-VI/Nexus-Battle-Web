import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant
  readonly loading?: boolean
  readonly children: ReactNode
}

const VARIANTS: Readonly<Record<ButtonVariant, string>> = {
  primary: 'bg-brand text-brand-ink hover:opacity-90',
  secondary: 'bg-surface-raised text-ink border border-border hover:bg-surface',
  danger: 'bg-danger text-white hover:opacity-90',
}

export const Button = ({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps): React.JSX.Element => (
  <button
    type="button"
    disabled={disabled === true || loading}
    // `aria-busy` comunica el estado de carga a las tecnologias de apoyo. Sin
    // el, un boton deshabilitado durante una peticion es indistinguible de uno
    // deshabilitado de forma permanente.
    aria-busy={loading}
    className={clsx(
      'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
      'transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      'disabled:cursor-not-allowed disabled:opacity-50',
      VARIANTS[variant],
      className,
    )}
    {...rest}
  >
    {loading ? 'Procesando...' : children}
  </button>
)
