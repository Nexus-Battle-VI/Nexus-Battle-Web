import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import {
  fetchAvailableHeroes,
  fetchHeroSelection,
  selectHero,
  type AvailableHero,
  type HeroSelection,
} from './heroSelectionApi'

export const useAvailableHeroes = (): UseQueryResult<readonly AvailableHero[]> =>
  useQuery({
    queryKey: queryKeys.inventory.availableHeroes,
    queryFn: ({ signal }) => fetchAvailableHeroes(signal),
  })

/**
 * Configuración preparada. `null` es un dato legítimo —todavía no se ha elegido
 * héroe—, no un error, y por eso la consulta no se marca como fallida.
 */
export const useHeroSelection = (): UseQueryResult<HeroSelection | null> =>
  useQuery({
    queryKey: queryKeys.inventory.heroSelection,
    queryFn: ({ signal }) => fetchHeroSelection(signal),
  })

/**
 * Preparar un héroe.
 *
 * NO HAY ACTUALIZACIÓN OPTIMISTA: la operación puede fallar por reglas del
 * servicio —héroe suspendido, ya no está en el inventario, catálogo caído— y
 * revertir a mano dejaría la pantalla afirmando algo falso. La respuesta del
 * `PUT` ya trae el estado consistente y se escribe directamente en la caché.
 *
 * El catálogo de héroes SÍ se invalida: `selected` cambia de fila, y ese dato
 * lo decide el servicio.
 */
export const useSelectHero = (): UseMutationResult<HeroSelection, unknown, string> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (heroReference: string) => selectHero(heroReference),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.inventory.heroSelection, next)
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availableHeroes })
    },
  })
}
