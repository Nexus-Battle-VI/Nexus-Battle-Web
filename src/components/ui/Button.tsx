import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'marketplace'
  | 'battle-primary'
  | 'battle-secondary'
  | 'battle-danger'
  | 'battle-compact'
  | 'account-primary'
  | 'account-secondary'
  | 'account-danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant
  readonly loading?: boolean
  readonly children: ReactNode
}

const VARIANTS: Readonly<Record<ButtonVariant, string>> = {
  primary: 'bg-brand text-brand-ink hover:opacity-90',
  secondary: 'bg-surface-raised text-ink border border-border hover:bg-surface',
  danger: 'bg-danger text-white hover:opacity-90',
  /*
   * CTA "de mercado" (remaster visual E-commerce Sprint 3). El aspecto real
   * (border-image sobre `Buttons/ecommerce-buttons-primary-*`, con sus 4
   * estados reales) vive en `features/commerce/commerce.css` bajo la clase
   * `mk-btn-primary` -no aqui-, porque es un asset propio de E-commerce y
   * este componente es compartido por toda la app. Aqui solo se declara el
   * gancho de clase; el texto de color usa `text-ink` (no `text-brand-ink`)
   * porque el sprite ya trae su propio fondo, no el de `--color-brand`.
   */
  marketplace: 'mk-btn-primary text-ink',
  /*
   * Remaster visual "Jugar Online" (Sprint 3), mismo criterio que
   * `marketplace` arriba: el aspecto real vive en
   * `features/battle-rooms/battle-rooms.css` (`br-btn-*`), aqui solo el
   * gancho de clase. `text-ink` porque el sprite ya trae su propio fondo.
   */
  'battle-primary': 'br-btn-primary text-ink',
  'battle-secondary': 'br-btn-secondary text-ink',
  'battle-danger': 'br-btn-danger text-ink',
  'battle-compact': 'br-btn-compact text-ink text-xs',
  /*
   * Remaster visual "Mi cuenta" (Sprint 3), mismo criterio que `battle-*`
   * arriba: el aspecto real (gradiente CSS, SIN raster -leccion de
   * `br-btn-*`, seccion 55/58 del brief- vive en
   * `features/account/account.css` (`account-btn-*`); aqui solo el gancho.
   */
  'account-primary': 'account-btn-primary text-ink',
  'account-secondary': 'account-btn-secondary text-ink',
  'account-danger': 'account-btn-danger text-ink',
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
