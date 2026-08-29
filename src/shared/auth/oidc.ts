import type { AuthConfig } from './config'
import { deriveCodeChallenge, randomUrlSafeString, type PendingAuthorization } from './pkce'

/**
 * Flujo de codigo de autorizacion con PKCE contra el hosted UI de Cognito.
 *
 * No se usa el flujo implicito: devuelve los tokens en el fragmento de la URL,
 * donde quedan en el historial del navegador y en cualquier registro que
 * capture direcciones. Esta obsoleto para aplicaciones nuevas.
 */

export interface TokenSet {
  readonly accessToken: string
  readonly idToken: string
  readonly refreshToken: string | null
  readonly expiresAt: number
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export interface AuthorizationRequest {
  readonly url: string
  readonly pending: PendingAuthorization
}

/**
 * Que pantalla del proveedor abrir. **No cambia el flujo**: `/signup` admite
 * exactamente los mismos parametros que `/oauth2/authorize`, devuelve al mismo
 * `redirect_uri` y se canjea con el mismo verificador de PKCE.
 *
 * Existe porque la identidad se crea EN EL PROVEEDOR, no aqui. Account dejo de
 * crear identidades: exige un sujeto ya verificado y responde 401 sin el. Sin
 * una entrada de alta, la unica via para llegar a esa pantalla seria el enlace
 * "Sign up" que el proveedor pinta dentro de la de inicio de sesion, y quien
 * todavia no tiene cuenta no tiene por que adivinar que esta ahi dentro.
 */
export type AuthIntent = 'sign-in' | 'sign-up'

const AUTH_PATHS: Readonly<Record<AuthIntent, string>> = {
  'sign-in': '/oauth2/authorize',
  'sign-up': '/signup',
}

/** Prepara la redireccion al proveedor y el material que hay que conservar. */
export const buildAuthorizationRequest = async (
  config: AuthConfig,
  returnTo: string,
  intent: AuthIntent = 'sign-in',
  source: Crypto = globalThis.crypto,
): Promise<AuthorizationRequest> => {
  const verifier = randomUrlSafeString(32, source)
  const state = randomUrlSafeString(16, source)
  const challenge = await deriveCodeChallenge(verifier, source)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    // `state` no protege el canje: protege contra que alguien induzca a esta
    // pestana a completar un inicio de sesion que no pidio.
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  return {
    url: `${config.domain}${AUTH_PATHS[intent]}?${params.toString()}`,
    pending: { verifier, state, returnTo },
  }
}

interface TokenResponse {
  readonly access_token?: unknown
  readonly id_token?: unknown
  readonly refresh_token?: unknown
  readonly expires_in?: unknown
}

/**
 * Canjea el codigo por tokens.
 *
 * La peticion **no lleva secreto de cliente**: el cliente es publico y lo que
 * demuestra la legitimidad del canje es el verificador de PKCE.
 */
export const exchangeCodeForTokens = async (
  config: AuthConfig,
  code: string,
  verifier: string,
  fetchImpl: typeof fetch = globalThis.fetch,
  now: () => number = () => Date.now(),
): Promise<TokenSet> => {
  const response = await fetchImpl(`${config.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: config.redirectUri,
      code_verifier: verifier,
    }).toString(),
  })

  if (!response.ok) {
    // No se propaga el cuerpo del error del proveedor: puede distinguir entre
    // "codigo caducado" y "codigo invalido", que es informacion util para quien
    // este probando codigos.
    throw new AuthError('No se pudo completar el inicio de sesion.')
  }

  const body = (await response.json()) as TokenResponse

  if (typeof body.access_token !== 'string' || typeof body.id_token !== 'string') {
    throw new AuthError('La respuesta del proveedor de identidad no es utilizable.')
  }

  const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 0

  return {
    accessToken: body.access_token,
    idToken: body.id_token,
    refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token : null,
    expiresAt: now() + expiresIn * 1000,
  }
}

export interface IdentityClaims {
  readonly subject: string
  readonly email: string | null
  readonly displayName: string | null
  readonly roles: readonly string[]
}

/**
 * Lee los datos del token de identidad **para mostrarlos**, sin verificar firma.
 *
 * Y no verificarla aqui es correcto, no un atajo: **un navegador no puede
 * decidir si confia en si mismo**. La verificacion que importa la hace cada
 * servicio contra el JWKS del pool antes de atender la peticion. Lo que se lee
 * aqui solo alimenta la interfaz; si estuviera manipulado, el servidor
 * rechazaria igualmente la peticion.
 */
export const readIdentityClaims = (idToken: string): IdentityClaims | null => {
  const payload = idToken.split('.')[1]

  if (payload === undefined) {
    return null
  }

  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json) as Record<string, unknown>
    const subject = claims.sub

    if (typeof subject !== 'string') {
      return null
    }

    const groups = claims['cognito:groups']

    return {
      subject,
      email: typeof claims.email === 'string' ? claims.email : null,
      displayName: typeof claims.name === 'string' ? claims.name : null,
      roles: Array.isArray(groups) ? groups.filter((g): g is string => typeof g === 'string') : [],
    }
  } catch {
    return null
  }
}

/** Cierra la sesion tambien en el proveedor, no solo en esta pestana. */
export const buildLogoutUrl = (config: AuthConfig): string => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: config.logoutUri,
  })

  return `${config.domain}/logout?${params.toString()}`
}
