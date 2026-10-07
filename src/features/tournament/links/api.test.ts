import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'
import { tournamentLinksApi } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, roles: [], expiresAt: null })
})
describe('HU-82: cliente JWT y revisión', () => {
  it('usa HTTP real, codifica el torneo y envía ambos enlaces sin identidad elegida', async () => {
    useSession.setState({
      subject: 'admin',
      accessToken: 'qa-token',
      expiresAt: Date.now() + 60000,
    })
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(() => Promise.resolve(new Response('{}')))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    await tournamentLinksApi.view('T/1', signal)
    const body = { liveUrl: null, youtubeArchiveUrl: null, expectedRevision: 3 }
    await tournamentLinksApi.save('T/1', body)
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/tournaments/T%2F1/links', {
      method: 'GET',
      headers: { authorization: 'Bearer qa-token' },
      signal,
    })
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/tournaments/admin/T%2F1/links', {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { authorization: 'Bearer qa-token', 'content-type': 'application/json' },
    })
  })
  it('conserva el conflicto del servidor y no devuelve un éxito de sustitución', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'LINKS_CHANGED',
            message: 'Los enlaces cambiaron.',
          }),
          { status: 409 },
        ),
      ),
    )
    await expect(
      tournamentLinksApi.save('T1', {
        liveUrl: null,
        youtubeArchiveUrl: null,
        expectedRevision: 0,
      }),
    ).rejects.toMatchObject({
      status: 409,
      body: { code: 'LINKS_CHANGED' },
    } satisfies Partial<HttpError>)
  })
})
