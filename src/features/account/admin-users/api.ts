import { httpClient, type HttpDownload } from '@/lib/http'

export type AdminAccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED'
export type AdminAccountRole = 'PLAYER' | 'MODERATOR' | 'ADMINISTRATOR' | 'SUPER_ADMINISTRATOR'

export interface AdminAccountSummary {
  readonly id: string
  readonly email: string
  readonly displayName: string
  readonly firstNames: string
  readonly lastNames: string
  readonly status: AdminAccountStatus
  readonly roles: readonly AdminAccountRole[]
  readonly registeredAt: string
}

export interface AdminAccountStatusCounts {
  readonly pendingVerification: number
  readonly active: number
  readonly suspended: number
}

export interface AdminAccountsResponse {
  readonly items: readonly AdminAccountSummary[]
  readonly statusCounts: AdminAccountStatusCounts
}

export interface AdminAccountQueryCriteria {
  readonly id?: string
  readonly email?: string
  readonly firstNames?: string
  readonly lastNames?: string
  readonly displayName?: string
  readonly role?: AdminAccountRole
  readonly status?: AdminAccountStatus
}

const appendText = (params: URLSearchParams, key: string, value: string | undefined): void => {
  const normalized = value?.trim()

  if (normalized !== undefined && normalized.length > 0) {
    params.set(key, normalized)
  }
}

/** Los parametros y su orden reflejan exactamente ListAdminAccountsQuery de Account. */
export const buildAdminAccountsQuery = (criteria: AdminAccountQueryCriteria): string => {
  const params = new URLSearchParams()

  appendText(params, 'id', criteria.id)
  appendText(params, 'email', criteria.email)
  appendText(params, 'firstNames', criteria.firstNames)
  appendText(params, 'lastNames', criteria.lastNames)
  appendText(params, 'nickname', criteria.displayName)
  appendText(params, 'role', criteria.role)
  appendText(params, 'status', criteria.status)

  const query = params.toString()

  return query.length === 0 ? '' : `?${query}`
}

export const fetchAdminAccounts = (
  criteria: AdminAccountQueryCriteria,
  signal?: AbortSignal,
): Promise<AdminAccountsResponse> =>
  httpClient.get<AdminAccountsResponse>(`/accounts${buildAdminAccountsQuery(criteria)}`, signal)

export const downloadAdminAccounts = (
  criteria: AdminAccountQueryCriteria,
  signal?: AbortSignal,
): Promise<HttpDownload> =>
  httpClient.download(`/accounts/export${buildAdminAccountsQuery(criteria)}`, signal)

export const saveAdminAccountsDownload = (file: HttpDownload): void => {
  const url = URL.createObjectURL(file.content)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.filename ?? 'nexus-battles-users.json'
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
