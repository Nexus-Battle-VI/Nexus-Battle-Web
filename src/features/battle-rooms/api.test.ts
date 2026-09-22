import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { cancelBattleRoom, createBattleRoom, fetchBattleRooms, joinBattleRoom } from './api'
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Sin testimonio' })),
    )

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
      vi.fn().mockResolvedValue(
        jsonResponse(422, {
          message: 'La recompensa debe ser un número mayor o igual a 0. Se recibió -10.',
        }),
      ),
    )

    await expect(createBattleRoom({ ...input, reward: { amount: -10 } })).rejects.toMatchObject({
      status: 422,
      message: 'La recompensa debe ser un número mayor o igual a 0. Se recibió -10.',
    })
  })

  it('propaga un 400 de formato invalido', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(400, { message: 'mode invalido' })),
    )

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
      vi.fn().mockResolvedValue(
        jsonResponse(403, {
          message: `Solo el creador de la sala "${ROOM.id}" puede cancelarla.`,
        }),
      ),
    )

    await expect(cancelBattleRoom(ROOM.id)).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isForbidden,
    )
  })

  it('propaga un 404 cuando la sala no existe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(404, { message: 'No encontrada' })),
    )

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

describe('joinBattleRoom', () => {
  it('pide POST /api/v1/combat/rooms/:roomId/join con el equipo elegido', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, ROOM))
    vi.stubGlobal('fetch', fetchImpl)

    const result = await joinBattleRoom(ROOM.id, { team: 'A' })

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`/api/v1/combat/rooms/${ROOM.id}/join`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ team: 'A' })
    expect(result).toEqual(ROOM)
  })

  it('envia un body vacio cuando no se elige equipo explicito', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, ROOM))
    vi.stubGlobal('fetch', fetchImpl)

    await joinBattleRoom(ROOM.id)

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({})
  })

  it('propaga un 400 de UUID invalido o campo no permitido', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(400, { message: 'roomId invalido' })),
    )

    await expect(joinBattleRoom('no-es-un-uuid')).rejects.toMatchObject({ status: 400 })
  })

  it('propaga un 401 sin testimonio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Sin testimonio' })),
    )

    await expect(joinBattleRoom(ROOM.id)).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isUnauthorized,
    )
  })

  it('propaga un 404 cuando la sala no existe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(404, { message: 'No encontrada' })),
    )

    await expect(joinBattleRoom(ROOM.id)).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isNotFound,
    )
  })

  it('propaga un 409 cuando la sala esta llena, duplicada o en conflicto de version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(409, { message: 'La sala ya está llena.' })),
    )

    await expect(joinBattleRoom(ROOM.id, { team: 'B' })).rejects.toMatchObject({
      status: 409,
      message: 'La sala ya está llena.',
    })
  })

  it('propaga un 422 cuando el jugador no tiene heroe equipado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(422, { message: 'Debes equipar un heroe.' })),
    )

    await expect(joinBattleRoom(ROOM.id)).rejects.toMatchObject({ status: 422 })
  })

  it('propaga un 503 cuando una dependencia externa falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(503, { message: 'Servicio no disponible' })),
    )

    await expect(joinBattleRoom(ROOM.id)).rejects.toMatchObject({ status: 503 })
  })
})
