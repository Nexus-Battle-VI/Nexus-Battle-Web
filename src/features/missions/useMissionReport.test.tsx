import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'

import { queryKeys } from '@/shared/query-keys'
import { createTestQueryClient } from '@/test/render'

import type { MissionReportExperience } from './api'
import { ENROLLMENT_ID, reportOf } from './fixtures'
import { useMissionReport } from './useMissionReport'

/**
 * `useMissionReport` (HU-09, Task HU-09.5): una consulta normal al informe de
 * HU-74, con sondeo corto MIENTRAS quede experiencia por resolver.
 *
 * Lo que se comprueba aqui es lo que el panel no puede contar: que la consulta se
 * activa solo con matricula y que el sondeo se DETIENE cuando ya nada puede
 * cambiar (ni antes, dejando de avisar, ni despues, insistendo sin motivo).
 */
const PENDING: MissionReportExperience = {
  defeats: 19,
  totalXp: 12,
  credited: 1,
  pending: 18,
  failed: 0,
  level: 2,
  currentXp: 512,
  maxLevel: 8,
  levelsGained: 1,
  leveledUp: true,
}

const SETTLED: MissionReportExperience = { ...PENDING, totalXp: 54, credited: 19, pending: 0 }

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const wrapper =
  (queryClient: ReturnType<typeof createTestQueryClient>) =>
  ({ children }: { readonly children: ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useMissionReport — activacion y contrato (HU-09.5)', () => {
  it('sin matricula no consulta nada', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(reportOf()))
    vi.stubGlobal('fetch', fetchImpl)

    renderHook(() => useMissionReport(null), { wrapper: wrapper(createTestQueryClient()) })

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('con matricula consulta el informe con la clave `missions.report`', async () => {
    const queryClient = createTestQueryClient()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(reportOf({ experience: SETTLED })))
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(() => useMissionReport(ENROLLMENT_ID), {
      wrapper: wrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(queryKeys.missions.report(ENROLLMENT_ID)).toEqual(['missions', 'report', ENROLLMENT_ID])
    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/v1/missions/me/reports/${ENROLLMENT_ID}`,
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result.current.data?.mission.name).toBe('El Templo Olvidado')
  })
})

describe('useMissionReport — el sondeo se detiene cuando ya nada cambia (HU-09.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const render = (experience: MissionReportExperience | undefined): ReturnType<typeof vi.fn> => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(reportOf(experience === undefined ? {} : { experience })))
    vi.stubGlobal('fetch', fetchImpl)

    renderHook(() => useMissionReport(ENROLLMENT_ID), { wrapper: wrapper(createTestQueryClient()) })

    return fetchImpl
  }

  it('con derrotas por acreditar sigue preguntando: la experiencia todavia no llego', async () => {
    const fetchImpl = render(PENDING)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('sin nada pendiente deja de preguntar: acreditadas y fallidas son terminales', async () => {
    const fetchImpl = render(SETTLED)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('un informe sin bloque de experiencia no se sondea: un servicio anterior no lo va a anadir', async () => {
    const fetchImpl = render(undefined)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('con todas las derrotas sin acreditar se detiene: no queda nada por resolver', async () => {
    const fetchImpl = render({ ...PENDING, totalXp: 0, credited: 0, pending: 0, failed: 19 })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
