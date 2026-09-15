import { httpClient } from '@/lib/http'

/** Tipos admitidos por Account en `ApplySanctionRequest`. */
export type SanctionType = 'WARNING' | 'TEMPORARY_SUSPENSION' | 'PERMANENT_BAN'

/** Request de `POST /accounts/:id/sanctions` (Account, HU-42). */
export interface ApplySanctionInput {
  readonly type: SanctionType
  readonly reason: string
  readonly suspensionDurationMinutes?: number
}

/** Response real de `POST /accounts/:id/sanctions` (Account, HTTP 201). */
export interface AppliedSanction {
  readonly id: string
  readonly targetAccountId: string
  readonly actorAccountId: string
  readonly type: SanctionType
  readonly reason: string
  readonly createdAt: string
  readonly expiresAt: string | null
  readonly appealDeadline: string
}

export const applySanction = (
  targetAccountId: string,
  input: ApplySanctionInput,
): Promise<AppliedSanction> =>
  httpClient.post<AppliedSanction>(
    `/accounts/${encodeURIComponent(targetAccountId)}/sanctions`,
    input,
  )
