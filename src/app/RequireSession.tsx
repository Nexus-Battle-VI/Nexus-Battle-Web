import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { useSession } from '@/shared/session'

export interface RequireSessionProps {
  readonly children: ReactNode
}

/**
 * Puerta visual de las rutas que solo tienen sentido con sesion.
 *
 * Es presentacion, no seguridad: HU-02 es explicita en que ocultar una ruta en
 * el cliente no sustituye la autorizacion real, que cada servicio debe seguir
 * validando contra el testimonio. Lo que evita esta puerta es la experiencia
 * contraria y confusa de mostrar el shell autenticado —navegacion, avatar,
 * "Mi Cuenta"— a quien no ha iniciado sesion.
 */
export const RequireSession = ({ children }: RequireSessionProps): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  const location = useLocation()

  if (subject === null) {
    return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />
  }

  return <>{children}</>
}
