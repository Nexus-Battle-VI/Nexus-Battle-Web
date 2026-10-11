import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'

import { adminNavigationForPrimaryRole, navigationForPrimaryRole } from '@/routes/routes'
import { primaryRole } from '@/shared/rbac'
import { useSession } from '@/shared/session'

import { ADMIN_NAV_LABEL_KEYS, NAV_LABEL_KEYS } from './navLabels'
import { NavPixelIcon } from '@/components/shell/NavPixelIcon'
import { navModuleForPath } from '@/components/shell/shellRemasterAssets'

const FOCUSABLE = 'a[href], button:not([disabled])'

/**
 * Navegacion en movil (EN-031): por debajo de `sm` la barra principal se
 * oculta y una hamburguesa abre este cajon lateral, en lugar de la fila que
 * se desplazaba en horizontal.
 *
 * El cajon solo se monta abierto, asi que cerrado no duplica enlaces. Es un
 * `dialog` modal con su propio `<nav>` (nombre distinto de "Principal", que
 * sigue siendo unico): el foco entra, queda atrapado y vuelve a la
 * hamburguesa al cerrar con Escape, con el velo o con el boton.
 *
 * Se monta con un portal en `<body>`: la cabecera usa `backdrop-filter`, que
 * la convierte en bloque contenedor de sus hijos `fixed`; dentro de ella el
 * cajon quedaria encerrado en la altura de la cabecera.
 *
 * Se cierra solo al navegar: el estado guarda la ruta en la que se abrio y el
 * cajon se considera abierto unicamente mientras la ruta siga siendo esa.
 */
export const MobileNavDrawer = (): React.JSX.Element => {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const roles = useSession((state) => state.roles)
  const role = primaryRole(roles)
  const navigation = navigationForPrimaryRole(role)
  const adminNavigation = adminNavigationForPrimaryRole(role)

  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt === pathname
  const triggerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const drawerId = useId()

  const close = (returnFocus: boolean): void => {
    setOpenedAt(null)
    if (returnFocus) triggerRef.current?.focus()
  }

  // Foco inicial y bloqueo del scroll de la pagina mientras esta abierto.
  useEffect(() => {
    if (!open) return
    drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [open])

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
      return
    }
    if (event.key !== 'Tab' || drawerRef.current === null) return
    const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (first === undefined || last === undefined) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t('app:nav.openMenu')}
        aria-expanded={open}
        aria-controls={open ? drawerId : undefined}
        onClick={() => {
          setOpenedAt(pathname)
        }}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:hidden"
      >
        <NavPixelIcon icon="menu" size="md" />
      </button>

      {open &&
        createPortal(
          <>
            <div
              className="nb-drawer-scrim"
              data-testid="nav-drawer-scrim"
              onClick={() => {
                close(true)
              }}
            />
            <div
              ref={drawerRef}
              id={drawerId}
              role="dialog"
              aria-modal="true"
              aria-label={t('app:nav.drawerLabel')}
              className="nb-drawer p-4"
              onKeyDown={onKeyDown}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <img
                  src="/assets/logo.png"
                  alt=""
                  aria-hidden="true"
                  className="nb-logo-glow h-8 w-auto"
                />
                <button
                  type="button"
                  aria-label={t('app:nav.closeMenu')}
                  onClick={() => {
                    close(true)
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <NavPixelIcon icon="close" size="md" />
                </button>
              </div>

              <nav aria-label={t('app:nav.drawerNav')}>
                <ul className="flex flex-col gap-1">
                  {navigation.map((item) => {
                    const icon = navModuleForPath(item.path)
                    const labelKey = NAV_LABEL_KEYS[item.path]
                    return (
                      <li key={item.path}>
                        <NavLink to={item.path} className="nb-drawer-link">
                          {icon !== null && <NavPixelIcon icon={icon} size="md" />}
                          {labelKey === undefined ? item.label : t(labelKey)}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>

                {adminNavigation.length > 0 && (
                  <>
                    <h2 className="mt-5 mb-1 px-3 text-xs font-semibold tracking-wide text-muted uppercase">
                      {t('app:nav.administrator')}
                    </h2>
                    <ul className="flex flex-col gap-1">
                      {adminNavigation.map((item) => {
                        const labelKey = ADMIN_NAV_LABEL_KEYS[item.path]
                        return (
                          <li key={item.path}>
                            <NavLink to={item.path} className="nb-drawer-link">
                              <NavPixelIcon icon="console" size="md" />
                              {labelKey === undefined ? item.label : t(labelKey)}
                            </NavLink>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </nav>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
