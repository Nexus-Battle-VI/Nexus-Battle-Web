import { NavLink } from 'react-router'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { accountSectionsForRoles } from './sections'

export interface AccountSectionNavProps {
  readonly roles: readonly string[]
}

/**
 * Navegacion interna de "Mi cuenta" (HU-05.4).
 *
 * Enlaces reales (`NavLink`) a rutas montadas: cada seccion tiene su URL, se
 * puede compartir y el boton "atras" funciona. Son enlaces, no botones, porque
 * navegan; el estado activo lo marca `aria-current="page"` y el foco es visible.
 * En escritorio se apila en la columna lateral; en movil es una tira con scroll
 * horizontal propio -nunca desborda el `body`-.
 */
export const AccountSectionNav = ({ roles }: AccountSectionNavProps): React.JSX.Element => {
  const sections = accountSectionsForRoles(roles)
  const { t } = useTranslation()

  return (
    <nav aria-label={t('account:sections.label')} className="min-w-0 overflow-hidden">
      <ul className="flex w-full max-w-full gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
        {sections.map((section) => (
          <li key={section.to} className="shrink-0">
            <NavLink
              to={section.to}
              end={section.end}
              className={({ isActive }) =>
                clsx(
                  'block rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  isActive
                    ? 'bg-brand/12 font-medium text-brand'
                    : 'text-muted hover:bg-surface hover:text-ink',
                )
              }
            >
              {t(section.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
