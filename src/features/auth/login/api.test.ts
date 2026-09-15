import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { login, completeSecondFactor, refreshSession } from './api'

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const stubFetch = (response: Response | (() => Response)): ReturnType<typeof vi.fn> => {
  const fetchImpl = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(typeof response === 'function' ? response() : response),
    )

  vi.stubGlobal('fetch', fetchImpl)

  return fetchImpl
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('login', () => {
  it('llama a POST /api/sessions con identifier y password, sin conocer el host de Account', async () => {
    const fetchImpl = stubFetch(
      jsonResponse(200, {
        status: 'AUTHENTICATED',
        accessToken: 'token-de-sesion',
        expiresIn: 3600,
        account: {
          id: 'acc-1',
          subject: 'sub-cognito-1',
          email: 'ana@nexus.test',
          displayName: 'Ana',
          roles: ['PLAYER'],
        },
      }),
    )

    await login({ identifier: 'ana@nexus.test', password: 'Nexus#2026' })

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('/api/sessions')
    expect(url).not.toMatch(/^https?:\/\//u)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      identifier: 'ana@nexus.test',
      password: 'Nexus#2026',
    })
  })

  it('acepta un identifier con formato de correo', async () => {
    stubFetch(
      jsonResponse(200, {
        status: 'AUTHENTICATED',
        accessToken: 't',
        expiresIn: 3600,
        account: {
          id: 'acc-1',
          subject: 'sub-1',
          email: 'ana@nexus.test',
          displayName: 'Ana',
          roles: ['PLAYER'],
        },
      }),
    )

    const outcome = await login({ identifier: 'ana@nexus.test', password: 'x' })

    expect(outcome.status).toBe('AUTHENTICATED')
  })

  it('acepta un identifier de apodo, sin formato de correo', async () => {
    stubFetch(
      jsonResponse(200, {
        status: 'AUTHENTICATED',
        accessToken: 't',
        expiresIn: 3600,
        account: {
          id: 'acc-1',
          subject: 'sub-1',
          email: 'ana@nexus.test',
          displayName: 'Ana',
          roles: ['PLAYER'],
        },
      }),
    )

    const outcome = await login({ identifier: 'ana-guerrera', password: 'x' })

    expect(outcome.status).toBe('AUTHENTICATED')
  })

  it('traduce AUTHENTICATED usando account.subject como subject de la sesion, no account.id', async () => {
    stubFetch(
      jsonResponse(200, {
        status: 'AUTHENTICATED',
        accessToken: 'token-de-sesion',
        expiresIn: 3600,
        account: {
          // Deliberadamente distintos: son dos identificadores con proposito
          // distinto (UUID interno de Account vs. `sub` de Cognito), y esta
          // prueba falla si algun dia vuelven a conflate-arse.
          id: 'acc-uuid-interno-1',
          subject: 'sub-cognito-real-1',
          email: 'ana@nexus.test',
          displayName: 'Ana',
          roles: ['PLAYER', 'MODERATOR'],
        },
      }),
    )

    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)

    const outcome = await login({ identifier: 'ana@nexus.test', password: 'x' })

    expect(outcome.status).toBe('AUTHENTICATED')
    if (outcome.status !== 'AUTHENTICATED') return

    expect(outcome.session.subject).toBe('sub-cognito-real-1')
    expect(outcome.session.subject).not.toBe('acc-uuid-interno-1')
    expect(outcome).toEqual({
      status: 'AUTHENTICATED',
      session: {
        subject: 'sub-cognito-real-1',
        email: 'ana@nexus.test',
        displayName: 'Ana',
        roles: ['PLAYER', 'MODERATOR'],
        accessToken: 'token-de-sesion',
        expiresAt: 1_000_000 + 3_600_000,
      },
    })
  })

  it('calcula expiresAt como ahora + expiresIn (segundos) en milisegundos, con reloj controlado', async () => {
    stubFetch(
      jsonResponse(200, {
        status: 'AUTHENTICATED',
        accessToken: 'token-de-sesion',
        expiresIn: 3600,
        account: {
          id: 'acc-1',
          subject: 'sub-1',
          email: 'ana@nexus.test',
          displayName: 'Ana',
          roles: ['PLAYER'],
        },
      }),
    )

    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)

    const outcome = await login({ identifier: 'ana@nexus.test', password: 'x' })

    expect(outcome.status).toBe('AUTHENTICATED')
    if (outcome.status !== 'AUTHENTICATED') return

    expect(outcome.session.expiresAt).toBe(1_000_000 + 3_600_000)
  })

  it('traduce SECOND_FACTOR_REQUIRED sin establecer sesion', async () => {
    stubFetch(jsonResponse(200, { status: 'SECOND_FACTOR_REQUIRED', challengeToken: 'reto-1' }))

    const outcome = await login({ identifier: 'admin@nexus.test', password: 'x' })

    expect(outcome).toEqual({ status: 'SECOND_FACTOR_REQUIRED', challengeToken: 'reto-1' })
  })

  it('rechaza con HttpError 401 ante credenciales invalidas, sin distinguir el motivo', async () => {
    stubFetch(jsonResponse(401, { message: 'Las credenciales no son validas.' }))

    const error: unknown = await login({ identifier: 'ana@nexus.test', password: 'mala' }).catch(
      (reason: unknown) => reason,
    )

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).isUnauthorized).toBe(true)
  })

  it('rechaza con HttpError cuando el proveedor no esta disponible (503)', async () => {
    stubFetch(jsonResponse(503, { message: 'El proveedor de identidad no esta disponible.' }))

    const error: unknown = await login({ identifier: 'ana@nexus.test', password: 'x' }).catch(
      (reason: unknown) => reason,
    )

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).isUnauthorized).toBe(false)
  })

  it('falla explicitamente si el servicio dice AUTHENTICATED sin accessToken/account', async () => {
    stubFetch(jsonResponse(200, { status: 'AUTHENTICATED' }))

    await expect(login({ identifier: 'ana@nexus.test', password: 'x' })).rejects.toThrow(
      /no trae los datos esperados/u,
    )
  })

  it('falla explicitamente si el servicio dice AUTHENTICATED sin expiresIn', async () => {
    stubFetch(
      jsonResponse(200, {
        status: 'AUTHENTICATED',
        accessToken: 'token-de-sesion',
        account: {
          id: 'acc-1',
          subject: 'sub-1',
          email: 'ana@nexus.test',
          displayName: 'Ana',
          roles: ['PLAYER'],
        },
      }),
    )

    await expect(login({ identifier: 'ana@nexus.test', password: 'x' })).rejects.toThrow(
      /no trae los datos esperados/u,
    )
  })

  it('falla explicitamente si el servicio dice SECOND_FACTOR_REQUIRED sin challengeToken', async () => {
    stubFetch(jsonResponse(200, { status: 'SECOND_FACTOR_REQUIRED' }))

    await expect(login({ identifier: 'admin@nexus.test', password: 'x' })).rejects.toThrow(
      /challengeToken/u,
    )
  })
})

