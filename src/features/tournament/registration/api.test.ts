import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/shared/session'
import { registrationApi } from './api'
import { bracketApi } from './bracketApi'
import { encounterApi } from './encounterApi'
import { matchAcceptanceApi } from './encounterAdminApi'

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
describe('contrato HTTP de Torneo v2 con httpClient autenticado', () => {
  beforeEach(() => {
    useSession.setState({
      subject: 'player-A',
      accessToken: 'test-token',
      expiresAt: Date.now() + 60000,
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  })
  it('registra avatar existente y compañero; la identidad del creador solo está en JWT', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() => Promise.resolve(json({ id: 'team' })))
    vi.stubGlobal('fetch', fetch)
    const input = {
      operationId: 'register-1',
      name: 'Equipo válido',
      avatar: { kind: 'ACCOUNT_AVATAR' as const, subject: 'player-B' },
      companionId: 'player-B',
    }
    await registrationApi.register('T/1', input)
    expect(fetch).toHaveBeenCalledWith('/api/v1/tournaments/T%2F1/teams', {
      method: 'POST',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    expect(fetch.mock.calls[0]?.[1]?.body).not.toContain('ownerId')
  })
  it('acepta una justa por la ruta real v3 y solo con operationId; actor, conteo y ganador pertenecen al servidor', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(json({ receiptId: 'server-receipt' })),
    )
    vi.stubGlobal('fetch', fetch)
    await matchAcceptanceApi.accept('T/3', 'T/3:E1', 'accept-1')
    expect(fetch).toHaveBeenCalledWith('/api/v1/tournaments/T%2F3/matches/T%2F3%3AE1/acceptance', {
      method: 'POST',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify({ operationId: 'accept-1' }),
    })
  })
  it('envía intención, método y tarjeta de simulación sin importe/cupo/pagador', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() => Promise.resolve(json({ id: 'team' })))
    vi.stubGlobal('fetch', fetch)
    const input = {
      operationId: 'entry-1',
      method: 'SIMULATED_MONEY' as const,
      card: { holder: 'Prueba', number: '1111', expiry: '12/30', securityCode: '123' },
    }
    await registrationApi.enter('T/1', 'team:1', input)
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/v1/tournaments/T%2F1/teams/team%3A1/entry')
    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body as string)).toEqual(input)
    await registrationApi.enter('T/1', 'team:1', {
      operationId: 'entry-1',
      method: 'SIMULATED_MONEY',
    })
    expect(JSON.parse(fetch.mock.calls[1]?.[1]?.body as string)).toEqual({
      operationId: 'entry-1',
      method: 'SIMULATED_MONEY',
    })
  })
  it('conserva listado HU83 array, matchId recibido completo y cursor exclusivo', async () => {
    const summary = {
      tournamentId: 'T/1',
      matchId: 'historical/id:E2',
      bracketLabel: 'E2',
      round: 1,
      status: 'IN_PROGRESS',
      startedAt: null,
      closedAt: null,
    }
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json([summary]))
      .mockResolvedValueOnce(
        json({
          ...summary,
          teams: [],
          events: [],
          afterSeq: 100,
          nextSeq: 100,
          hasMore: false,
          logComplete: true,
          result: null,
        }),
      )
    vi.stubGlobal('fetch', fetch)
    expect(await encounterApi.list('T/1')).toEqual([summary])
    expect((await encounterApi.detail('T/1', summary.matchId, 100)).afterSeq).toBe(100)
    expect(fetch.mock.calls[1]?.[0]).toBe(
      '/api/v1/tournaments/T%2F1/matches/historical%2Fid%3AE2?afterSeq=100',
    )
    expect(new Headers(fetch.mock.calls[1]?.[1]?.headers).get('authorization')).toBe(
      'Bearer test-token',
    )
  })
  it('consulta bracket por su ruta propia y publica solo operationId', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json({ bracket: null }))
      .mockResolvedValueOnce(json({ version: 2 }))
    vi.stubGlobal('fetch', fetch)
    expect(await bracketApi.view('T/1')).toBeNull()
    await bracketApi.publish('T/1', 'publish-id')
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/v1/tournaments/T%2F1/bracket')
    expect(JSON.parse(fetch.mock.calls[1]?.[1]?.body as string)).toEqual({
      operationId: 'publish-id',
    })
  })
  it('consentimiento y cancelación no envían actor ni roles del formulario', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() => Promise.resolve(json({})))
    vi.stubGlobal('fetch', fetch)
    await registrationApi.consent('T1', 'team', 'accept-id', true)
    await registrationApi.cancel('T1', 'team', 'cancel-id')
    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body as string)).toEqual({
      operationId: 'accept-id',
      accept: true,
    })
    expect(JSON.parse(fetch.mock.calls[1]?.[1]?.body as string)).toEqual({
      operationId: 'cancel-id',
    })
  })
})
