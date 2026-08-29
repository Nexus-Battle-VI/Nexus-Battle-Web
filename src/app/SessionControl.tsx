import { useSession } from '@/shared/session'

/**
 * Control de sesion de la cabecera.
 *
 * Cuando no hay proveedor configurado **lo dice**, en lugar de ofrecer un boton
 * de iniciar sesion que no puede funcionar. Un control que no hace nada es peor
 * que su ausencia: sugiere que hay autenticacion donde no la hay.
 */
export const SessionControl = (): React.JSX.Element => {
  const available = useSession((state) => state.authenticationAvailable)
  const subject = useSession((state) => state.subject)
  const displayName = useSession((state) => state.displayName)
  const signIn = useSession((state) => state.signIn)
  const signUp = useSession((state) => state.signUp)
  const signOut = useSession((state) => state.signOut)

  if (!available) {
    return (
      <p className="ml-auto text-xs text-muted" data-testid="auth-unavailable">
        Sin proveedor de identidad: nadie verifica quien realiza las peticiones
      </p>
    )
  }

  if (subject === null) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-ink"
          data-testid="sign-up"
          onClick={() => {
            void signUp()
          }}
        >
          Crear cuenta
        </button>
        <button
          type="button"
          className="rounded-md bg-brand px-3 py-1.5 text-sm text-brand-ink"
          data-testid="sign-in"
          onClick={() => {
            void signIn()
          }}
        >
          Iniciar sesion
        </button>
      </div>
    )
  }

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="text-sm text-muted">{displayName ?? subject}</span>
      <button
        type="button"
        className="rounded-md border border-border px-3 py-1.5 text-sm text-ink"
        onClick={signOut}
      >
        Cerrar sesion
      </button>
    </div>
  )
}
