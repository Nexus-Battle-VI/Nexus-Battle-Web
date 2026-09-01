import { afterEach, describe, expect, it, vi } from 'vitest'

import { changeOwnPassword } from './passwordApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('changeOwnPassword', () => {
  it('envia POST /api/accounts/me/password con actual y nueva como JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchImpl)

    await changeOwnPassword({ currentPassword: 'Actual-1!', newPassword: 'Nueva-2!' })

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/accounts/me/password')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json')
    expect(JSON.parse(init.body as string)).toEqual({
      currentPassword: 'Actual-1!',
      newPassword: 'Nueva-2!',
    })
  })

  it('resuelve sin valor ante el 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))

    await expect(
      changeOwnPassword({ currentPassword: 'a', newPassword: 'b' }),
    ).resolves.toBeUndefined()
  })

  it('propaga el 400 de contrasena actual incorrecta con el mensaje del servicio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'La contrasena actual no es correcta.' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    await expect(
      changeOwnPassword({ currentPassword: 'mala', newPassword: 'Nueva-2!' }),
    ).rejects.toThrow('La contrasena actual no es correcta.')
  })
})
