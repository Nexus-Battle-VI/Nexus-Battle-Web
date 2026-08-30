import { NavLink } from 'react-router'
import clsx from 'clsx'

import { NAVIGATION } from '@/routes/routes'

/**
 * Navegacion principal de producto (HU-02).
 *
 * La comparten `AppLayout` (shell autenticado) y `LandingPage` (menu
 * publico): es la misma identidad de navegacion en ambos lados del login, no
 * una version publica "parecida". En `LandingPage` los enlaces llevan a las
 * mismas rutas protegidas; quien no tiene sesion recibe ahi el aviso "Para
 * continuar" de `RequireSession` en lugar del contenido real.
 */
export const PrimaryNav = (): React.JSX.Element => (
  <nav aria-label="Principal">
    <ul className="flex flex-wrap gap-1">
      {NAVIGATION.map((item) => (
        <li key={item.path}>
          <NavLink
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink',
              )
            }
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
)
