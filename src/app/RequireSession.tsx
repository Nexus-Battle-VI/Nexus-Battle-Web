import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useSession } from '@/shared/session'

export interface RequireSessionProps {
  readonly children: ReactNode
}

const CTA_CLASS =
  'inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

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

  if (subject === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 py-10 text-ink">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-semibold text-ink">Para continuar</h1>
          <p className="mt-2 text-sm text-muted">Necesitas iniciar sesión o crear una cuenta.</p>

          <div className="mt-6 flex flex-col gap-3">
            <Link to="/login" className={`${CTA_CLASS} bg-brand text-brand-ink`}>
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className={`${CTA_CLASS} border border-border bg-surface-raised text-ink`}
            >
              Crear cuenta
            </Link>
          </div>

          <Link to="/" className="mt-4 inline-block text-sm text-muted underline">
            Cancelar
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
