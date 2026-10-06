import { httpClient } from '@/lib/http'

export interface ModelVersionRow {
  readonly versionId: string
  readonly state: 'ACTIVE' | 'CANDIDATE'
  readonly inExperiment: boolean
  readonly accuracy: number
  readonly macroF1: number
  readonly useful: number
  readonly notUseful: number
  readonly precision: number | null
}

export interface TrainingResult {
  readonly started: boolean
  readonly promoted: boolean
  readonly versionId: string | null
  readonly accuracy: number | null
  readonly macroF1: number | null
  readonly singleExampleLabels: readonly string[]
}

export const fetchModelVersions = (signal?: AbortSignal): Promise<readonly ModelVersionRow[]> =>
  httpClient.get('/v1/chatbot/admin/model-precision', signal)

export const startModelTraining = (): Promise<TrainingResult> =>
  httpClient.post('/v1/chatbot/admin/model-training')

export interface UsageReport {
  readonly conversationsStarted: number
  readonly frequentQuestions: readonly { readonly text: string; readonly count: number }[]
  readonly topics: readonly { readonly intent: string | null; readonly count: number }[]
  readonly resolutionRate: number | null
  readonly averageResponseMs: number | null
  readonly satisfaction: number | null
  readonly escalations: number
  readonly keywords: readonly { readonly text: string; readonly count: number }[]
  readonly trend: readonly {
    readonly date: string
    readonly queries: number
    readonly resolved: number
  }[]
}

export const fetchAnalytics = (
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<UsageReport> => {
  const params = new URLSearchParams({
    from: `${from}T00:00:00.000Z`,
    to: `${to}T23:59:59.999Z`,
  })
  return httpClient.get(`/v1/chatbot/admin/analytics?${params.toString()}`, signal)
}
