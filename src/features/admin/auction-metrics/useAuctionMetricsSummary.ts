import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import { DEFAULT_LIMIT, fetchAuctionMetricsSummary } from './api'
import type { AuctionMetricsParams, AuctionMetricsSummary } from './types'

/**
 * Consolidado de metricas de subasta (HU-91.6).
 *
 * Sin reintentos automaticos: un 503 (`METRICS_UNAVAILABLE`) o un periodo invalido
 * debe verse de inmediato y el reintento lo decide quien usa la pantalla con
 * "Actualizar" o "Reintentar". La respuesta se considera fresca durante 30 s para que
 * volver a la pestana no dispare otra consulta pesada de agregacion.
 */
export const useAuctionMetricsSummary = (
  params: AuctionMetricsParams | null,
  fetcher: typeof fetchAuctionMetricsSummary = fetchAuctionMetricsSummary,
): UseQueryResult<AuctionMetricsSummary> =>
  useQuery({
    queryKey: queryKeys.admin.auctionMetricsSummary({
      from: params?.from ?? '',
      to: params?.to ?? '',
      granularity: params?.granularity ?? 'WEEK',
      limit: params?.limit ?? DEFAULT_LIMIT,
    }),
    queryFn: ({ signal }) => {
      if (params === null) {
        throw new Error('Periodo no resuelto.')
      }

      return fetcher(params, signal)
    },
    enabled: params !== null,
    retry: false,
    staleTime: 30_000,
  })
