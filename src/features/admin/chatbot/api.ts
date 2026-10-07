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
  readonly perIntentF1: readonly { readonly label: string; readonly score: number }[]
  readonly confusion: readonly {
    readonly actual: string
    readonly predicted: string
    readonly count: number
  }[]
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

export interface KnowledgeEntry {
  readonly id: string
  readonly intent: string
  readonly language: string
  readonly priority: number
  readonly answer: string
  readonly variations: readonly string[]
  readonly view: string | null
}

export interface KnowledgeDraft {
  readonly intent: string
  readonly language: string
  readonly priority: number
  readonly answer: string
  readonly variations: readonly string[]
  readonly view: string | null
}

export const fetchKnowledge = (signal?: AbortSignal): Promise<readonly KnowledgeEntry[]> =>
  httpClient.get('/v1/chatbot/admin/knowledge', signal)

export const createKnowledge = (draft: KnowledgeDraft): Promise<KnowledgeEntry> =>
  httpClient.post('/v1/chatbot/admin/knowledge', draft)

export const updateKnowledge = (id: string, draft: KnowledgeDraft): Promise<KnowledgeEntry> =>
  httpClient.request(`/v1/chatbot/admin/knowledge/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: draft,
  })

export const deleteKnowledge = (id: string): Promise<null> =>
  httpClient.delete(`/v1/chatbot/admin/knowledge/${encodeURIComponent(id)}`)

export interface KnowledgeDocument {
  readonly schemaVersion: number
  readonly entries: readonly {
    readonly intent: string
    readonly language: string
    readonly priority: number
    readonly question?: string
    readonly variations: readonly string[]
    readonly answer: string
    readonly view?: string | null
  }[]
}

export interface ImportResult {
  readonly created: number
  readonly skipped: number
  readonly reinforced?: number
}

export const exportKnowledge = (signal?: AbortSignal): Promise<KnowledgeDocument> =>
  httpClient.get('/v1/chatbot/admin/knowledge/export', signal)

export const importKnowledge = (document: KnowledgeDocument): Promise<ImportResult> =>
  httpClient.post('/v1/chatbot/admin/knowledge/import', document)

export interface SupportTicketRow {
  readonly id: string
  readonly actor: string
  readonly question: string
  readonly view: string | null
  readonly createdAt: string
}

export const fetchSupportTickets = (signal?: AbortSignal): Promise<readonly SupportTicketRow[]> =>
  httpClient.get('/v1/chatbot/admin/tickets', signal)
