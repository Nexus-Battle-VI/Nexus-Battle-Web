import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'

import {
  fetchBattleReward,
  fetchBattleRoom,
  fetchWallet,
  issueRealtimeTicket,
  startBattle,
} from './api'
import { ROOM_ID } from './fixtures'

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('issueRealtimeTicket (ADR-020)', () => {
  it('pide POST /api/v1/combat/realtime/tickets SIN cuerpo y devuelve solo el ticket', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { ticket: 'opaco-1' }))
    vi.stubGlobal('fetch', fetchImpl)

    await expect(issueRealtimeTicket()).resolves.toBe('opaco-1')

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('/api/v1/combat/realtime/tickets')
    expect(init.method).toBe('POST')
    // Nadie puede pedir un ticket para otro jugador: no hay identidad en el cuerpo.
    expect(init.body).toBeUndefined()
  })

  it('el JWT viaja en la cabecera Authorization (HTTP), nunca en la URL', async () => {
    useSession.setState({
      subject: 'sujeto-ana',
      accessToken: 'jwt-vigente',
      expiresAt: Date.now() + 900_000,
    })
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { ticket: 'opaco-2' }))
    vi.stubGlobal('fetch', fetchImpl)

    await issueRealtimeTicket()

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]

    expect(url).not.toContain('jwt-vigente')
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer jwt-vigente')
  })

  it('propaga un 401 como HttpError no autorizado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Sin testimonio' })),
    )

    await expect(issueRealtimeTicket()).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isUnauthorized,
    )
  })
})

describe('fetchBattleRoom', () => {
  it('pide GET /api/v1/combat/rooms/:roomId', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { id: ROOM_ID }))
    vi.stubGlobal('fetch', fetchImpl)

    await expect(fetchBattleRoom(ROOM_ID)).resolves.toEqual({ id: ROOM_ID })

    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/v1/combat/rooms/${ROOM_ID}`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('escapa el identificador para que no pueda alterar la ruta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchImpl)

    await fetchBattleRoom('../otra/ruta?x=1')

    expect((fetchImpl.mock.calls[0] as [string])[0]).toBe(
      '/api/v1/combat/rooms/..%2Fotra%2Fruta%3Fx%3D1',
    )
  })

  it('propaga un 403 cuando quien consulta no participa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(403, { message: 'No eres participante' })),
    )

    await expect(fetchBattleRoom(ROOM_ID)).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isForbidden,
    )
  })
})

describe('startBattle (HU-17)', () => {
  it('pide POST /api/v1/combat/rooms/:roomId/start SIN cuerpo: ningun cliente elige quien inicia ni el orden', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { id: ROOM_ID, status: 'IN_BATTLE' }))
    vi.stubGlobal('fetch', fetchImpl)

    await expect(startBattle(ROOM_ID)).resolves.toMatchObject({ status: 'IN_BATTLE' })

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]

    expect(url).toBe(`/api/v1/combat/rooms/${ROOM_ID}/start`)
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
  })

  it.each([403, 404, 409, 422, 503])(
    'propaga el HTTP %i para que la pantalla lo traduzca',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(status, { message: 'x' })))

      await expect(startBattle(ROOM_ID)).rejects.toMatchObject({ status })
    },
  )
})

describe('fetchBattleReward (HU-22)', () => {
  const STATUS = {
    creditsEarned: 2,
    balance: 42,
    victoryProgress: 6,
    weeklyChestCount: 0,
    chestEarned: false,
    rewardDelivery: 'NONE' as const,
    reward: null,
  }

  it('pide GET /api/v1/combat/rooms/:roomId/reward y devuelve el estado tal cual', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, STATUS))
    vi.stubGlobal('fetch', fetchImpl)

    await expect(fetchBattleReward(ROOM_ID)).resolves.toEqual(STATUS)

    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/v1/combat/rooms/${ROOM_ID}/reward`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('escapa el identificador de sala para que no pueda alterar la ruta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, STATUS))
    vi.stubGlobal('fetch', fetchImpl)

    await fetchBattleReward('../otra/ruta?x=1')

    expect((fetchImpl.mock.calls[0] as [string])[0]).toBe(
      '/api/v1/combat/rooms/..%2Fotra%2Fruta%3Fx%3D1/reward',
    )
  })

  it('propaga un 403 cuando quien consulta no participa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(403, { message: 'No eres participante' })),
    )

    await expect(fetchBattleReward(ROOM_ID)).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isForbidden,
    )
  })
})

describe('fetchWallet (HU-22)', () => {
  const SNAPSHOT = {
    balance: 42,
    victoryProgress: 6,
    weeklyChestCount: 0,
    weeklyChestLimit: 2,
    threshold: 20,
  }

  it('pide GET /api/v1/wallet/me sin ningun identificador: el servicio deduce el jugador del testimonio', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, SNAPSHOT))
    vi.stubGlobal('fetch', fetchImpl)

    await expect(fetchWallet()).resolves.toEqual(SNAPSHOT)

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('/api/v1/wallet/me')
    expect(init.method).toBe('GET')
  })

  it('propaga un 401 cuando no hay sesion vigente', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Sin testimonio' })),
    )

    await expect(fetchWallet()).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isUnauthorized,
    )
  })
})
