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
  unequipItemFromHero,
  type EquipmentSlotId,
  type HeroEquipment,
} from './api'
import { isBattleLockError } from './battleLockPresentation'

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
      // La seleccion preparada (HU-07) incluye su propia copia del equipamiento,
      // la capacidad 2/6/2 y la elegibilidad: si se equipo el heroe preparado,
      // quedarian desactualizadas hasta el siguiente refetch. Se piden de nuevo
      // al servicio en lugar de recalcularlas aqui.
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.heroSelection })
    },
    onError: (error) => {
      // HU-29 (carrera): la lectura con la que se intento equipar podia decir
      // `locked: false` si la batalla empezo despues de esa lectura. No se
      // escribe nada sintetico en la cache -eso simularia un cambio que no
      // ocurrio-: se vuelve a pedir el estado real, que ya traera `locked: true`.
      if (isBattleLockError(error)) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.heroEquipment(heroReference ?? ''),
        })
      }
    },
  })
}

/**
 * Mutación de desequipar (HU-28.4). Mismo patrón que `useEquipItem`: sin
 * actualización optimista, la respuesta de `DELETE` trae el nuevo estado
 * consistente (ranura vacía, stats/efectos/capacidad recalculados) y se
 * escribe directamente en la caché; la selección preparada se vuelve a pedir
 * por la misma razón que al equipar.
 */
export const useUnequipItem = (
  heroReference: string | null,
): UseMutationResult<HeroEquipment, unknown, { slot: EquipmentSlotId }> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { slot: EquipmentSlotId }) =>
      unequipItemFromHero({ heroReference: heroReference ?? '', slot: variables.slot }),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.inventory.heroEquipment(heroReference ?? ''), next)
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.heroSelection })
    },
    onError: (error) => {
      if (isBattleLockError(error)) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.heroEquipment(heroReference ?? ''),
        })
      }
    },
  })
}
