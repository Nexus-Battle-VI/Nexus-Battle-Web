import { NavLink } from 'react-router'
import clsx from 'clsx'

import { ACCOUNT_SECTIONS } from './sections'

/**
 * Navegacion interna de "Mi cuenta" (HU-05.4).
 *
 * Enlaces reales (`NavLink`) a rutas montadas: cada seccion tiene su URL, se
 * puede compartir y el boton "atras" funciona. Son enlaces, no botones, porque
 * navegan; el estado activo lo marca `aria-current="page"` y el foco es visible.
 * En escritorio se apila en la columna lateral; en movil es una tira con scroll
 * horizontal propio -nunca desborda el `body`-.
 */
export const AccountSectionNav = (): React.JSX.Element => (
  <nav aria-label="Secciones de Mi cuenta">
    <ul className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
      {ACCOUNT_SECTIONS.map((section) => (
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
            {section.label}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
)
