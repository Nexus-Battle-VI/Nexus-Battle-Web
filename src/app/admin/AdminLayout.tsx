import { Outlet } from 'react-router'

import '@/components/admin-kit'
import { primaryRole } from '@/shared/rbac'
import { useSession } from '@/shared/session'

import { adminSectionsFor } from './adminSections'
import { AdminSidebar } from './AdminSidebar'
import { useAdminBadges } from './useAdminBadges'

/**
 * Armazon de la Consola del Consejo (EN-031): la escena del salon, la barra
 * lateral con las secciones que el rol permite y, al lado, la pagina.
 *
 * NO AUTORIZA NADA: no tiene guarda propia. Cada pagina conserva la suya
 * (`RequireAdministrator`, `RequireModerator`...), asi que el acceso es
 * exactamente el de antes; sin rol administrativo, la barra queda casi vacia y
 * la guarda de la pagina muestra su aviso.
 */
export const AdminLayout = (): React.JSX.Element => {
  const roles = useSession((state) => state.roles)
  const sections = adminSectionsFor(primaryRole(roles), roles)
  const badges = useAdminBadges()

  return (
    <div className="ak-console">
      <div className="ak-layout">
        <AdminSidebar sections={sections} badges={badges} />
        <div className="ak-stage">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
