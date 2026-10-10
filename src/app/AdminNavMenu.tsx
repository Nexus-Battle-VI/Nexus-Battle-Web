import { useEffect, useRef, useState } from 'react'
import { NavLink, matchPath, useLocation } from 'react-router'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { adminNavigationForPrimaryRole } from '@/routes/routes'
import { primaryRole } from '@/shared/rbac'
import { useSession } from '@/shared/session'
import { ChevronDown } from '@/components/ui/icons'

/**
 * Etiqueta traducida de cada acceso administrativo, por ruta. Mismo motivo que
 * `NAV_LABEL_KEYS` de `PrimaryNav`: `ADMIN_NAVIGATION` conserva su `label` en
 * español como respaldo, asi un acceso nuevo sin traduccion sigue mostrandose
 * en lugar de desaparecer.
 */
const ADMIN_NAV_LABEL_KEYS: Readonly<Record<string, string>> = {
  '/admin/missions': 'app:nav.editMissions',
  '/admin/products': 'app:nav.manageProducts',
  '/admin/banners': 'app:nav.banners',
  '/admin/roles': 'app:nav.roles',
  '/admin/auction-metrics': 'app:nav.auctionMetrics',
  '/admin/comments/moderation': 'app:nav.moderation',
}

/**
 * Entrada "Administrador" de la navegacion principal (pedido del profesor,
 * 2026-09-26): agrupa en UN desplegable los accesos que antes vivian como
 * items sueltos, mezclados con los seis modulos centrales de producto.
 *
 * MISMO PATRON QUE `SessionControl` ("Mi cuenta"): boton con
 * `aria-haspopup="menu"` + `aria-expanded`, menu `role="menu"` con
 * `menuitem` que son enlaces reales, cierre al hacer clic fuera o al pulsar
 * Escape (con el foco de vuelta al disparador). Se reutiliza esa mecanica en
 * lugar de inventar una nueva porque ya es el patron de desplegable que este
 * codigo conoce y prueba.
 *
 * NO SE RENDERIZA NADA si el rol primario no califica para ninguno de los
 * accesos de `ADMIN_NAVIGATION`: un Jugador nunca ve la entrada
 * "Administrador". Dentro del menu, cada item sigue filtrado por su propio
 * `requiredPrimaryRole` -mismo criterio que antes, ahora expresado en
 * `adminNavigationForPrimaryRole`-, asi que un Administrador ve menos items
 * que un Super Administrador, aunque ambos vean la entrada agrupadora.
 *
 * NO ES UNA GUARDA DE SEGURIDAD: ocultar o mostrar este menu es presentacion.
 * Cada ruta que enlaza sigue detras de `RequireAdministrator` /
 * `RequireSuperAdministrator` / `RequireModerator`, y el servicio real valida
 * el testimonio y responde 403 aunque alguien escriba la URL a mano.
 */
export const AdminNavMenu = (): React.JSX.Element | null => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const roles = useSession((state) => state.roles)
  const role = primaryRole(roles)
  const items = adminNavigationForPrimaryRole(role)
  const { pathname } = useLocation()
  const { t } = useTranslation()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        // Devolver el foco al disparador: cerrar con teclado no debe dejar el
        // foco perdido en el `body` (mismo criterio que `SessionControl`).
        triggerRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Sin ningun acceso habilitado para este rol, no hay nada que agrupar: no
  // se renderiza un boton que abriria un menu vacio.
  if (items.length === 0) {
    return null
  }

  const isActive = items.some(
    (item) => matchPath({ path: item.path, end: false }, pathname) !== null,
  )

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((prev) => !prev)
        }}
        className={clsx(
          'nb-nav-seg flex items-center gap-1 rounded-md px-3 py-1.5 text-sm whitespace-nowrap',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          isActive ? 'font-medium text-brand-ink' : 'text-muted',
        )}
        data-testid="admin-nav-trigger"
      >
        <span>{t('app:nav.administrator')}</span>
        <ChevronDown
          className={clsx('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={t('app:nav.adminMenuLabel')}
          className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-surface-raised py-1 shadow-2xl backdrop-blur-md"
          data-testid="admin-nav-dropdown"
        >
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
              }}
              className={({ isActive: linkActive }) =>
                clsx(
                  'block px-4 py-2.5 text-sm text-ink transition-colors hover:bg-brand/10',
                  linkActive && 'font-medium text-brand',
                )
              }
            >
              {t(ADMIN_NAV_LABEL_KEYS[item.path] ?? item.label)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}
