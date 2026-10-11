import { useTranslation } from 'react-i18next'

import { AdminBadge, AdminPageHeader, AdminPanel, AdminTile } from '@/components/admin-kit'
import { primaryRole, roleLabel } from '@/shared/rbac'
import { useSession } from '@/shared/session'

import { ADMIN_NAV_LABEL_KEYS } from '../navLabels'
import { ADMIN_SECTION_GROUPS, adminSectionsFor } from './adminSections'
import { useAdminBadges } from './useAdminBadges'

const PENDING = [
  { key: 'moderation', path: '/admin/comments/moderation' },
  { key: 'tickets', path: '/admin/chatbot/tickets' },
] as const

/**
 * Panel de inicio de la Consola del Consejo (EN-031): saludo con el rol, los
 * pendientes que la persona puede atender y un mosaico por seccion permitida.
 * No pide nada nuevo: los pendientes son las mismas consultas de la barra
 * lateral (cache compartida).
 */
export const AdminHomePage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const roles = useSession((state) => state.roles)
  const role = primaryRole(roles)
  const sections = adminSectionsFor(role, roles)
  const badges = useAdminBadges()
  const pending = PENDING.filter((item) => badges[item.key] !== null)

  return (
    <>
      <AdminPageHeader
        icon="console"
        title={t('admin:console.title')}
        subtitle={t('admin:console.greeting', { role: role === null ? '' : roleLabel(role) })}
      />

      {pending.length > 0 && (
        <AdminPanel title={t('admin:console.pendingTitle')}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {pending.map((item) => {
              const count = badges[item.key] ?? 0
              return (
                <li key={item.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ink">
                    {t(`admin:console.pendingItems.${item.key}`)}
                  </span>
                  {count > 0 ? (
                    <AdminBadge count={count} label={t('admin:console.pending', { count })} />
                  ) : (
                    <span className="text-xs text-muted">{t('admin:console.allClear')}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </AdminPanel>
      )}

      {ADMIN_SECTION_GROUPS.map((group) => {
        const items = sections.filter((section) => section.group === group)
        if (items.length === 0) return null
        return (
          <AdminPanel key={group} title={t(`admin:console.groups.${group}`)}>
            <div className="ak-tiles">
              {items.map((section) => {
                const labelKey = ADMIN_NAV_LABEL_KEYS[section.path]
                const count = section.badge === undefined ? null : badges[section.badge]
                return (
                  <AdminTile
                    key={section.path}
                    to={section.path}
                    icon={section.icon}
                    title={labelKey === undefined ? section.label : t(labelKey)}
                    hint={t(`admin:console.hints.${section.icon}`)}
                    badge={
                      count === null ? undefined : (
                        <AdminBadge count={count} label={t('admin:console.pending', { count })} />
                      )
                    }
                  />
                )
              })}
            </div>
          </AdminPanel>
        )
      })}
    </>
  )
}
