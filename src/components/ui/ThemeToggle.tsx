import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { useTheme, type Theme } from '@/shared/theme'

import './theme-toggle.css'

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
 *
 * EN-031: se ve como un interruptor pixel art de piedra y oro (sol y luna de
 * PixelLab, `public/assets/shell/theme/`) con una placa que se desliza al tema
 * activo. Los textos "Light"/"Dark" siguen siendo el nombre accesible de cada
 * boton (texto `sr-only`) y su `title`.
 */

const OPTIONS: readonly {
  readonly value: Theme
  readonly labelKey: string
  readonly icon: string
}[] = [
  { value: 'light', labelKey: 'common:theme.light', icon: '/assets/shell/theme/sun.png' },
  { value: 'dark', labelKey: 'common:theme.dark', icon: '/assets/shell/theme/moon.png' },
]

export interface ThemeToggleProps {
  readonly className?: string
}

export const ThemeToggle = ({ className }: ThemeToggleProps): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  const setTheme = useTheme((state) => state.setTheme)
  const { t } = useTranslation()

  return (
    <div
      role="group"
      aria-label={t('common:theme.group')}
      data-theme-choice={theme}
      className={clsx('nb-theme-switch', className)}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={theme === option.value}
          title={t(option.labelKey)}
          onClick={() => {
            setTheme(option.value)
          }}
          className="nb-theme-option focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <img src={option.icon} alt="" aria-hidden="true" width={32} height={32} />
          <span className="sr-only">{t(option.labelKey)}</span>
        </button>
      ))}
    </div>
  )
}
