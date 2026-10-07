import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'
import { broadcastApi } from './api'
describe('HU-79/81: cliente de observación', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  it('codifica rutas, cancela lecturas y envía revisión sin identidad ni estado de batalla', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(() =>
        Promise.resolve(new Response('{}', { headers: { 'content-type': 'application/json' } })),
      )
    vi.stubGlobal('fetch', fetch)
    const controller = new AbortController()
    await broadcastApi.configuration('T/1')
    await broadcastApi.active('T/1')
    await broadcastApi.observe('T/1', controller.signal)
    await broadcastApi.designate('T/1')
    await broadcastApi.designate('T/1', 4)
    await broadcastApi.select('T/1', 'E2', 5, controller.signal)
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/tournaments/T%2F1/broadcast/view',
      expect.objectContaining({ method: 'GET', signal: controller.signal }),
    )
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/tournaments/admin/T%2F1/broadcast/designate',
      expect.objectContaining({ method: 'POST', body: '{}' }),
    )
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/tournaments/admin/T%2F1/broadcast/designate',
      expect.objectContaining({ body: '{"expectedRevision":4}' }),
    )
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/tournaments/T%2F1/broadcast/selection',
      expect.objectContaining({
        method: 'POST',
        body: '{"matchId":"E2","expectedRevision":5}',
        signal: controller.signal,
      }),
    )
  })
  it('preserva el rechazo de permisos y el motivo de Combat caído', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(() =>
      Promise.resolve(
        new Response('{"message":"Solo el transmisor designado."}', {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    vi.stubGlobal('fetch', fetch)
    await expect(broadcastApi.observe('T1', new AbortController().signal)).rejects.toBeInstanceOf(
      HttpError,
    )
    await expect(broadcastApi.observe('T1', new AbortController().signal)).rejects.toMatchObject({
      status: 403,
      message: 'Solo el transmisor designado.',
    })
  })
})
