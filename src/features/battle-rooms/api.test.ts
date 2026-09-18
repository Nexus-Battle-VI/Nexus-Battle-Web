import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { cancelBattleRoom, createBattleRoom, fetchBattleRooms } from './api'
import type { BattleRoom, CreateBattleRoomInput } from './types'

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const ROOM: BattleRoom = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    { label: 'A', capacity: 1, participants: [] },
    { label: 'B', capacity: 1, participants: [] },
  ],
  reward: { amount: 100 },
  createdBy: 'sujeto-ana',
  createdAt: '2026-09-18T00:00:00.000Z',
  version: 0,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchBattleRooms', () => {
  it('pide GET /api/v1/combat/rooms sin ningun parametro de consulta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, [ROOM]))
    vi.stubGlobal('fetch', fetchImpl)

    const result = await fetchBattleRooms()

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/v1/combat/rooms',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual([ROOM])
  })

  it('devuelve un arreglo vacio como estado real, no como error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])))

    await expect(fetchBattleRooms()).resolves.toEqual([])
  })

  it('propaga un 401 como HttpError no autorizado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Sin testimonio' })))

    await expect(fetchBattleRooms()).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isUnauthorized,
    )
  })
})

describe('createBattleRoom', () => {
  const input: CreateBattleRoomInput = {
    mode: 'PVP',
    teamConfigs: [{ capacity: 1 }, { capacity: 1 }],
    reward: { amount: 50 },
  }

  it('pide POST /api/v1/combat/rooms con el body exacto, sin createdBy ni playerId', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, ROOM))
    vi.stubGlobal('fetch', fetchImpl)

    const result = await createBattleRoom(input)

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/combat/rooms')
    expect(init.method).toBe('POST')

    const sentBody = JSON.parse(init.body as string) as Record<string, unknown>
    expect(sentBody).toEqual(input)
    expect(sentBody).not.toHaveProperty('createdBy')
    expect(sentBody).not.toHaveProperty('playerId')
    expect(result).toEqual(ROOM)
  })

  it('propaga un 422 de regla de negocio con el mensaje real del dominio', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(422, { message: 'La recompensa debe ser un número mayor o igual a 0. Se recibió -10.' }),
        ),
    )

    await expect(createBattleRoom({ ...input, reward: { amount: -10 } })).rejects.toMatchObject({
      status: 422,
      message: 'La recompensa debe ser un número mayor o igual a 0. Se recibió -10.',
    })
  })

  it('propaga un 400 de formato invalido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { message: 'mode invalido' })))

    await expect(createBattleRoom(input)).rejects.toMatchObject({ status: 400 })
  })

  it('propaga un error de red sin crashear', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(createBattleRoom(input)).rejects.toBeInstanceOf(TypeError)
  })
})

describe('cancelBattleRoom', () => {
  it('pide POST /api/v1/combat/rooms/:roomId/cancel', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ...ROOM, status: 'CANCELLED' }))
    vi.stubGlobal('fetch', fetchImpl)

    await cancelBattleRoom(ROOM.id)

    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/v1/combat/rooms/${ROOM.id}/cancel`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('propaga un 403 cuando quien cancela no es el creador', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(403, { message: `Solo el creador de la sala "${ROOM.id}" puede cancelarla.` })),
    )

    await expect(cancelBattleRoom(ROOM.id)).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isForbidden,
    )
  })

  it('propaga un 404 cuando la sala no existe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { message: 'No encontrada' })))

    await expect(cancelBattleRoom(ROOM.id)).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isNotFound,
    )
  })

  it('propaga un 409 cuando la sala ya no es cancelable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(409, { message: 'La sala ya no se puede cancelar.' })),
    )

    await expect(cancelBattleRoom(ROOM.id)).rejects.toMatchObject({ status: 409 })
  })
})
