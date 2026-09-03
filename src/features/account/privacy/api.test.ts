import { afterEach, describe, expect, it, vi } from 'vitest'

import { requestOwnAccountDeletion } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requestOwnAccountDeletion', () => {
  it('llama a POST /accounts/me/deletion-requests sin cuerpo y devuelve la solicitud', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'del-1',
          status: 'RECEIVED',
          receivedAt: '2026-09-03T12:00:00.000Z',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    vi.stubGlobal('fetch', fetchImpl)

    const result = await requestOwnAccountDeletion()

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/accounts/me/deletion-requests',
      expect.objectContaining({ method: 'POST' }),
    )

    // Sin cuerpo: la identidad la resuelve Account desde el testimonio, nunca
    // un identificador que esta funcion envie.
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBeUndefined()
    expect((init.headers as Record<string, string> | undefined)?.['content-type']).toBeUndefined()

    expect(result).toEqual({
      id: 'del-1',
      status: 'RECEIVED',
      receivedAt: '2026-09-03T12:00:00.000Z',
    })
  })
})
