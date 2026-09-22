import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { fetchWallet, type WalletSnapshot } from './api'

/** Saldo y progreso de cofre del jugador autenticado (HU-22). `null` sin sesion. */
export const useWallet = (): UseQueryResult<WalletSnapshot> => {
  const subject = useSession((state) => state.subject)

  return useQuery({
    queryKey: queryKeys.wallet.me,
    queryFn: ({ signal }) => fetchWallet(signal),
    enabled: subject !== null,
  })
}
