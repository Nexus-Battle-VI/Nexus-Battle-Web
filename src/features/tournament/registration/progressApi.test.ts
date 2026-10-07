import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/shared/session'
import { progressApi } from './progressApi'

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, roles: [], accessToken: null, expiresAt: null })
})
describe('HU-80: lectura de la proyección autoritativa', () => {
  it('consulta con JWT y cancelación; un torneo inicial no inventa campeón', async () => {
    useSession.setState({
      subject: 'player',
      accessToken: 'qa-token',
      expiresAt: Date.now() + 60000,
    })
    const view = { bracket: null, champion: null, eliminatedTeamIds: [] }
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(view)))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    expect(await progressApi.view('T/1', signal)).toEqual(view)
    expect(fetch).toHaveBeenCalledWith('/api/v1/tournaments/T%2F1/progress', {
      method: 'GET',
      headers: { authorization: 'Bearer qa-token' },
      signal,
    })
  })
  it('rechaza una proyección ajena y la indisponibilidad permanece como error', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ bracket: { tournamentId: 'T2' } })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'DEPENDENCY_UNAVAILABLE' }), { status: 503 }),
      )
    vi.stubGlobal('fetch', fetch)
    await expect(progressApi.view('T1')).rejects.toThrow('otro torneo')
    await expect(progressApi.view('T1')).rejects.toMatchObject({ status: 503 })
  })
})
