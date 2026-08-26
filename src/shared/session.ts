import { create } from 'zustand'

import { authConfig } from './auth/config'
import {
  buildAuthorizationRequest,
  buildLogoutUrl,
  readIdentityClaims,
  type IdentityClaims,
  type TokenSet,
} from './auth/oidc'
import { rememberPendingAuthorization } from './auth/pkce'

export interface EstablishedSession {
  readonly subject: string
  readonly email: string | null
  readonly displayName: string | null
  readonly roles: readonly string[]
  readonly accessToken: string
  readonly expiresAt: number
}

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

  /**
   * Si la sesion vigente se establecio mediante la redireccion al proveedor
   * (HU-02 (OIDC)) o mediante el formulario de credenciales (HU-02, login
   * directo).
   *
   * `signOut` lo necesita: cerrar sesion de una sesion de credenciales
   * redirigiendo al `/logout` del hosted UI cerraria una sesion de Cognito que
   * nunca se abrio.
   */
  readonly viaProvider: boolean

  /** Inicia el flujo de codigo de autorizacion con PKCE. */
  signIn: (returnTo?: string) => Promise<void>
  /** Registra el resultado de un canje completado contra el proveedor. */
  establish: (tokens: TokenSet, claims: IdentityClaims) => void
  /**
   * Registra una sesion resuelta por el formulario de login de credenciales
   * (correo/apodo + contrasena), una vez el servicio de cuenta la autentica.
   *
   * No pasa por `establish` porque esa funcion espera la forma concreta de un
   * canje OIDC (`TokenSet` + `IdentityClaims` leidos de un `id_token`); esta
   * via no tiene ese testimonio, tiene la sesion ya resuelta por el backend.
   */
  establishSession: (session: EstablishedSession) => void
  /** Cierra la sesion aqui y, si corresponde, en el proveedor. */
  signOut: () => void
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
  viaProvider: false,

  signIn: async (returnTo = globalThis.location.pathname) => {
    if (authConfig === null) {
      return
    }

    const { url, pending } = await buildAuthorizationRequest(authConfig, returnTo)

    rememberPendingAuthorization(pending)
    globalThis.location.assign(url)
  },

  establish: (tokens, claims) => {
    set({
      subject: claims.subject,
      email: claims.email,
      displayName: claims.displayName ?? claims.email,
      roles: claims.roles,
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      viaProvider: true,
    })
  },

  establishSession: (session) => {
    set({
      subject: session.subject,
      email: session.email,
      displayName: session.displayName ?? session.email,
      roles: session.roles,
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      viaProvider: false,
    })
  },

  signOut: () => {
    const { accessToken, viaProvider } = get()
    const hadSession = accessToken !== null

    set({
      subject: null,
      email: null,
      displayName: null,
      roles: [],
      accessToken: null,
      expiresAt: null,
      viaProvider: false,
    })

    // Limpiar solo esta pestana dejaria la sesion viva en el proveedor: el
    // siguiente inicio de sesion no pediria credenciales y pareceria que
    // "cerrar sesion" no hizo nada. Pero eso solo aplica a una sesion que
    // realmente paso por el proveedor: redirigir al logout del hosted UI para
    // una sesion de credenciales cerraria una sesion de Cognito que nunca se
    // abrio.
    if (hadSession && viaProvider && authConfig !== null) {
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
