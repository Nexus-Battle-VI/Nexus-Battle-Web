import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import { fetchMissionDifficulties, type MissionDifficulties } from './api'

/**
 * Niveles de dificultad de una mision para el jugador autenticado (HU-75).
 * Sin sesion no consulta: el desbloqueo es propio de cada jugador.
 */
export const useMissionDifficulties = (missionId: string): UseQueryResult<MissionDifficulties> => {
  const subject = useSession((state) => state.subject)

  return useQuery({
    queryKey: queryKeys.missions.difficulties(subject, missionId),
    queryFn: ({ signal }) => fetchMissionDifficulties(missionId, signal),
    enabled: subject !== null,
  })
}
