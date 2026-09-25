import { afterEach, describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/http'

import { enrollInMission, fetchMissionBoard, fetchMissionDetail } from './missionApi'

afterEach(() => vi.restoreAllMocks())

describe('contrato público de Missions (HU-70)', () => {
  it('envía filtros cerrados al tablón sin incluir la identidad en la URL', async () => {
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue({ items: [] })

    await fetchMissionBoard({ category: 'STORY', status: 'AVAILABLE' })

    expect(get).toHaveBeenCalledWith('/v1/missions?category=STORY&status=AVAILABLE', undefined)
  })

  it('codifica el identificador del detalle y matrícula y envía la clave de idempotencia', async () => {
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue({})
    const post = vi.spyOn(httpClient, 'post').mockResolvedValue({})

    await fetchMissionDetail('mision/uno?')
    await enrollInMission({
      missionId: 'mision/uno?',
      heroId: '7f3c2a9e-2d4b-4c1a-9e7f-1b2c3d4e5f60',
      difficulty: 'NORMAL',
      idempotencyKey: '3b9f6c1e-8d2a-4f7b-9c4e-5a6b7c8d9e0f',
    })

    expect(get).toHaveBeenCalledWith('/v1/missions/mision%2Funo%3F', undefined)
    expect(post).toHaveBeenCalledWith(
      '/v1/missions/mision%2Funo%3F/enrollments',
      { heroId: '7f3c2a9e-2d4b-4c1a-9e7f-1b2c3d4e5f60', difficulty: 'NORMAL' },
      { 'Idempotency-Key': '3b9f6c1e-8d2a-4f7b-9c4e-5a6b7c8d9e0f' },
    )
  })
})
