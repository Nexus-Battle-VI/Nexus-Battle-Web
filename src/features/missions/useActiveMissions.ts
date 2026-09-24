import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { fetchActiveMissions } from './missionPlayApi'

/** Cada cuánto se vuelve a preguntar: el servidor dice cuánto falta en cada respuesta. */
export const ACTIVE_REFRESH_MS = 30_000

/**
 * Las misiones en curso del jugador (P-J6). La comparten el panel del tablón y el
 * aviso de fin: con la misma clave, TanStack Query hace una sola petición.
 */
export const useActiveMissions = () => {
  const subject = useSession((state) => state.subject)
  return useQuery({
    queryKey: queryKeys.missions.active(subject),
    queryFn: ({ signal }) => fetchActiveMissions(signal),
    enabled: subject !== null,
    refetchInterval: ACTIVE_REFRESH_MS,
  })
}
