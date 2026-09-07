import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'
import { canModerateComments } from '@/shared/rbac'
import { useSession } from '@/shared/session'

export interface RequireModeratorProps {
  readonly children: ReactNode
}

/**
 * Puerta de presentacion para la moderacion de comentarios (HU-41.4).
 *
 * NO AUTORIZA NADA, mismo criterio que `RequireAdministrator`: Community
 * valida el testimonio y responde 403 aunque alguien escriba la URL a mano;
 * esto solo evita mostrar una pantalla que la persona no va a poder usar.
 */
export const RequireModerator = ({ children }: RequireModeratorProps): React.JSX.Element => {
  const roles = useSession((state) => state.roles)

  if (!canModerateComments(roles)) {
    return (
      <Card title="Acceso denegado">
        <p role="alert" className="text-sm text-muted">
          Acceso denegado. Solo un Moderador, Administrador o Super Administrador puede acceder a la
          cola de moderación. El servicio también valida este permiso y rechazará la operación con
          estado 403.
        </p>
      </Card>
    )
  }

  return <>{children}</>
}
