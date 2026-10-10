import { HttpError, httpClient } from '@/lib/http'

import type { AuctionMetricsParams, AuctionMetricsSummary } from './types'

/** Filas de los rankings y de usuarios: el defecto del contrato (§4.6). */
export const DEFAULT_LIMIT = 10

/**
 * `GET /api/v1/admin/auction-metrics/summary` (contrato `hu-91.v1` §4.6).
 *
 * Una sola llamada para toda la pantalla: Auction resuelve las cinco secciones sobre el
 * MISMO periodo y marca `DEGRADED` la que falle, de modo que Web no compone cinco
 * peticiones ni reconcilia periodos distintos.
 */
export const fetchAuctionMetricsSummary = (
  params: AuctionMetricsParams,
  signal?: AbortSignal,
): Promise<AuctionMetricsSummary> => {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    granularity: params.granularity,
    limit: String(params.limit ?? DEFAULT_LIMIT),
  })

  return httpClient.get<AuctionMetricsSummary>(
    `/v1/admin/auction-metrics/summary?${query.toString()}`,
    signal,
  )
}

/** Clasificacion de un fallo de la consulta, para que la pantalla elija el estado. */
export type MetricsFailureKind = 'INVALID_PERIOD' | 'FORBIDDEN' | 'UNAVAILABLE'

const errorCodeOf = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null || !('code' in body)) {
    return null
  }

  return typeof body.code === 'string' ? body.code : null
}

export const classifyMetricsFailure = (error: unknown): MetricsFailureKind => {
  if (error instanceof HttpError) {
    if (error.isForbidden) {
      return 'FORBIDDEN'
    }

    if (error.status === 400 && errorCodeOf(error.body) === 'INVALID_PERIOD') {
      return 'INVALID_PERIOD'
    }
  }

  // 503 METRICS_UNAVAILABLE, 5xx, sin red u otro 4xx: la pantalla no puede mostrar nada.
  return 'UNAVAILABLE'
}
