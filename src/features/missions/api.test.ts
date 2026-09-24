import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'
import { difficultiesWithoutProgress, jsonResponse, MISSION_ID } from '@/test/missions-fixtures'

import { fetchMissionDifficulties } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('fetchMissionDifficulties (contrato hu-75-mission-difficulty-v1)', () => {
  it('pide GET /api/v1/missions/:missionId/difficulties con el testimonio en la cabecera', async () => {
    useSession.setState({
      subject: 'sujeto-ana',
      accessToken: 'jwt-vigente',
      expiresAt: Date.now() + 900_000,
    })
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, difficultiesWithoutProgress()))
    vi.stubGlobal('fetch', fetchImpl)

    await expect(fetchMissionDifficulties(MISSION_ID)).resolves.toEqual(
      difficultiesWithoutProgress(),
    )

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('/api/v1/missions/msn_templo-olvidado/difficulties')
    expect(init.method).toBe('GET')
    // El jugador lo deduce Missions del testimonio: no viaja en la URL.
    expect(init.headers).toMatchObject({ authorization: 'Bearer jwt-vigente' })
    expect(url).not.toContain('sujeto-ana')
  })

  it('codifica el identificador: el dato no puede alterar la ruta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, difficultiesWithoutProgress()))
    vi.stubGlobal('fetch', fetchImpl)

    await fetchMissionDifficulties('../admin?x=1')

    const [url] = fetchImpl.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('/api/v1/missions/..%2Fadmin%3Fx%3D1/difficulties')
  })

  it('un fallo del servicio llega como HttpError con el mensaje que redacto Missions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(503, {
          statusCode: 503,
          code: 'DEPENDENCY_UNAVAILABLE',
          message: 'No se pudo consultar el progreso de dificultad. Intenta de nuevo.',
        }),
      ),
    )

    const error = await fetchMissionDifficulties(MISSION_ID).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(503)
    expect((error as HttpError).message).toBe(
      'No se pudo consultar el progreso de dificultad. Intenta de nuevo.',
    )
  })
})
