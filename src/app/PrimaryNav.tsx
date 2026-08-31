import { useLayoutEffect, useRef } from 'react'
import { NavLink, matchPath, useLocation } from 'react-router'
import clsx from 'clsx'

import { navigationForPrimaryRole } from '@/routes/routes'
import { primaryRole } from '@/shared/rbac'
import { useSession } from '@/shared/session'

export interface PrimaryNavProps {
  readonly className?: string
}

/**
 * Navegacion principal de producto (HU-02, HU-05.4).
 *
 * La comparten `AppHeader` (shell autenticado) y `LandingPage` (menu publico):
 * es la misma identidad de navegacion en ambos lados del login. En `LandingPage`
 * los enlaces llevan a las mismas rutas protegidas; quien no tiene sesion recibe
 * ahi el aviso "Para continuar" de `RequireSession` en lugar del contenido real.
 *
 * El item activo se indica con un unico fondo tipo selector que se DESPLAZA entre
 * modulos. El efecto solo escribe `transform`/`width` directamente sobre el nodo
 * del indicador (sincroniza React con el DOM, sin `setState`); la transicion vive
 * en `.nb-nav-pill` de `index.css`, de modo que `prefers-reduced-motion` la
 * neutraliza sin logica en JavaScript. `NavLink` sigue emitiendo
 * `aria-current="page"`, la senal que consumen las tecnologias de apoyo.
 */
export const PrimaryNav = ({ className }: PrimaryNavProps): React.JSX.Element => {
  const roles = useSession((state) => state.roles)
  const navigation = navigationForPrimaryRole(primaryRole(roles))
  const { pathname } = useLocation()

  const listRef = useRef<HTMLUListElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  const activePath =
    navigation.find((item) => matchPath({ path: item.path, end: false }, pathname) !== null)
      ?.path ?? null

  useLayoutEffect(() => {
    const pill = pillRef.current

    if (pill === null) {
      return
    }

    const position = (): void => {
      const li = activePath === null ? undefined : itemRefs.current.get(activePath)

      if (li === undefined) {
        pill.style.opacity = '0'
        return
      }

      pill.style.opacity = '1'
      pill.style.transform = `translateX(${String(li.offsetLeft)}px)`
      pill.style.width = `${String(li.offsetWidth)}px`
    }

    position()

    // Reposiciona ante cambios de tamano (fuente, viewport) sin medir en cada
    // render. `ResizeObserver` puede no existir (jsdom): el indicador sigue
    // colocado por `position()`.
    if (typeof ResizeObserver === 'undefined' || listRef.current === null) {
      return
    }

    const observer = new ResizeObserver(() => {
      position()
    })
    observer.observe(listRef.current)

    return () => {
      observer.disconnect()
    }
  }, [activePath, navigation.length])

  return (
    <nav aria-label="Principal" className={className}>
      {/*
       * Carril segmentado: `grid` de columnas `1fr` (via `minmax(max-content, 1fr)`)
       * reparte los seis modulos por TODO el ancho disponible sin anchos en
       * pixeles. Si el contenido no cabe (movil), cada columna se queda en su
       * `max-content` y el carril hace scroll horizontal INTERNO.
       */}
      <ul
        ref={listRef}
        className="nb-nav-rail relative grid auto-cols-[minmax(max-content,1fr)] grid-flow-col overflow-x-auto p-1"
      >
        {activePath !== null && (
          <span
            ref={pillRef}
            aria-hidden="true"
            data-testid="primary-nav-indicator"
            className="nb-nav-pill pointer-events-none absolute inset-y-1 left-0 rounded-md opacity-0"
          />
        )}

        {navigation.map((item) => (
          <li
            key={item.path}
            ref={(element) => {
              if (element === null) {
                itemRefs.current.delete(item.path)
              } else {
                itemRefs.current.set(item.path, element)
              }
            }}
            className="relative z-10"
          >
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'nb-nav-seg block rounded-md px-3 py-1.5 text-center text-sm whitespace-nowrap',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  isActive ? 'font-medium text-brand-ink' : 'text-muted',
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
}
