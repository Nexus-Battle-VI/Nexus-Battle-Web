import { httpClient } from '@/lib/http'

import type { DifficultyLevel } from './api'
import type { MissionCategory } from './missionApi'

export type MissionOutcome = 'COMPLETED' | 'FAILED' | 'ABANDONED' | 'VOIDED'
export type RewardStatus = 'PENDING' | 'CREDITED' | 'FAILED'

export interface MissionHistoryItem {
  readonly enrollmentId: string
  readonly missionId: string
  readonly name: string
  readonly category: MissionCategory | null
  readonly difficulty: DifficultyLevel
  readonly outcome: MissionOutcome
  readonly finishedAt: string
  readonly simulatedDuration: string | null
  readonly reportAvailable: boolean
}

export interface MissionHistoryPage {
  readonly items: readonly MissionHistoryItem[]
  readonly nextCursor: string | null
}

export interface MissionHistorySummary {
  readonly byCategory: readonly {
    readonly category: MissionCategory
    readonly completed: number
    readonly failed: number
    readonly abandoned: number
    readonly damageDealt: number
    readonly damageTaken: number
  }[]
  readonly bestTimes: readonly {
    readonly missionId: string
    readonly difficulty: DifficultyLevel
    readonly simulatedDuration: string
    readonly enrollmentId: string
  }[]
  readonly epicCollection: readonly {
    readonly epicRef: string
    readonly name: string
    readonly masterRef: string | null
    readonly obtainedAt: string
    readonly status: RewardStatus
  }[]
  readonly narrativeProgress: readonly {
    readonly chainId: string
    readonly missions: readonly string[]
    readonly completed: number
    readonly total: number
  }[]
}

export interface MissionReport {
  readonly schemaVersion: number
  readonly enrollmentId: string
  readonly mission: {
    readonly missionId: string
    readonly name: string
    readonly category: MissionCategory
    readonly difficulty: DifficultyLevel
  }
  readonly summary: {
    readonly outcome: Exclude<MissionOutcome, 'VOIDED'>
    readonly outcomeReason: string | null
    readonly hero: {
      readonly heroId: string
      readonly name: string | null
      readonly subtype: string | null
    }
    readonly startedAt: string
    readonly finishedAt: string
    readonly simulatedDuration: string | null
  }
  readonly combatStats: {
    readonly encountersCompleted: number | null
    readonly encountersTotal: number | null
    readonly totalTurns: number | null
    readonly damageDealt: number | null
    readonly damageTaken: number | null
    readonly criticalEffects: number | null
    readonly skillsUsed: readonly { readonly abilityId: string; readonly count: number }[]
  }
  readonly enemies: {
    readonly defeated: readonly {
      readonly enemyRef: string
      readonly name: string
      readonly count: number
    }[]
    readonly boss: {
      readonly enemyRef: string
      readonly name: string
      readonly defeated: boolean
    }
    readonly masters: readonly {
      readonly masterRef: string
      readonly name: string
      readonly status: string
    }[]
  }
  readonly objectives: readonly {
    readonly id: string
    readonly text: string
    readonly primary: boolean
    readonly met: boolean | null
    readonly bonus: null
  }[]
  readonly rewards: readonly {
    readonly kind: 'CREDITS' | 'PRODUCT' | 'EPIC' | 'EXPERIENCE'
    readonly reference: string | null
    readonly name: string
    readonly rarity: string | null
    readonly quantity: number
    readonly status: RewardStatus
    readonly source: 'HU-10' | 'HU-73'
  }[]
  readonly generatedAt: string
}

/** El cursor es opaco: se reenvía exactamente como lo dio Missions. */
export const fetchMissionHistory = (
  cursor: string | null,
  signal?: AbortSignal,
): Promise<MissionHistoryPage> =>
  httpClient.get(
    `/v1/missions/me/history${cursor === null ? '' : `?cursor=${encodeURIComponent(cursor)}`}`,
    signal,
  )

export const fetchMissionHistorySummary = (signal?: AbortSignal): Promise<MissionHistorySummary> =>
  httpClient.get('/v1/missions/me/history/summary', signal)

export const fetchMissionReport = (
  enrollmentId: string,
  signal?: AbortSignal,
): Promise<MissionReport> =>
  httpClient.get(`/v1/missions/me/reports/${encodeURIComponent(enrollmentId)}`, signal)
