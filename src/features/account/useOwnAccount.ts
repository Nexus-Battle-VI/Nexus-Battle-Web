import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import {
  fetchOwnAccount,
  fetchOwnPersonalData,
  updateOwnAccount,
  type OwnAccount,
  type OwnAccountEdit,
  type OwnPersonalData,
} from './api'

/**
 * Estado servidor de la cuenta propia (HU-05.4).
 *
 * Vive en TanStack Query -no en Zustand-: es un recurso del backend, no una
 * preferencia de cliente. `useSession` sigue siendo la unica fuente de la
 * sesion; esto es la cuenta que hay detras de esa sesion, y se refresca sola.
 */
export const useOwnAccount = (): UseQueryResult<OwnAccount> =>
  useQuery({
    queryKey: queryKeys.account.me,
    queryFn: ({ signal }) => fetchOwnAccount(signal),
  })

/**
 * Estado servidor de los datos personales autorizados para HU-45.4.
 *
 * Se consulta por contrato propio (`GET /api/accounts/me/privacy`) y se separa
 * de `AccountResponse`: el portal de privacidad no consume identificadores
 * tecnicos ni estado general de cuenta.
 */
export const useOwnPersonalData = (): UseQueryResult<OwnPersonalData> =>
  useQuery({
    queryKey: queryKeys.account.privacy,
    queryFn: ({ signal }) => fetchOwnPersonalData(signal),
  })

/**
 * Mutacion de la informacion personal editable. Al confirmar el backend, se
 * escribe la respuesta en cache y se invalida la consulta: la UI refleja lo que
 * Account devolvio, nunca un valor optimista sin confirmar.
 *
 * `transport` se inyecta solo en pruebas y en la vista previa de desarrollo
 * -mismo patron que `TotpEnrollment`-; en produccion es siempre
 * `updateOwnAccount` contra `PATCH /api/accounts/me`.
 */
export const useUpdateOwnAccount = (
  transport: (edit: OwnAccountEdit) => Promise<OwnAccount> = updateOwnAccount,
): UseMutationResult<OwnAccount, unknown, OwnAccountEdit> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (edit: OwnAccountEdit) => transport(edit),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.account.me, updated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.account.privacy })
      void queryClient.invalidateQueries({ queryKey: queryKeys.account.me })
    },
  })
}
