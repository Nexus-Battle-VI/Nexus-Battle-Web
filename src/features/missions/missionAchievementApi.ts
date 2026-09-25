import { httpClient } from '@/lib/http'

export type AchievementStatus = 'LOCKED' | 'IN_PROGRESS' | 'UNLOCKED'
export type RecognitionStatus = 'RECORDED' | 'PENDING' | 'CREDITED' | 'FAILED'

export interface MissionAchievement {
  readonly achievementId: string
  readonly name: string
  readonly criterion:
    | 'ALL_CATEGORY_MISSIONS'
    | 'ALL_MASTERS_DEFEATED'
    | 'FLAWLESS_MISSION'
    | 'RECORD_TIME'
    | 'ALL_MASTER_EPICS'
  readonly status: AchievementStatus
  readonly progress: { readonly current: number; readonly target: number }
  readonly unlockedAt: string | null
  readonly recognition: {
    readonly kind: 'TITLE' | 'BADGE' | 'COSMETIC_PRODUCT'
    readonly name: string
    readonly status: RecognitionStatus | null
  }
}

export interface MissionAchievements {
  readonly items: readonly MissionAchievement[]
}

/** Missions toma al jugador del JWT y publica también los reconocimientos pendientes. */
export const fetchMissionAchievements = (signal?: AbortSignal): Promise<MissionAchievements> =>
  httpClient.get('/v1/missions/me/achievements', signal)
