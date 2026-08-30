import type { ReactNode } from 'react'
import { Navigate } from 'react-router'

import { useSession } from '@/shared/session'
import { ECOMMERCE_PATH } from '@/routes/routes'

export interface PublicOnlyRouteProps {
  readonly children: ReactNode
}

/**
 * Reverso de `RequireSession`: rutas que solo tienen sentido SIN sesion.
 *
 * Sin esta puerta, quien ya inicio sesion podria volver a `/login` con el
 * boton "atras" del navegador y ver de nuevo un formulario de credenciales
 * como si no estuviera identificado.
 */
export const PublicOnlyRoute = ({ children }: PublicOnlyRouteProps): React.JSX.Element => {
  const subject = useSession((state) => state.subject)

  if (subject !== null) {
    return <Navigate to={ECOMMERCE_PATH} replace />
  }

  return <>{children}</>
}
