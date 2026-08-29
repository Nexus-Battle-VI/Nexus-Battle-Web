import { describe, expect, it, vi } from 'vitest'

import { loadAuthConfig, type AuthConfig } from './config'
import {
  deriveCodeChallenge,
  randomUrlSafeString,
  rememberPendingAuthorization,
  takePendingAuthorization,
} from './pkce'
import {
  AuthError,
  buildAuthorizationRequest,
  buildLogoutUrl,
  exchangeCodeForTokens,
  readIdentityClaims,
} from './oidc'

const CONFIG: AuthConfig = {
  domain: 'https://nexus-battles-vi.auth.us-east-1.amazoncognito.com',
  clientId: 'cliente-publico',
  redirectUri: 'https://app.test/auth/callback',
  logoutUri: 'https://app.test/',
  scopes: ['openid', 'email', 'profile'],
}

const memoryStorage = (): Storage => {
  const map = new Map<string, string>()

  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
    key: () => null,
    get length() {
      return map.size
    },
  }
}

describe('loadAuthConfig', () => {
  /**
   * Sin proveedor la aplicacion no debe fingir que hay sesion. Devolver `null`
   * es lo que permite a la interfaz decirlo en lugar de ofrecer un boton que no
   * puede funcionar.
   */
  it('devuelve null cuando falta el dominio o el cliente', () => {
    expect(loadAuthConfig({})).toBeNull()
    expect(loadAuthConfig({ VITE_COGNITO_DOMAIN: 'https://x.test' })).toBeNull()
    expect(loadAuthConfig({ VITE_COGNITO_CLIENT_ID: 'c' })).toBeNull()
  })

  it('construye las URL de retorno sobre el origen de la aplicacion', () => {
    const config = loadAuthConfig({
      VITE_COGNITO_DOMAIN: 'https://pool.test/',
      VITE_COGNITO_CLIENT_ID: 'cliente',
      VITE_APP_ORIGIN: 'https://app.test/',
    })

    expect(config).toEqual({
      domain: 'https://pool.test',
      clientId: 'cliente',
      redirectUri: 'https://app.test/auth/callback',
      logoutUri: 'https://app.test/',
      scopes: ['openid', 'email', 'profile'],
    })
  })

  it('no pide mas ambitos de los que la interfaz necesita', () => {
    const config = loadAuthConfig({
      VITE_COGNITO_DOMAIN: 'https://pool.test',
      VITE_COGNITO_CLIENT_ID: 'cliente',
      VITE_APP_ORIGIN: 'https://app.test',
    })

    expect(config?.scopes).toEqual(['openid', 'email', 'profile'])
  })
})

describe('PKCE', () => {
  /**
   * Vector de prueba del RFC 7636, seccion 4.6.
   *
   * Comprobar contra la especificacion y no contra la propia implementacion es
   * lo unico que detecta un error de codificacion: si el `base64url` estuviera
   * mal, el reto seguiria siendo "consistente" consigo mismo y el proveedor
   * rechazaria el canje en produccion sin que ninguna prueba lo advirtiera.
   */
  it('deriva el reto del verificador como manda el RFC 7636', async () => {
    await expect(deriveCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).resolves.toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    )
  })

  it('genera cadenas seguras en URL y distintas entre si', () => {
    const values = new Set(Array.from({ length: 20 }, () => randomUrlSafeString()))

    expect(values.size).toBe(20)

    for (const value of values) {
      expect(value).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })

  it('conserva el material pendiente a traves de la redireccion', () => {
    const storage = memoryStorage()
    rememberPendingAuthorization({ verifier: 'v', state: 's', returnTo: '/catalog' }, storage)

    expect(takePendingAuthorization(storage)).toEqual({
      verifier: 'v',
      state: 's',
      returnTo: '/catalog',
    })
  })

  /**
   * El verificador sirve UNA vez. Si sobreviviera a la lectura, un segundo
   * intento de canje encontraria con que firmarse.
   */
  it('descarta el material pendiente al leerlo', () => {
    const storage = memoryStorage()
    rememberPendingAuthorization({ verifier: 'v', state: 's', returnTo: '/' }, storage)

    takePendingAuthorization(storage)

    expect(takePendingAuthorization(storage)).toBeNull()
  })

  it('no se rompe con material corrupto', () => {
    const storage = memoryStorage()
    storage.setItem('nexus.auth.pending', 'esto no es json')

    expect(takePendingAuthorization(storage)).toBeNull()
  })
})

