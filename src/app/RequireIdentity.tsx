import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useSession } from '@/shared/session'
import { NEXUS_DARK_THEME } from '@/shared/publicAuthTheme'

export interface RequireIdentityProps {
  readonly children: ReactNode
}

const CTA_CLASS =
  'inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

/**
 * Puerta del formulario de registro (HU-01).
 *
 * A diferencia de `RequireSession`, esto NO es presentacion: sin identidad el
 * formulario **no puede funcionar**. `POST /api/accounts` exige un testimonio
 * verificado y responde 401 sin el, porque la identidad existe ANTES que la
 * cuenta (ADR-004). Quien llegaba aqui sin sesion rellenaba nombres,
 * apellidos, apodo, contrasena, avatar y cuatro preguntas de seguridad para
 * recibir al final "Falta el testimonio de identidad".
 *
 * Ocurrio de verdad: el boton "Crear cuenta" de la landing era un enlace
 * directo a esta ruta, saltandose el alta en el proveedor.
 *
 * No se redirige en silencio al proveedor. El alta son dos pasos y conviene
 * decirlo: quien pulsa "Crear cuenta" y aterriza sin aviso en una pantalla
 * ajena, en ingles y pidiendo otra vez un correo, no entiende que le paso.
 */
export const RequireIdentity = ({ children }: RequireIdentityProps): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  const authenticationAvailable = useSession((state) => state.authenticationAvailable)
  const signUp = useSession((state) => state.signUp)

  if (subject !== null) {
    return <>{children}</>
  }

  /**
   * Sin proveedor configurado no hay identidad posible, y ofrecer un boton que
   * no puede funcionar seria peor que no ofrecerlo. Es el mismo criterio que
   * `SessionControl` aplica en la cabecera.
   */
  if (!authenticationAvailable) {
    return (
      <div
        style={NEXUS_DARK_THEME}
        className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10 text-ink"
      >
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-semibold text-ink">No se puede crear la cuenta</h1>
          <p className="mt-2 text-sm text-muted">
            Esta versión no tiene proveedor de identidad configurado, y el registro lo necesita.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm text-muted underline">
            Volver al menú
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      style={NEXUS_DARK_THEME}
      className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10 text-ink"
    >
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-ink">Primero, tu identidad</h1>
        <p className="mt-2 text-sm text-muted">
          Crear tu cuenta son dos pasos. El primero es registrar tu correo y tu contraseña con
          nuestro proveedor de identidad; al volver completarás tus datos de jugador.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            data-testid="start-identity-sign-up"
            className={`${CTA_CLASS} bg-brand text-brand-ink`}
            onClick={() => {
              // Vuelve AQUI, con la sesion establecida. Es lo que hace que el
              // formulario tenga testimonio cuando se envie.
              void signUp('/register')
            }}
          >
            Continuar
          </button>
          <Link
            to="/login"
            className={`${CTA_CLASS} border border-border bg-surface-raised text-ink`}
          >
            Ya tengo cuenta
          </Link>
        </div>

        <Link to="/" className="mt-4 inline-block text-sm text-muted underline">
          Volver al menú
        </Link>
      </div>
    </div>
  )
}
