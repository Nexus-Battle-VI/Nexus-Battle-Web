import { create } from 'zustand'

export interface SessionState {
  /** Identificador de la cuenta activa. `null` cuando no hay sesion. */
  readonly accountId: string | null
  readonly displayName: string | null
  signIn: (accountId: string, displayName: string) => void
  signOut: () => void
}

/**
 * Estado de sesion de la aplicacion.
 *
 * **Esto no es autenticacion.** Guarda quien dice ser la persona para que la
 * interfaz pueda operar, pero no verifica nada: no hay token, no hay firma y
 * el servidor no comprueba la identidad. La autenticacion real depende del
 * proveedor de identidad pendiente de aprobacion.
 *
 * Se mantiene deliberadamente en memoria y no en `localStorage`: persistir una
 * identidad no verificada daria la apariencia de una sesion que no existe.
 */
export const useSession = create<SessionState>((set) => ({
  accountId: null,
  displayName: null,
  signIn: (accountId, displayName) => {
    set({ accountId, displayName })
  },
  signOut: () => {
    set({ accountId: null, displayName: null })
  },
}))
