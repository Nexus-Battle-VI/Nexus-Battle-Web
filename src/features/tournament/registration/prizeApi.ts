import { httpClient } from '@/lib/http'
export interface PrizeConfigurationInput {
  operationId: string
  allocations: { memberIndex: 0 | 1; credits: string; epicProductId: string | null }[]
}
export interface PrizeView {
  configuration: (PrizeConfigurationInput & { approvedBy: string; approvedAt: string }) | null
  champion: {
    teamId: string
    teamName?: string
    memberIds: readonly [string, string]
    heroes: { playerId: string; heroId: string }[]
    finalEncounterId: string
    finalRoomId: string
    declaredAt: string
  } | null
  delivery: {
    status: 'PENDING' | 'PARTIAL' | 'COMPLETED'
    requestedBy: string
    requestedAt: string
    lines: {
      operationId: string
      playerId: string
      heroId: string
      kind: 'CREDITS' | 'EPIC'
      amount: string | null
      productId: string | null
      status: 'PENDING' | 'DELIVERED'
      receiptId: string | null
      deliveredAt: string | null
      lastError: string | null
    }[]
  } | null
}
export interface PrizeApi {
  view: (id: string, signal?: AbortSignal) => Promise<PrizeView>
  approve: (id: string, configuration: PrizeConfigurationInput) => Promise<PrizeView>
  deliver: (id: string) => Promise<PrizeView>
}
export const prizeApi: PrizeApi = {
  view: (id, signal) => httpClient.get(`/v1/tournaments/${encodeURIComponent(id)}/prize`, signal),
  approve: (id, configuration) =>
    httpClient.post(
      `/v1/tournaments/admin/${encodeURIComponent(id)}/prize/configuration`,
      configuration,
    ),
  deliver: (id) =>
    httpClient.post(`/v1/tournaments/admin/${encodeURIComponent(id)}/prize/deliver`, {}),
}
