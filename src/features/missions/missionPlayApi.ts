import { httpClient } from '@/lib/http'

import type { DifficultyLevel } from './api'
import type { MissionCategory } from './missionApi'

/**
 * Lo que el jugador ve mientras juega (diseño «misiones jugables»): las misiones en
 * curso, su bitácora revelada poco a poco y la probabilidad de éxito antes de
 * enviar al héroe. Missions decide todo: el tiempo, el progreso, lo que ya se puede
 * ver y el riesgo. Web solo lo pinta.
 */

// --- Misiones en curso (P-J6) ---

export interface ActiveMission {
  readonly enrollmentId: string
  readonly missionId: string
  readonly missionName: string
  readonly category: MissionCategory | null
  readonly imageRef: string | null
  readonly heroId: string
  readonly heroName: string | null
  readonly difficulty: DifficultyLevel
  readonly status: string
  readonly startedAt: string | null
  readonly endsAt: string | null
  /** 0 a 100, calculado por Missions con su reloj. */
  readonly progressPercent: number
  /** Segundos que faltan según Missions; `null` si aún no empezó. */
  readonly remainingSeconds: number | null
}

export interface ActiveMissions {
  readonly serverTime: string
  readonly items: readonly ActiveMission[]
}

/**
 * `GET /api/v1/missions/me/active`: el jugador sale del testimonio. La consulta la
 * hace el marco de la aplicación en todas las pantallas (aviso de fin), así que una
 * respuesta sin la forma esperada se lee como «ninguna misión en curso» en lugar de
 * romper la pantalla que el jugador está viendo.
 */
export const fetchActiveMissions = async (signal?: AbortSignal): Promise<ActiveMissions> => {
  const body = await httpClient.get<Partial<ActiveMissions> | null>(
    '/v1/missions/me/active',
    signal,
  )
  return {
    serverTime: typeof body?.serverTime === 'string' ? body.serverTime : '',
    items: Array.isArray(body?.items) ? body.items : [],
  }
}

// --- Bitácora de una misión en curso (P-J6) ---

export type ProgressKind =
  | 'ENCOUNTER_STARTED'
  | 'ENEMY_APPEARED'
  | 'HERO_ACTION'
  | 'ENEMY_GUARDED'
  | 'ENEMY_ACTION'
  | 'HERO_HEALED'
  | 'DEFEATED'
  | 'ENCOUNTER_FINISHED'
  | 'HERO_RECOVERED'
  | 'MISSION_FINISHED'

export type ProgressRole = 'ENEMY' | 'BOSS' | 'MASTER'

/** Una entrada ya traducida por Missions: nombres, no referencias internas. */
export interface ProgressEntry {
  readonly seq: number
  readonly turn: number
  readonly kind: ProgressKind
  readonly encounter?: number
  readonly boss?: boolean
  readonly enemy?: string
  readonly role?: ProgressRole
  readonly maxHealth?: number
  readonly ability?: string | null
  readonly attacked?: boolean
  readonly hit?: boolean
  readonly damage?: number
  readonly critical?: boolean
  readonly enemyHealth?: number
  readonly heroHealth?: number
  readonly enraged?: boolean
  readonly prevented?: number
  readonly reflected?: number
  readonly amount?: number
  readonly victory?: boolean
  readonly effects?: readonly Readonly<Record<string, unknown>>[]
}

export interface MissionProgress {
  readonly enrollmentId: string
  readonly missionId: string
  readonly missionName: string
  readonly difficulty: DifficultyLevel
  readonly status: string
  readonly startedAt: string | null
  readonly endsAt: string | null
  readonly serverTime: string
  readonly progressPercent: number
  readonly remainingSeconds: number | null
  readonly simulated: boolean
  readonly finished: boolean
  readonly reportAvailable: boolean
  readonly hero: {
    readonly heroId: string
    readonly name: string | null
    readonly maxHealth: number | null
    readonly health: number | null
  }
  /** Solo lo revelado después de `after`. */
  readonly entries: readonly ProgressEntry[]
  readonly lastSeq: number
  readonly nextRevealAt: string | null
}

/**
 * `GET /api/v1/missions/me/progress/{enrollmentId}?after=`: lo revelado desde la
 * última entrada que ya se tiene. Solo el dueño la ve.
 */
export const fetchMissionProgress = (
  enrollmentId: string,
  after: number,
  signal?: AbortSignal,
): Promise<MissionProgress> =>
  httpClient.get(
    `/v1/missions/me/progress/${encodeURIComponent(enrollmentId)}?after=${String(after)}`,
    signal,
  )

// --- Probabilidad de éxito antes de enviar al héroe (P-J7) ---

export type EstimateRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'

export interface EstimatedAbility {
  readonly abilityId: string
  readonly name: string
  /** Si la habilidad sirve en misiones; si no, `reason` dice por qué. */
  readonly usable: boolean
  readonly reason: string | null
}

export interface MissionEstimate {
  readonly missionId: string
  readonly heroId: string
  readonly difficulty: DifficultyLevel
  readonly strategyVersion: number | null
  readonly runs: number
  readonly successPercent: number
  readonly defeatPercent: number
  readonly timeoutPercent: number
  readonly risk: EstimateRisk
  readonly riskLabel: string
  readonly averageTurns: number
  readonly averageMinHealthPercent: number
  readonly masterAppearancePercent: number
  readonly abilities: readonly EstimatedAbility[]
}

/**
 * `GET /api/v1/missions/{missionId}/estimate?heroId=&difficulty=`. Combat simula la
 * misión varias veces con semillas propias: no adelanta el resultado real.
 */
export const fetchMissionEstimate = (
  missionId: string,
  heroId: string,
  difficulty: DifficultyLevel,
  signal?: AbortSignal,
): Promise<MissionEstimate> => {
  const query = new URLSearchParams({ heroId, difficulty })
  return httpClient.get(
    `/v1/missions/${encodeURIComponent(missionId)}/estimate?${query.toString()}`,
    signal,
  )
}
