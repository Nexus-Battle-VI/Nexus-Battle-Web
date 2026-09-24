import { httpClient } from '@/lib/http'

/**
 * Vocabulario del contrato hu-75-mission-difficulty-v1. Missions es su dueno:
 * aqui solo se lee, nunca se decide.
 */
export type DifficultyLevel = 'NORMAL' | 'HEROIC' | 'LEGENDARY' | 'MYTHIC'

export type RewardTier = 'STANDARD' | 'IMPROVED' | 'PREMIUM' | 'EXCLUSIVE'

export interface MissionDifficulty {
  readonly difficulty: DifficultyLevel
  /** Resuelto por Missions a partir del progreso del jugador. La interfaz no lo recalcula. */
  readonly unlocked: boolean
  /** Motivo redactado por Missions; se muestra tal cual. `null` si el nivel esta libre. */
  readonly lockReason: string | null
  /** Factor sobre las estadisticas enemigas. `null` en MYTHIC mientras el PO no fije un valor. */
  readonly enemyStatMultiplier: number | null
  readonly rewardTier: RewardTier
}

export interface MissionDifficulties {
  readonly missionId: string
  readonly items: readonly MissionDifficulty[]
}

/**
 * `GET /api/v1/missions/{missionId}/difficulties` (Task HU-75.2). El jugador lo
 * deduce Missions del testimonio: no viaja en la URL.
 */
export const fetchMissionDifficulties = (
  missionId: string,
  signal?: AbortSignal,
): Promise<MissionDifficulties> =>
  httpClient.get<MissionDifficulties>(
    `/v1/missions/${encodeURIComponent(missionId)}/difficulties`,
    signal,
  )
