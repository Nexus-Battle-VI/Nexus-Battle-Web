import { httpClient } from '@/lib/http'

export type SanctionType = 'WARNING' | 'TEMPORARY_SUSPENSION' | 'PERMANENT_BAN'

/** Catalogo oficial de HU-42 (§7.3.2) mas los dos codigos historicos de HU-90. */
export const SANCTION_REASON_CODES = [
  'OFFENSIVE_LANGUAGE',
  'HARASSMENT',
  'FRAUD_OR_MANIPULATION',
  'UNAUTHORIZED_SOFTWARE_OR_CHEATING',
  'IDENTITY_IMPERSONATION',
  'PRIVACY_POLICY_VIOLATION',
  'TERMS_OF_SERVICE_VIOLATION',
  'LEGAL_RELATIONSHIP_TERMINATION',
  'AUCTION_TERMS_VIOLATION',
  'OTHER',
] as const

export type SanctionReasonCode = (typeof SANCTION_REASON_CODES)[number]

export interface ApplySanctionInput {
  readonly type: SanctionType
  readonly reasonCode: SanctionReasonCode
  readonly reason: string
  readonly suspensionDurationMinutes?: number
}

export interface SanctionResponse {
  readonly id: string
  readonly targetAccountId: string
  readonly actorAccountId: string
  readonly type: SanctionType
  readonly reason: string
  readonly reasonCode: SanctionReasonCode
  readonly createdAt: string
  readonly expiresAt: string | null
  readonly appealDeadline: string
}

export const applySanction = (
  targetAccountId: string,
  input: ApplySanctionInput,
): Promise<SanctionResponse> =>
  httpClient.post(`/accounts/${encodeURIComponent(targetAccountId)}/sanctions`, input)

export type AppealStatus = 'SUBMITTED' | 'RESOLVED'
export type AppealDecision = 'UPHELD' | 'OVERTURNED'

export interface AppealResponse {
  readonly id: string
  readonly sanctionId: string
  readonly accountId: string
  readonly statement: string
  readonly submittedAt: string
  readonly decisionDueAt: string
  readonly status: AppealStatus
  readonly decision: AppealDecision | null
  readonly resolutionNotes: string | null
  readonly resolvedByAccountId: string | null
  readonly resolvedAt: string | null
}

export const fetchPendingAppeals = (signal?: AbortSignal): Promise<readonly AppealResponse[]> =>
  httpClient.get('/accounts/appeals', signal)

export interface ResolveAppealInput {
  readonly decision: AppealDecision
  readonly notes: string
}

export const resolveAppeal = (
  appealId: string,
  input: ResolveAppealInput,
): Promise<AppealResponse> =>
  httpClient.post(`/accounts/appeals/${encodeURIComponent(appealId)}/resolution`, input)
