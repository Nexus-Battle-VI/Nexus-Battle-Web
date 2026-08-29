import { create } from 'zustand'

import { authConfig } from './auth/config'
import {
  buildAuthorizationRequest,
  buildLogoutUrl,
  type AuthIntent,
  readIdentityClaims,
  type IdentityClaims,
  type TokenSet,
} from './auth/oidc'
import { rememberPendingAuthorization } from './auth/pkce'

export interface SessionState {
  /** Sujeto verificado por el proveedor. `null` cuando no hay sesion. */
  readonly subject: string | null
  readonly email: string | null
  readonly displayName: string | null
  readonly roles: readonly string[]
  readonly accessToken: string | null
  readonly expiresAt: number | null

  /** Falso cuando no hay proveedor configurado: no hay sesion posible. */
  readonly authenticationAvailable: boolean

  /** Inicia el flujo de codigo de autorizacion con PKCE. */
  signIn: (returnTo?: string) => Promise<void>
  /**
   * Lleva a la pantalla de alta del proveedor. Mismo flujo que `signIn`: lo
   * unico distinto es en que pantalla del proveedor aterriza la persona.
   */
  signUp: (returnTo?: string) => Promise<void>
  /** Registra el resultado de un canje completado. */
  establish: (tokens: TokenSet, claims: IdentityClaims) => void
  /** Cierra la sesion aqui y en el proveedor. */
  signOut: () => void
}

/**
 * Un unico camino hacia el proveedor para las dos intenciones.
 *
 * Entrar y darse de alta comparten verificador, estado y destino de retorno: si
 * fueran dos funciones separadas, cualquier correccion al flujo tendria que
 * aplicarse dos veces y una de las dos se quedaria atras.
 */
const comenzarAutorizacion = async (intent: AuthIntent, returnTo: string): Promise<void> => {
  if (authConfig === null) {
    return
  }

  const { url, pending } = await buildAuthorizationRequest(authConfig, returnTo, intent)

  rememberPendingAuthorization(pending)
  globalThis.location.assign(url)
}

/**
 * Estado de sesion de la aplicacion.
 *
 * **Ahora si es autenticacion.** La identidad procede de un testimonio firmado
 * por el proveedor, y cada servicio lo verifica contra el JWKS del pool antes
 * de atender la peticion. La version anterior de este fichero guardaba lo que
 * la persona decia ser, sin comprobar nada.
 *
 * Los tokens se mantienen **en memoria y no en `localStorage`**. Es una
 * decision con contrapartida y conviene decirla entera: recargar la pagina
 * obliga a volver a iniciar sesion. A cambio, un script inyectado no encuentra
 * ninguna credencial que robar, y el token de refresco —el de vida larga— no
 * llega a tocar disco.
 */
export const useSession = create<SessionState>((set, get) => ({
  subject: null,
  email: null,
  displayName: null,
  roles: [],
  accessToken: null,
  expiresAt: null,
  authenticationAvailable: authConfig !== null,

  signIn: async (returnTo = globalThis.location.pathname) => {
    await comenzarAutorizacion('sign-in', returnTo)
  },

  signUp: async (returnTo = globalThis.location.pathname) => {
    await comenzarAutorizacion('sign-up', returnTo)
  },

  establish: (tokens, claims) => {
    set({
      subject: claims.subject,
      email: claims.email,
      displayName: claims.displayName ?? claims.email,
      roles: claims.roles,
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
    })
  },

  signOut: () => {
    const hadSession = get().accessToken !== null

    set({
      subject: null,
      email: null,
      displayName: null,
      roles: [],
      accessToken: null,
      expiresAt: null,
    })

    // Limpiar solo esta pestana dejaria la sesion viva en el proveedor: el
    // siguiente inicio de sesion no pediria credenciales y pareceria que
    // "cerrar sesion" no hizo nada.
    if (hadSession && authConfig !== null) {
      globalThis.location.assign(buildLogoutUrl(authConfig))
    }
  },
}))

/**
 * Token vigente para las peticiones salientes.
 *
 * Devuelve `null` si ha caducado en lugar de enviarlo igualmente: mandar un
 * token vencido produce un 401 que parece un fallo de permisos cuando en
 * realidad es una sesion que expiro.
 */
export const currentAccessToken = (now: number = Date.now()): string | null => {
  const { accessToken, expiresAt } = useSession.getState()

  if (accessToken === null) {
    return null
  }

  return expiresAt !== null && expiresAt <= now ? null : accessToken
}

export { readIdentityClaims }
