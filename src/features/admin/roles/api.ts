import { httpClient } from '@/lib/http'

export const ASSIGNABLE_ROLES = ['MODERATOR', 'ADMINISTRATOR'] as const
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

export interface AccountRoleView {
  readonly id: string
  readonly email: string
  readonly displayName: string
  readonly status: string
  readonly roles: readonly string[]
}

export interface ManagedAccount extends AccountRoleView {
  readonly mfaEnrolled: boolean
}

export const findAccountByEmail = (email: string): Promise<ManagedAccount> =>
  httpClient.get<ManagedAccount>(`/accounts/search?email=${encodeURIComponent(email.trim())}`)

export const assignRole = (accountId: string, role: AssignableRole): Promise<AccountRoleView> =>
  httpClient.post<AccountRoleView>(`/accounts/${encodeURIComponent(accountId)}/roles`, { role })

export const revokeRole = (accountId: string, role: AssignableRole): Promise<AccountRoleView> =>
  httpClient.delete<AccountRoleView>(
    `/accounts/${encodeURIComponent(accountId)}/roles/${encodeURIComponent(role)}`,
  )
