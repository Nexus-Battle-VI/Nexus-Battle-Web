import { useSession } from '@/shared/session'
import { primaryRole, roleLabel } from '@/shared/rbac'

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
  const roles = useSession((state) => state.roles)
  const signIn = useSession((state) => state.signIn)
  const signOut = useSession((state) => state.signOut)
  const role = primaryRole(roles)

  if (!available) {
    return (
      <p className="ml-auto text-xs text-muted" data-testid="auth-unavailable">
        Sin proveedor de identidad: nadie verifica quien realiza las peticiones
      </p>
    )
  }

  if (subject === null) {
    return (
      <button
        type="button"
        className="ml-auto rounded-md bg-brand px-3 py-1.5 text-sm text-brand-ink"
        onClick={() => {
          void signIn()
        }}
      >
        Iniciar sesion
      </button>
    )
  }

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="text-sm text-muted">
        {displayName ?? subject}
        {/*
          El rol se representa aqui porque es informacion de la sesion, no una
          eleccion: HU-02 exige que la interfaz muestre el rol vigente sin que
          nadie pueda seleccionarlo. Ocultar este dato no seria mas seguro,
          asi que no hay razon para no mostrarlo.
        */}
        {role !== null && (
          <span className="ml-1.5 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
            {roleLabel(role)}
          </span>
        )}
      </span>
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
