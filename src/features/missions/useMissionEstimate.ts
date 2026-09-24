import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

import type { DifficultyLevel } from './api'
import { fetchMissionEstimate, type MissionEstimate } from './missionPlayApi'

/** Una estimación no cambia mientras no cambie la pregunta: 5 minutos sin volver a pedirla. */
const ESTIMATE_STALE_MS = 5 * 60_000

export interface EstimateQuestion {
  readonly missionId: string
  readonly heroId: string | null
  /** Sin nivel elegido se estima Normal: basta para saber qué habilidades sirven. */
  readonly difficulty: DifficultyLevel | null
  readonly strategyVersion: number | null
  /** La estrategia está guardada: se estima con ella, no con un borrador. */
  readonly ready: boolean
}

/** La probabilidad de éxito que calcula Missions con Combat (P-J7). */
export const useMissionEstimate = (question: EstimateQuestion): UseQueryResult<MissionEstimate> => {
  const subject = useSession((state) => state.subject)
  const difficulty = question.difficulty ?? 'NORMAL'
  return useQuery({
    queryKey: queryKeys.missions.estimate(
      subject,
      question.missionId,
      question.heroId ?? '',
      difficulty,
      question.strategyVersion,
    ),
    queryFn: ({ signal }) =>
      fetchMissionEstimate(question.missionId, question.heroId ?? '', difficulty, signal),
    enabled: subject !== null && question.heroId !== null && question.ready,
    staleTime: ESTIMATE_STALE_MS,
    retry: false,
  })
}