describe('completeSecondFactor', () => {
  it('llama a POST /api/sessions/second-factor con identifier, challengeToken y code', async () => {
    const fetchImpl = stubFetch(
      jsonResponse(200, {
        status: 'AUTHENTICATED',
        accessToken: 'token-admin',
        expiresIn: 3600,
        account: {
          id: 'acc-admin',
          subject: 'sub-admin',
          email: 'admin@nexus.test',
          displayName: 'Admin',
          roles: ['ADMINISTRATOR'],
        },
      }),
    )

    await completeSecondFactor('admin@nexus.test', 'reto-1', '123456')

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('/api/sessions/second-factor')
    expect(JSON.parse(init.body as string)).toEqual({
      identifier: 'admin@nexus.test',
      challengeToken: 'reto-1',
      code: '123456',
    })
    // Nunca viaja una contrasena en este paso: el DTO de Account no la
    // define, y esta funcion no la acepta como parametro.
    expect(init.body).not.toMatch(/password/iu)
  })

  it('rechaza con HttpError 401 ante un codigo invalido o expirado', async () => {
    stubFetch(jsonResponse(401, { message: 'El segundo factor no es valido o ha expirado.' }))

    const error: unknown = await completeSecondFactor('admin@nexus.test', 'reto-1', '000000').catch(
      (reason: unknown) => reason,
    )

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).isUnauthorized).toBe(true)
  })

  it('completa la sesion administrativa usando account.subject cuando el codigo es valido', async () => {
    stubFetch(
      jsonResponse(200, {
        status: 'AUTHENTICATED',
        accessToken: 'token-admin',
        expiresIn: 3600,
        account: {
          id: 'acc-uuid-admin',
          subject: 'sub-cognito-admin',
          email: 'admin@nexus.test',
          displayName: 'Admin',
          roles: ['ADMINISTRATOR'],
        },
      }),
    )

    vi.useFakeTimers()
    vi.setSystemTime(2_000_000)

    const outcome = await completeSecondFactor('admin@nexus.test', 'reto-1', '123456')

    expect(outcome.status).toBe('AUTHENTICATED')
    if (outcome.status !== 'AUTHENTICATED') return

    expect(outcome.session.subject).toBe('sub-cognito-admin')
    expect(outcome.session.expiresAt).toBe(2_000_000 + 3_600_000)
  })
})

