import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'

import { queryKeys } from '@/shared/query-keys'
import { createTestQueryClient } from '@/test/render'

import type { MissionReportExperience, MissionReportRewardLine } from './api'
import { ENROLLMENT_ID, lineOf, reportOf } from './fixtures'
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

    expect(queryKeys.missions.report(null, ENROLLMENT_ID)).toEqual([
      'missions',
      'report',
      null,
      ENROLLMENT_ID,
    ])
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

/**
 * HU-10.6 (contrato §13 de HU-10.5): el sondeo se EXTIENDE, no se reemplaza.
 * `HU09 pending OR HU10 pending -> sondea; sin ninguna de las dos -> se detiene`.
 */
describe('useMissionReport — el sondeo tambien cubre HU-10 (HU-10.5, contrato §13)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const render = (
    experience: MissionReportExperience | undefined,
    rewards: readonly MissionReportRewardLine[] = [],
  ): ReturnType<typeof vi.fn> => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(reportOf({ ...(experience === undefined ? {} : { experience }), rewards })),
      )
    vi.stubGlobal('fetch', fetchImpl)

    renderHook(() => useMissionReport(ENROLLMENT_ID), { wrapper: wrapper(createTestQueryClient()) })

    return fetchImpl
  }

  const hu10 = (status: 'PENDING' | 'CREDITED' | 'FAILED'): MissionReportRewardLine =>
    lineOf({ kind: 'CREDITS', source: 'HU-10', status, quantity: 50 })

  it('1. HU-09 PENDING, sin HU-10: sigue sondeando', async () => {
    const fetchImpl = render(PENDING)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('2. HU-10 PENDING, HU-09 asentada: sigue sondeando', async () => {
    const fetchImpl = render(SETTLED, [hu10('PENDING')])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('3. HU-09 Y HU-10 pendientes: sigue sondeando', async () => {
    const fetchImpl = render(PENDING, [hu10('PENDING')])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('4. HU-09 asentada + HU-10 CREDITED: se detiene', async () => {
    const fetchImpl = render(SETTLED, [hu10('CREDITED')])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('5. HU-09 asentada + HU-10 FAILED: se detiene', async () => {
    const fetchImpl = render(SETTLED, [hu10('FAILED')])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('6. sin bloque HU-09 + HU-10 PENDING: sigue sondeando', async () => {
    const fetchImpl = render(undefined, [hu10('PENDING')])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('7. sin bloque HU-09 y sin lineas HU-10: se detiene', async () => {
    const fetchImpl = render(undefined, [])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('8. solo un botin HU-72 PENDING: no activa el sondeo de HU-10', async () => {
    const fetchImpl = render(undefined, [
      lineOf({ kind: 'PRODUCT', source: 'HU-72', status: 'PENDING', quantity: 1 }),
    ])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('9. PENDING y luego CREDITED: pide una vez mas y despues se detiene', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(reportOf({ rewards: [hu10('PENDING')] })))
      .mockResolvedValue(jsonResponse(reportOf({ rewards: [hu10('CREDITED')] })))
    vi.stubGlobal('fetch', fetchImpl)

    renderHook(() => useMissionReport(ENROLLMENT_ID), { wrapper: wrapper(createTestQueryClient()) })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
