import clsx from 'clsx'

import { useTheme, type Theme } from '@/shared/theme'

/**
 * Conmutador global de tema (HU-05.4).
 *
 * Unico control de tema de la aplicacion: lee y escribe el store compartido
 * (`@/shared/theme`), nunca un estado propio. Se reutiliza en el encabezado del
 * shell autenticado, en el menu publico, en Registro y en Login; no hay una
 * copia por pantalla.
 *
 * Conserva el markup del conmutador que HU-01 tenia embebido en `RegistrationPage`
 * (grupo con dos botones "Light"/"Dark" y `aria-pressed`) para no romper su
 * contrato accesible ni sus pruebas.
 */

const OPTIONS: readonly { readonly value: Theme; readonly label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export interface ThemeToggleProps {
  readonly className?: string
}

export const ThemeToggle = ({ className }: ThemeToggleProps): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  const setTheme = useTheme((state) => state.setTheme)

  return (
    <div
      role="group"
      aria-label="Tema de la interfaz"
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised p-1',
        className,
      )}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={theme === option.value}
          onClick={() => {
            setTheme(option.value)
          }}
          className={clsx(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            theme === option.value ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