describe('buildAuthorizationRequest', () => {
  it('usa codigo de autorizacion con PKCE y S256', async () => {
    const { url, pending } = await buildAuthorizationRequest(CONFIG, '/orders')
    const params = new URL(url).searchParams

    expect(params.get('response_type')).toBe('code')
    expect(params.get('code_challenge_method')).toBe('S256')
    expect(params.get('client_id')).toBe('cliente-publico')
    expect(params.get('redirect_uri')).toBe('https://app.test/auth/callback')
    expect(pending.returnTo).toBe('/orders')
  })

  /**
   * El flujo implicito devuelve los tokens en el fragmento de la URL, donde
   * quedan en el historial y en cualquier registro que capture direcciones.
   */
  it('no usa el flujo implicito', async () => {
    const { url } = await buildAuthorizationRequest(CONFIG, '/')

    expect(new URL(url).searchParams.get('response_type')).not.toBe('token')
  })

  it('el reto enviado corresponde al verificador conservado', async () => {
    const { url, pending } = await buildAuthorizationRequest(CONFIG, '/')
    const challenge = new URL(url).searchParams.get('code_challenge')

    await expect(deriveCodeChallenge(pending.verifier)).resolves.toBe(challenge)
  })

  it('el estado enviado corresponde al conservado', async () => {
    const { url, pending } = await buildAuthorizationRequest(CONFIG, '/')

    expect(new URL(url).searchParams.get('state')).toBe(pending.state)
  })

  it('sin intencion explicita lleva a iniciar sesion', async () => {
    const { url } = await buildAuthorizationRequest(CONFIG, '/')

    expect(new URL(url).pathname).toBe('/oauth2/authorize')
  })

  it('el alta lleva a la pantalla de registro del proveedor', async () => {
    const { url } = await buildAuthorizationRequest(CONFIG, '/', 'sign-up')

    expect(new URL(url).pathname).toBe('/signup')
  })

  /**
   * Lo que se comprueba aqui no es la ruta, es que cambiarla no degrada nada.
   * Un endpoint distinto es la clase de cambio en la que se pierde en silencio
   * el reto de PKCE y el flujo sigue pareciendo que funciona.
   */
  it('el alta conserva PKCE, el estado y el destino de retorno', async () => {
    const { url, pending } = await buildAuthorizationRequest(CONFIG, '/orders', 'sign-up')
    const params = new URL(url).searchParams

    expect(params.get('response_type')).toBe('code')
    expect(params.get('code_challenge_method')).toBe('S256')
    expect(params.get('state')).toBe(pending.state)
    expect(params.get('redirect_uri')).toBe('https://app.test/auth/callback')
    expect(pending.returnTo).toBe('/orders')
    await expect(deriveCodeChallenge(pending.verifier)).resolves.toBe(params.get('code_challenge'))
  })

  it('entrar y darse de alta piden lo mismo salvo la pantalla', async () => {
    const entrar = new URL((await buildAuthorizationRequest(CONFIG, '/', 'sign-in')).url)
    const alta = new URL((await buildAuthorizationRequest(CONFIG, '/', 'sign-up')).url)

    const salvoLoIrrepetible = (u: URL): Record<string, string> => {
      const p = Object.fromEntries(u.searchParams)
      // `state` y el reto se derivan de material aleatorio nuevo en cada
      // llamada: compararlos probaria que el generador funciona, no que las
      // dos pantallas reciben la misma peticion.
      delete p.state
      delete p.code_challenge
      return p
    }

    expect(salvoLoIrrepetible(alta)).toEqual(salvoLoIrrepetible(entrar))
    expect(alta.origin).toBe(entrar.origin)
    expect(alta.pathname).not.toBe(entrar.pathname)
  })
})

