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
      <Card
        title="Cola de moderación"
        className="mx-auto max-w-[380px] border-transparent px-5 py-6"
      >
        <div className="flex flex-col items-center px-2 py-8 text-center">
          <div
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-full bg-danger/10 text-danger"
          >
            <span className="text-[22px] leading-none">🔒</span>
          </div>
          <h3 role="alert" className="mt-3 text-sm font-semibold text-ink">
            No tienes permisos para acceder
          </h3>
          <p className="mt-2 max-w-xs text-xs text-muted">
            Esta sección está disponible solo para roles Moderador, Administrador o
            SuperAdministrador.
          </p>
        </div>
      </Card>
    )
  }

  return <>{children}</>
}
