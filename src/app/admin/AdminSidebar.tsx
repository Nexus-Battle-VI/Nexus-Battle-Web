import { useId, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { AdminBadge, AdminPixelIcon } from '@/components/admin-kit'

import { ADMIN_NAV_LABEL_KEYS } from '../navLabels'
import { ADMIN_SECTION_GROUPS, type AdminSection } from './adminSections'
import type { AdminBadgeCounts } from './useAdminBadges'

/**
 * Barra lateral de la Consola del Consejo (EN-031): el inicio de la consola y
 * cada seccion permitida, agrupadas. `NavLink` marca la actual con
 * `aria-current="page"`.
 *
 * Por debajo de `lg` se pliega tras un boton "Secciones" para no empujar la
 * pagina hacia abajo; se vuelve a plegar al navegar (el estado recuerda la ruta
 * en la que se abrio, mismo criterio que el cajon movil).
 */
export const AdminSidebar = ({
  sections,
  badges,
}: {
  readonly sections: readonly AdminSection[]
  readonly badges: AdminBadgeCounts
}): React.JSX.Element => {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const expanded = openedAt === pathname
  const navId = useId()

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={navId}
        onClick={() => {
          setOpenedAt(expanded ? null : pathname)
        }}
        className="ak-sidebar-toggle flex lg:hidden"
      >
        <AdminPixelIcon icon="console" size="md" />
        {t('admin:console.sections')}
      </button>
      <nav
        id={navId}
        aria-label={t('admin:console.sidebar')}
        className={clsx('ak-sidebar', !expanded && 'max-lg:hidden')}
      >
        <NavLink to="/admin" end className="ak-sidebar-link">
          <AdminPixelIcon icon="console" size="md" />
          {t('app:nav.console')}
        </NavLink>

        {ADMIN_SECTION_GROUPS.map((group) => {
          const items = sections.filter((section) => section.group === group)
          if (items.length === 0) return null
          return (
            <div key={group} className="ak-sidebar-group">
              <h2 className="ak-sidebar-heading">{t(`admin:console.groups.${group}`)}</h2>
              <ul className="flex flex-col gap-0.5">
                {items.map((section) => {
                  const count = section.badge === undefined ? null : badges[section.badge]
                  const labelKey = ADMIN_NAV_LABEL_KEYS[section.path]
                  return (
                    <li key={section.path}>
                      <NavLink to={section.path} className="ak-sidebar-link">
                        <AdminPixelIcon icon={section.icon} size="md" />
                        <span className="min-w-0 flex-1">
                          {labelKey === undefined ? section.label : t(labelKey)}
                        </span>
                        {count !== null && (
                          <AdminBadge count={count} label={t('admin:console.pending', { count })} />
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
    </div>
  )
}
