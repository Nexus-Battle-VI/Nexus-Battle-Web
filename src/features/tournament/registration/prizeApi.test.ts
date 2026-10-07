import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/shared/session'
import { prizeApi } from './prizeApi'

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, roles: [], accessToken: null, expiresAt: null })
})
describe('HU-86: comandos públicos sin ganador elegido en Web', () => {
  it('mantiene créditos exactos como strings y entrega un cuerpo vacío con JWT', async () => {
    useSession.setState({
      subject: 'admin',
      accessToken: 'qa-token',
      expiresAt: Date.now() + 60000,
    })
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(() => Promise.resolve(new Response('{}')))
    vi.stubGlobal('fetch', fetch)
    const configuration = {
      operationId: 'approval',
      allocations: [
        { memberIndex: 0 as const, credits: '9007199254740990', epicProductId: 'qa-epic' },
        { memberIndex: 1 as const, credits: '1', epicProductId: null },
      ],
    }
    await prizeApi.view('T/1')
    await prizeApi.approve('T/1', configuration)
    await prizeApi.deliver('T/1')
    expect(fetch.mock.calls[0]![0]).toBe('/api/v1/tournaments/T%2F1/prize')
    expect(fetch.mock.calls[1]![0]).toBe('/api/v1/tournaments/admin/T%2F1/prize/configuration')
    expect(JSON.parse(fetch.mock.calls[1]![1]!.body as string)).toEqual(configuration)
    expect(fetch.mock.calls[2]![0]).toBe('/api/v1/tournaments/admin/T%2F1/prize/deliver')
    expect(fetch.mock.calls[2]![1]).toEqual({
      method: 'POST',
      body: '{}',
      headers: {
        authorization: 'Bearer qa-token',
        'content-type': 'application/json',
      },
    })
  })
  it('una respuesta perdida no produce un recibo de entrega inventado', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ code: 'PRIZE_DEPENDENCY_UNAVAILABLE' }), { status: 503 }),
        ),
    )
    await expect(prizeApi.deliver('T1')).rejects.toMatchObject({ status: 503 })
  })
})