describe('exchangeCodeForTokens', () => {
  const okResponse = (body: unknown): Response =>
    ({ ok: true, json: () => Promise.resolve(body) }) as Response

  it('presenta el verificador y NO envia secreto de cliente', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      okResponse({
        access_token: 'acceso',
        id_token: 'identidad',
        refresh_token: 'refresco',
        expires_in: 900,
      }),
    )

    await exchangeCodeForTokens(CONFIG, 'codigo', 'verificador', fetchImpl, () => 1_000)

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    const body = new URLSearchParams(init.body as string)

    expect(url).toBe(`${CONFIG.domain}/oauth2/token`)
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code_verifier')).toBe('verificador')
    // Un secreto embebido en el navegador no es un secreto. Enviarlo aqui
    // significaria que esta en el paquete servido al cliente.
    expect(body.get('client_secret')).toBeNull()
  })

  it('calcula el instante de caducidad a partir de expires_in', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        okResponse({ access_token: 'a', id_token: 'i', expires_in: 900, refresh_token: null }),
      )

    const tokens = await exchangeCodeForTokens(CONFIG, 'c', 'v', fetchImpl, () => 1_000)

    expect(tokens.expiresAt).toBe(1_000 + 900_000)
    expect(tokens.refreshToken).toBeNull()
  })

  /**
   * Distinguir "codigo caducado" de "codigo invalido" es informacion util para
   * quien este probando codigos, asi que el detalle del proveedor no se propaga.
   */
  it('no propaga el detalle del error del proveedor', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    })

    await expect(exchangeCodeForTokens(CONFIG, 'c', 'v', fetchImpl)).rejects.toBeInstanceOf(
      AuthError,
    )
  })

  it('rechaza una respuesta sin los tokens esperados', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ access_token: 'solo-uno' }))

    await expect(exchangeCodeForTokens(CONFIG, 'c', 'v', fetchImpl)).rejects.toBeInstanceOf(
      AuthError,
    )
  })
})

describe('readIdentityClaims', () => {
  const encode = (payload: Record<string, unknown>): string =>
    `cabecera.${btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.firma`

  it('lee el sujeto, el correo y los grupos', () => {
    const claims = readIdentityClaims(
      encode({
        sub: 'sujeto-ana',
        email: 'ana@nexus.test',
        name: 'Ana Ramirez',
        'cognito:groups': ['PLAYER', 'MODERATOR'],
      }),
    )

    expect(claims).toEqual({
      subject: 'sujeto-ana',
      email: 'ana@nexus.test',
      displayName: 'Ana Ramirez',
      roles: ['PLAYER', 'MODERATOR'],
    })
  })

  it('devuelve null sin sujeto, que es el unico dato imprescindible', () => {
    expect(readIdentityClaims(encode({ email: 'a@b.test' }))).toBeNull()
  })

  it.each([['no-es-un-jwt'], ['a.no-es-base64-valido!.c']])(
    'devuelve null ante un token ilegible (%s)',
    (token) => {
      expect(readIdentityClaims(token)).toBeNull()
    },
  )
})

describe('buildLogoutUrl', () => {
  /**
   * Limpiar solo esta pestana dejaria la sesion viva en el proveedor: el
   * siguiente inicio de sesion no pediria credenciales y pareceria que cerrar
   * sesion no hizo nada.
   */
  it('cierra la sesion tambien en el proveedor', () => {
    const params = new URL(buildLogoutUrl(CONFIG)).searchParams

    expect(params.get('client_id')).toBe('cliente-publico')
    expect(params.get('logout_uri')).toBe('https://app.test/')
  })
})
