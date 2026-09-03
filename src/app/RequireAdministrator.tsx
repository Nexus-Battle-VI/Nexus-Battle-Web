import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'
import { canViewAdminUsers } from '@/shared/rbac'
import { useSession } from '@/shared/session'

export interface RequireAdministratorProps {
  readonly children: ReactNode
}

/**
 * Puerta de presentacion para superficies administrativas (HU-33 / HU-44).
 *
 * NO AUTORIZA NADA. Los servicios validan el testimonio y responden 403 aunque
 * alguien escriba la URL a mano; esto solo evita mostrar una pantalla que la
 * persona no va a poder usar. El criterio de roles vive en RBAC compartido.
 */
export const RequireAdministrator = ({
  children,
}: RequireAdministratorProps): React.JSX.Element => {
  const roles = useSession((state) => state.roles)

  if (!canViewAdminUsers(roles)) {
    return (
      <Card title="Acceso denegado">
        <p role="alert" className="text-sm text-muted">
          Acceso denegado. Solo un Administrador o Super Administrador puede acceder a esta seccion
          administrativa. El servicio tambien valida este permiso y rechazara la operacion con
          estado 403.
        </p>
      </Card>
    )
  }

  return <>{children}</>
}
