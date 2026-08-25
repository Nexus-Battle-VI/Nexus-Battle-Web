/**
 * Configuracion del proveedor de identidad.
 *
 * Nada de esto es secreto. En una aplicacion de navegador **todo lo que se
 * envia al cliente es publico**, y el identificador de un cliente publico de
 * OIDC esta pensado para viajar en la URL de inicio de sesion. Si aqui hiciera
 * falta un secreto, el diseno estaria mal: por eso el cliente se registra sin
 * secreto y el flujo es codigo de autorizacion con PKCE.
 */
export interface AuthConfig {
  /** Dominio del hosted UI del user pool, sin barra final. */
  readonly domain: string
  readonly clientId: string
  readonly redirectUri: string
  readonly logoutUri: string
  readonly scopes: readonly string[]
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

/**
 * Construye la configuracion a partir del entorno.
 *
 * Devuelve `null` cuando falta lo imprescindible, y ese `null` significa algo
 * concreto: **no hay proveedor de identidad**. La interfaz lo dice en lugar de
 * simular una sesion, que es lo que hacia antes.
 */
export const loadAuthConfig = (env: Record<string, string | undefined>): AuthConfig | null => {
  const domain = trimTrailingSlash(env.VITE_COGNITO_DOMAIN ?? '')
  const clientId = env.VITE_COGNITO_CLIENT_ID ?? ''

  if (domain === '' || clientId === '') {
    return null
  }

  // La aplicacion solo corre en navegador, asi que `location` siempre existe.
  // `VITE_APP_ORIGIN` la precede unicamente para poder fijarlo en pruebas.
  const origin = env.VITE_APP_ORIGIN ?? globalThis.location.origin

  return {
    domain,
    clientId,
    redirectUri: `${trimTrailingSlash(origin)}/auth/callback`,
    logoutUri: `${trimTrailingSlash(origin)}/`,
    // `openid` identifica; `email` y `profile` traen los datos que la interfaz
    // muestra. No se piden mas: un ambito de mas es permiso de mas.
    scopes: ['openid', 'email', 'profile'],
  }
}

export const authConfig: AuthConfig | null = loadAuthConfig(import.meta.env)
