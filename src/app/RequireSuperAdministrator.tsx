import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'
import { primaryRole } from '@/shared/rbac'
import { useSession } from '@/shared/session'

export interface RequireSuperAdministratorProps {
  readonly children: ReactNode
}

/**
 * Puerta de presentacion para HU-39. No autoriza la operacion: Account valida
 * el testimonio y responde 403 aunque alguien escriba la URL manualmente.
 */
export const RequireSuperAdministrator = ({
  children,
}: RequireSuperAdministratorProps): React.JSX.Element => {
  const roles = useSession((state) => state.roles)

  if (primaryRole(roles) !== 'SUPER_ADMINISTRATOR') {
    return (
      <Card title="Acceso denegado">
        <p role="alert" className="text-sm text-muted">
          Solo el Super Administrador puede gestionar roles. El servicio tambien valida este permiso
          y rechazara la operacion con estado 403.
        </p>
      </Card>
    )
  }

  return <>{children}</>
}
