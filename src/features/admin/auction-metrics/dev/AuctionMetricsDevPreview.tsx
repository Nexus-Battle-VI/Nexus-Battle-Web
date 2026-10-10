import { useSearchParams } from 'react-router'

import { HttpError } from '@/lib/http'

import { AuctionMetricsPage } from '../AuctionMetricsPage'
import type { fetchAuctionMetricsSummary } from '../api'
import type { AuctionMetricsSummary } from '../types'
import { emptySummary, sampleSummary } from './fixtures'

/**
 * Vista previa de desarrollo de las metricas de subasta (HU-91.6).
 *
 * La pantalla real vive tras `RequireSession` + `RequireAdministrator` y necesita Auction
 * respondiendo de verdad; el entorno local no levanta ese servicio. Esta vista monta el
 * componente de produccion con un transporte inyectado (`onFetch`) y datos de ejemplo con
 * la forma exacta del contrato, para revisar diseño y estados sin desplegar el stack.
 *
 * NO ES UNA PUERTA TRASERA: solo existe con `import.meta.env.DEV` (Vite elimina la rama en
 * produccion) y no monta la ruta productiva ni toca ninguna guarda. Se elige el estado con
 * `?state=`: `design` (defecto), `loading`, `degraded`, `partial`, `no-catalog`, `empty`,
 * `invalid`, `forbidden` o `unavailable`.
 */
const PREVIEW_STATES = [
  'design',
  'loading',
  'degraded',
  'partial',
  'no-catalog',
  'empty',
  'invalid',
  'forbidden',
  'unavailable',
] as const

type PreviewState = (typeof PREVIEW_STATES)[number]

const isPreviewState = (value: string | null): value is PreviewState =>
  PREVIEW_STATES.some((state) => state === value)

const withRankings = (
  summary: AuctionMetricsSummary,
  status: 'PARTIAL' | 'UNAVAILABLE',
): AuctionMetricsSummary => {
  const { productRankings } = summary.sections

  if (productRankings.status !== 'AVAILABLE') {
    return summary
  }

  const unnamed = status === 'UNAVAILABLE'

  return {
    ...summary,
    sections: {
      ...summary.sections,
      productRankings: {
        status: 'AVAILABLE',
        data: {
          ...productRankings.data,
          enrichment: { status },
          // PARTIAL: Catalog omite un producto; UNAVAILABLE: no hay ningun nombre.
          mostAuctioned: productRankings.data.mostAuctioned.map((item, index) => ({
            ...item,
            product: unnamed || index === 1 ? null : item.product,
          })),
          mostSold: productRankings.data.mostSold.map((item, index) => ({
            ...item,
            product: unnamed || index === 1 ? null : item.product,
          })),
        },
      },
    },
  }
}

const fetcherFor =
  (state: PreviewState): typeof fetchAuctionMetricsSummary =>
  (params) => {
    switch (state) {
      case 'loading':
        return new Promise<AuctionMetricsSummary>(() => undefined)
      case 'forbidden':
        return Promise.reject(new HttpError(403, 'Forbidden', { statusCode: 403 }))
      case 'unavailable':
        return Promise.reject(
          new HttpError(503, 'Service Unavailable', {
            statusCode: 503,
            code: 'METRICS_UNAVAILABLE',
          }),
        )
      case 'invalid':
        return Promise.reject(
          new HttpError(400, 'Bad Request', { statusCode: 400, code: 'INVALID_PERIOD' }),
        )
      case 'empty':
        return Promise.resolve(emptySummary())
      case 'degraded': {
        const summary = sampleSummary(params.granularity)

        return Promise.resolve({
          ...summary,
          sections: {
            ...summary.sections,
            averagePrices: { status: 'DEGRADED', reason: 'SECTION_COMPUTATION_FAILED' },
          },
        })
      }
      case 'partial':
        return Promise.resolve(withRankings(sampleSummary(params.granularity), 'PARTIAL'))
      case 'no-catalog':
        return Promise.resolve(withRankings(sampleSummary(params.granularity), 'UNAVAILABLE'))
      case 'design':
        return Promise.resolve(sampleSummary(params.granularity))
    }
  }

export const AuctionMetricsDevPreview = (): React.JSX.Element => {
  const [params] = useSearchParams()
  const requested = params.get('state')
  const state = isPreviewState(requested) ? requested : 'design'

  // `key`: cambiar de estado reinicia la pantalla (y su cache de consulta local).
  return <AuctionMetricsPage key={state} onFetch={fetcherFor(state)} />
}
