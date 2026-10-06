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
