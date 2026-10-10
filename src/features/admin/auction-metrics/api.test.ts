import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError, httpClient } from '@/lib/http'

import { classifyMetricsFailure, fetchAuctionMetricsSummary } from './api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchAuctionMetricsSummary', () => {
  it('llama al consolidado del contrato con periodo, granularidad y limite', async () => {
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue({})
    const signal = new AbortController().signal

    await fetchAuctionMetricsSummary(
      {
        from: '2026-09-07T00:00:00.000Z',
        to: '2026-10-05T00:00:00.000Z',
        granularity: 'WEEK',
      },
      signal,
    )

    expect(get).toHaveBeenCalledWith(
      '/v1/admin/auction-metrics/summary?from=2026-09-07T00%3A00%3A00.000Z&to=2026-10-05T00%3A00%3A00.000Z&granularity=WEEK&limit=10',
      signal,
    )
  })

  it('respeta un limite explicito', async () => {
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue({})

    await fetchAuctionMetricsSummary({ from: 'a', to: 'b', granularity: 'DAY', limit: 25 })

    expect(String(get.mock.calls[0]?.[0])).toContain('limit=25')
  })
})

describe('classifyMetricsFailure', () => {
  it('403 es acceso denegado', () => {
    expect(classifyMetricsFailure(new HttpError(403, 'x', {}))).toBe('FORBIDDEN')
  })

  it('400 INVALID_PERIOD es error de periodo', () => {
    expect(classifyMetricsFailure(new HttpError(400, 'x', { code: 'INVALID_PERIOD' }))).toBe(
      'INVALID_PERIOD',
    )
  })

  it.each([
    ['400 INVALID_PARAMETER', new HttpError(400, 'x', { code: 'INVALID_PARAMETER' })],
    ['400 sin codigo', new HttpError(400, 'x', null)],
    ['503', new HttpError(503, 'x', { code: 'METRICS_UNAVAILABLE' })],
    ['500', new HttpError(500, 'x', {})],
    ['fallo de red', new TypeError('Failed to fetch')],
  ])('%s no se puede mostrar: servicio no disponible', (_name, error) => {
    expect(classifyMetricsFailure(error)).toBe('UNAVAILABLE')
  })
})
