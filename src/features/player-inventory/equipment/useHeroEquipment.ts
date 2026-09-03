import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import {
  equipItemOnHero,
  fetchHeroEquipment,
  type EquipmentSlotId,
  type HeroEquipment,
} from './api'

/**
 * Estado del equipamiento de un héroe. Solo se consulta cuando hay un héroe
 * propio seleccionado (`heroReference` no nulo): sin héroe no hay nada que
 * pedir.
 */
export const useHeroEquipment = (heroReference: string | null): UseQueryResult<HeroEquipment> =>
  useQuery({
    queryKey: queryKeys.inventory.heroEquipment(heroReference ?? ''),
    queryFn: ({ signal }) => fetchHeroEquipment(heroReference ?? '', signal),
    enabled: heroReference !== null && heroReference !== '',
  })

/**
 * Mutación de equipar. No hace actualización optimista: la operación puede
 * fallar por reglas del backend (capacidad, ranura ocupada, 503), y revertir un
 * loadout a mano es fragil. En su lugar, la respuesta de `PUT` ya trae el nuevo
 * estado consistente y se escribe directamente en la cache de la consulta.
 */
export const useEquipItem = (
  heroReference: string | null,
): UseMutationResult<
  HeroEquipment,
  unknown,
  { slot: EquipmentSlotId; productReference: string }
> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { slot: EquipmentSlotId; productReference: string }) =>
      equipItemOnHero({
        heroReference: heroReference ?? '',
        slot: variables.slot,
        productReference: variables.productReference,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.inventory.heroEquipment(heroReference ?? ''), next)
    },
  })
}
