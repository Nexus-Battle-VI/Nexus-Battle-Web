import { afterEach, describe, expect, it, vi } from 'vitest'

import { httpClient, HttpError } from '@/lib/http'

import { fetchMissionStrategy, saveMissionStrategy } from './missionStrategyApi'

afterEach(() => vi.restoreAllMocks())

describe('contrato de estrategia (HU-71)', () => {
  it('trata solo STRATEGY_NOT_FOUND como primera configuración', async () => {
    const get = vi.spyOn(httpClient, 'get')
    get.mockRejectedValueOnce(new HttpError(404, 'Sin estrategia', { code: 'STRATEGY_NOT_FOUND' }))
    get.mockRejectedValueOnce(
      new HttpError(404, 'Misión inexistente', { code: 'MISSION_NOT_FOUND' }),
    )

    await expect(fetchMissionStrategy('msn_uno', 'hero_uno')).resolves.toBeNull()
    await expect(fetchMissionStrategy('msn_uno', 'hero_uno')).rejects.toThrow('Misión inexistente')
  })

  it('guarda las rotaciones con la versión leída y codifica ambos identificadores', async () => {
    const request = vi.spyOn(httpClient, 'request').mockResolvedValue({})
    const rotations = [{ priority: 'HIGH', steps: [{ kind: 'BASIC_ATTACK' }] }] as const

    await saveMissionStrategy('msn/uno', 'hero?uno', 2, rotations)

    expect(request).toHaveBeenCalledWith('/v1/missions/msn%2Funo/strategies/hero%3Funo', {
      method: 'PUT',
      body: { expectedVersion: 2, rotations },
    })
  })
})
