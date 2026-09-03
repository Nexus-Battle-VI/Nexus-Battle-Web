import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'
import { useSession } from '@/shared/session'

const ADMINISTRATIVE = new Set(['ADMINISTRATOR', 'SUPER_ADMINISTRATOR'])

export interface RequireAdministratorProps {
  readonly children: ReactNode
}

/**
 * Puerta de presentacion para el catalogo administrativo (HU-33).
 *
 * NO AUTORIZA NADA. Catalog valida el testimonio y responde 403 aunque alguien
 * escriba la URL a mano; esto solo evita mostrar un formulario que la persona
 * no va a poder enviar. Un `if` sobre el rol en el navegador no es un control
 * de seguridad, y tratarlo como tal seria peor que no tenerlo.
 *
 * Acepta los DOS roles administrativos. La jerarquia se resuelve aqui igual
 * que en el guard de los servicios: un Super Administrador satisface lo que se
 * pide a un Administrador, nunca al reves.
 */
export const RequireAdministrator = ({
  children,
}: RequireAdministratorProps): React.JSX.Element => {
  const roles = useSession((state) => state.roles)

  if (!roles.some((role) => ADMINISTRATIVE.has(role))) {
    return (
      <Card title="Acceso denegado">
        <p role="alert" className="text-sm text-muted">
          Solo un Administrador o Super Administrador puede gestionar el catálogo. El servicio
          también valida este permiso y rechazará la operación con estado 403.
        </p>
      </Card>
    )
  }

  return <>{children}</>
}
