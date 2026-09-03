import { useMutation, useQuery } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import {
  buildAdminAccountsQuery,
  downloadAdminAccounts,
  fetchAdminAccounts,
  type AdminAccountQueryCriteria,
  type AdminAccountsResponse,
} from './api'
import type { HttpDownload } from '@/lib/http'

export type AdminAccountsTransport = (
  criteria: AdminAccountQueryCriteria,
  signal?: AbortSignal,
) => Promise<AdminAccountsResponse>

export type AdminAccountsExportTransport = (
  criteria: AdminAccountQueryCriteria,
) => Promise<HttpDownload>

export const useAdminAccounts = (
  criteria: AdminAccountQueryCriteria,
  transport: AdminAccountsTransport = fetchAdminAccounts,
): UseQueryResult<AdminAccountsResponse> => {
  const criteriaKey = buildAdminAccountsQuery(criteria)

  return useQuery({
    queryKey: queryKeys.account.adminUsers(criteriaKey),
    queryFn: ({ signal }) => transport(criteria, signal),
  })
}

export const useAdminAccountsExport = (
  transport: AdminAccountsExportTransport = downloadAdminAccounts,
): UseMutationResult<HttpDownload, unknown, AdminAccountQueryCriteria> =>
  useMutation({ mutationFn: (criteria) => transport(criteria) })
