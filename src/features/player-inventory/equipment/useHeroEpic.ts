import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import { isBattleLockError } from './battleLockPresentation'
import { equipEpicOnHero, fetchHeroEpic, type HeroEpicState } from './epicApi'

/**
 * Estado de la epica equipada de un heroe (HU-31). Solo se consulta cuando
 * hay un heroe propio seleccionado, mismo criterio que `useHeroEquipment`.
 */
export const useHeroEpic = (heroReference: string | null): UseQueryResult<HeroEpicState> =>
  useQuery({
    queryKey: queryKeys.inventory.heroEpic(heroReference ?? ''),
    queryFn: ({ signal }) => fetchHeroEpic(heroReference ?? '', signal),
    enabled: heroReference !== null && heroReference !== '',
  })

/**
 * Mutacion de equipar la epica. Mismo criterio que `useEquipItem`: sin
 * actualizacion optimista -la respuesta de `PUT` ya trae el nuevo estado
 * consistente y se escribe directamente en la cache de la consulta-.
 */
export const useEquipEpic = (
  heroReference: string | null,
): UseMutationResult<HeroEpicState, unknown, { readonly productReference: string }> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { readonly productReference: string }) =>
      equipEpicOnHero({
        heroReference: heroReference ?? '',
        productReference: variables.productReference,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.inventory.heroEpic(heroReference ?? ''), next)
    },
    onError: (error) => {
      // HU-29 (carrera): la lectura con la que se intento equipar podia decir
      // `locked: false` si la batalla empezo despues de esa lectura. Se vuelve
      // a pedir el estado real en vez de escribir algo sintetico en la cache.
      if (isBattleLockError(error)) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.heroEpic(heroReference ?? ''),
        })
      }
    },
  })
}