describe('refreshSession', () => {
  it('llama a POST /api/sessions/refresh sin cuerpo, la cookie viaja sola', async () => {
    const fetchImpl = stubFetch(
      jsonResponse(200, {
        status: 'AUTHENTICATED',
        accessToken: 'token-renovado',
        expiresIn: 900,
        account: {
          id: 'acc-1',
          subject: 'sub-1',
          email: 'ana@nexus.test',
          displayName: 'Ana',
          roles: ['PLAYER'],
        },
      }),
    )

    await refreshSession()

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('/api/sessions/refresh')
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
  })

  it('devuelve la sesion restablecida cuando Account renueva el testimonio', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)

    stubFetch(
      jsonResponse(200, {
        status: 'AUTHENTICATED',
        accessToken: 'token-renovado',
        expiresIn: 900,
        account: {
          id: 'acc-1',
          subject: 'sub-cognito-1',
          email: 'ana@nexus.test',
          displayName: 'Ana',
          roles: ['PLAYER'],
        },
      }),
    )

    const session = await refreshSession()

    expect(session).toEqual({
      subject: 'sub-cognito-1',
      email: 'ana@nexus.test',
      displayName: 'Ana',
      roles: ['PLAYER'],
      accessToken: 'token-renovado',
      expiresAt: 1_000_000 + 900_000,
    })
  })

  /**
   * Sin cookie que renovar, Account responde 401 (vease sessions.controller.ts).
   * No es un error que la aplicacion deba mostrar: es "todavia no ha iniciado
   * sesion", el mismo estado que si nunca hubiera existido una cookie.
   */
  it('devuelve null sin lanzar cuando no hay sesion que renovar (401)', async () => {
    stubFetch(jsonResponse(401, { message: 'No hay una sesion que renovar.' }))

    const session = await refreshSession()

    expect(session).toBeNull()
  })

  it('devuelve null sin lanzar cuando el proveedor de identidad no esta disponible (503)', async () => {
    stubFetch(jsonResponse(503, { message: 'El proveedor de identidad no esta disponible.' }))

    const session = await refreshSession()

    expect(session).toBeNull()
  })

  it('devuelve null sin lanzar ante un fallo de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const session = await refreshSession()

    expect(session).toBeNull()
  })
})
