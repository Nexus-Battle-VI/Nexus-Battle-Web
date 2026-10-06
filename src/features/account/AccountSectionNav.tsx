import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'

import { AccountPixelIcon } from './AccountPixelIcon'
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
    <nav aria-label={t('account:sections.label')} className="account-nav min-w-0 overflow-hidden">
      <ul className="account-nav-list w-full max-w-full overflow-x-auto sm:overflow-visible">
        {sections.map((section) => (
          <li key={section.to} className="shrink-0 sm:w-full sm:shrink">
            {/* Ronda 2 (brief seccion 14/15): antes la clase incluia
             * `text-brand`/`text-muted` de Tailwind segun `isActive`, que
             * competia con el color tematico de `.account-nav-item[aria-current]`
             * de `account.css` -de ahi "el texto activo se monta con el
             * frame". El color del item activo ahora lo decide SOLO ese
             * selector CSS (via `aria-current="page"`, que `NavLink` ya
             * gestiona), sin clases de color inline. */}
            <NavLink
              to={section.to}
              end={section.end}
              className="account-nav-item focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {section.icon !== undefined && <AccountPixelIcon icon={section.icon} size="sm" />}
              {t(section.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
