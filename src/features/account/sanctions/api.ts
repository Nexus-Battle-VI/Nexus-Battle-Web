import { httpClient } from '@/lib/http'
import type { SanctionReasonCode, SanctionType } from '@/features/admin/sanctions/api'

export interface MySanctionEntry {
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

export interface MySanctionStatusResponse {
  readonly hasActiveSanctions: boolean
  readonly sanctions: readonly MySanctionEntry[]
  readonly remainingSeconds: number | null
}

/** HU-42, §7.3.2: contador visible del tiempo restante. */
export const fetchMySanctionStatus = (signal?: AbortSignal): Promise<MySanctionStatusResponse> =>
  httpClient.get('/accounts/me/sanctions/active', signal)
