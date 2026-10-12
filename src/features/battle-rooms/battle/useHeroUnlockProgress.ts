import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'

import { fetchMyHeroesProgress } from './api'
import type { HeroUnlockProgress } from './skillPresentation'

/**
 * EN-031: XP del heroe con el que juego, para el texto de una habilidad bloqueada. Solo se pide
 * si hay alguna bloqueada; un fallo no estorba la batalla (el texto queda en «nivel N»).
 */
export const useHeroUnlockProgress = (
  heroId: string | null,
  enabled: boolean,
): HeroUnlockProgress | null => {
  const query = useQuery({
    queryKey: queryKeys.inventory.availableHeroes,
    queryFn: ({ signal }) => fetchMyHeroesProgress(signal),
    enabled: enabled && heroId !== null,
    staleTime: 60_000,
  })
  const hero = query.data?.find((entry) => entry.heroId === heroId)

  if (hero === undefined) {
    return null
  }

  const { currentXp, nextLevel } = hero.progression

  return {
    currentXp,
    nextLevel: nextLevel.forNextLevel,
    nextLevelXp: nextLevel.amount,
  }
}
