import { httpClient } from '@/lib/http'

import type { DifficultyLevel } from './api'

export type MissionCategory = 'STORY' | 'CHALLENGE' | 'EXPLORATION'
export type PlayerMissionStatus =
  'AVAILABLE' | 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ABANDONED'

export interface MissionBoardFilters {
  readonly category: MissionCategory | null
  readonly status: PlayerMissionStatus | null
}

export interface MissionCard {
  readonly missionId: string
  readonly name: string
  readonly category: MissionCategory
  readonly summary: string
  readonly imageRef: string | null
  readonly estimatedDuration: string
  readonly recommendedPower: number | null
  readonly highlightedRewards: readonly { readonly label: string }[]
  readonly playerStatus: PlayerMissionStatus
  readonly canEnroll: boolean
  readonly lockReason: string | null
  readonly activeEnrollmentId: string | null
}

export interface MissionDetail {
  readonly missionId: string
  readonly name: string
  readonly category: MissionCategory
  readonly narrative: string
  /** La ilustración (P-J11); un Missions anterior no la envía y se usa la de la categoría. */
  readonly imageRef?: string | null
  readonly objectives: readonly {
    readonly id: string
    readonly text: string
    readonly primary: boolean
  }[]
  readonly estimatedDuration: string
  readonly recommendedPower: number | null
  readonly prerequisites: readonly string[]
  /** Las mismas con su nombre (P-J10); un Missions anterior no las envía. */
  readonly prerequisiteMissions?: readonly { readonly missionId: string; readonly name: string }[]
  readonly enemies: readonly {
    readonly name: string
    readonly count: number
    readonly description: string | null
  }[]
  readonly finalBoss: {
    readonly name: string
    readonly heroType: string | null
    readonly description: string | null
    readonly stats: Readonly<Record<string, number>>
  }
  readonly masterEncounter: {
    readonly probability: number
    readonly candidates: readonly {
      readonly name: string
      readonly heroType: string
      readonly probabilityByHeroType: Readonly<Record<string, number>>
      /**
       * `null` si la épica todavía no es un producto que se pueda entregar (P-J2):
       * el Máster aparece igual, pero no se promete una recompensa que no llega.
       */
      readonly epic: {
        readonly name: string
        readonly generalEffect: string | null
        readonly epicEffect: string | null
      } | null
    }[]
  }
  readonly rewards: {
    /** Missions acredita experiencia por cada enemigo derrotado (HU-09). */
    readonly experience?: boolean
    readonly guaranteed: readonly { readonly label: string }[]
    readonly potential: readonly {
      readonly label: string
      readonly probability: number
      readonly rolls: number
    }[]
    readonly objectiveBonuses: readonly { readonly label: string }[]
    readonly firstTime: readonly { readonly label: string }[]
  }
  readonly playerStatus: PlayerMissionStatus
  readonly canEnroll: boolean
  readonly lockReason: string | null
}

export interface MissionEnrollment {
  readonly enrollmentId: string
  readonly missionId: string
  readonly heroId: string
  readonly difficulty: DifficultyLevel
  readonly status: string
  readonly startedAt: string | null
  readonly endsAt: string | null
}

export interface EnrollmentAttempt {
  readonly missionId: string
  readonly heroId: string
  readonly difficulty: DifficultyLevel
  readonly idempotencyKey: string
  readonly strategyVersion?: number | null
}

/** Missions deduce el jugador del JWT; sus filtros son el vocabulario del servicio. */
export const fetchMissionBoard = (
  filters: MissionBoardFilters,
  signal?: AbortSignal,
): Promise<{ readonly items: readonly MissionCard[] }> => {
  const query = new URLSearchParams()
  if (filters.category !== null) query.set('category', filters.category)
  if (filters.status !== null) query.set('status', filters.status)
  const suffix = query.size === 0 ? '' : `?${query.toString()}`
  return httpClient.get(`/v1/missions${suffix}`, signal)
}

export const fetchMissionDetail = (
  missionId: string,
  signal?: AbortSignal,
): Promise<MissionDetail> => httpClient.get(`/v1/missions/${encodeURIComponent(missionId)}`, signal)

/** La clave se crea en la UI al pulsar y se reutiliza al reintentar esa operación. */
export const enrollInMission = (attempt: EnrollmentAttempt): Promise<MissionEnrollment> =>
  httpClient.post(
    `/v1/missions/${encodeURIComponent(attempt.missionId)}/enrollments`,
    {
      heroId: attempt.heroId,
      difficulty: attempt.difficulty,
      ...(attempt.strategyVersion === undefined
        ? {}
        : { strategyVersion: attempt.strategyVersion }),
    },
    { 'Idempotency-Key': attempt.idempotencyKey },
  )
