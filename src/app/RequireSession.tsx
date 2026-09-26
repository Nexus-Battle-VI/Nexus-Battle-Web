import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useSession } from '@/shared/session'
import { SignInPrompt } from './SignInPrompt'

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
 *
 * No redirige a `/login`: se queda en la misma ruta que la persona intento
 * visitar y muestra ahi mismo la invitacion a identificarse. Redirigir
 * obligaria a que el primer contacto de cualquier visitante con un enlace
 * protegido fuera un formulario de credenciales; esta version deja claro por
 * que no puede continuar sin sacarla de donde estaba.
 */
export const RequireSession = ({ children }: RequireSessionProps): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  const { t } = useTranslation()

  if (subject === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 py-10 text-ink">
        <SignInPrompt description={t('app:signIn.required')} headingTag="h1" cancelHref="/" />
      </div>
    )
  }

  return <>{children}</>
}
