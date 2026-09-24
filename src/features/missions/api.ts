import { httpClient } from '@/lib/http'

// --- Dificultad de una misión (HU-75) ---

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
  /**
   * Lo que el nivel cambia además de las estadísticas (diseño «misiones jugables»,
   * P-J8). Opcionales: un Missions anterior no los envía y la interfaz los omite.
   */
  readonly extraEnemiesPerEncounter?: number
  readonly bossEnrageBonus?: number
  readonly lootBonusPercent?: number
  readonly masterBonusPercent?: number
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

// --- Informe de una misión terminada (HU-74 + experiencia de HU-09) ---

/**
 * Informe de una misión terminada (HU-74, contrato `hu-74-mission-report-v1`) con
 * el bloque de experiencia de HU-09 (Task HU-09.5).
 *
 * `GET /api/v1/missions/me/reports/{enrollmentId}`. SIEMPRE el informe propio: el
 * jugador sale del testimonio, así que Web nunca envía un identificador de jugador
 * ni puede leer el informe de otra persona (Missions responde lo mismo que si no
 * existiera, a propósito).
 *
 * Mientras la misión sigue en curso el servicio responde `404 REPORT_NOT_AVAILABLE`
 * con su fecha de fin; cuando ya terminó, el informe es una foto inmutable: lo
 * único que cambia con el tiempo es el estado de cada recompensa.
 */

/** Una línea de recompensa. Solo se LEE: su estado lo decide Missions. */
export interface MissionReportRewardLine {
  readonly kind: string
  readonly reference: string | null
  readonly name: string
  readonly rarity: string | null
  readonly quantity: number
  readonly status: string
  readonly source: string
}

/**
 * La experiencia de la misión, ya agregada por Missions (HU-09, Task HU-09.5).
 *
 * OPCIONAL a propósito: contra un Missions anterior a esa task el informe no trae
 * el bloque, y la pantalla lo dice en lugar de inventar ceros. `level`, `currentXp`
 * y `maxLevel` son `null` mientras no haya ninguna acreditación: el nivel lo
 * calcula Player/Inventory con su tabla de HU-08, nunca Web.
 */
export interface MissionReportExperience {
  readonly defeats: number
  readonly totalXp: number
  readonly credited: number
  readonly pending: number
  readonly failed: number
  readonly level: number | null
  readonly currentXp: number | null
  readonly maxLevel: number | null
  readonly levelsGained: number
  readonly leveledUp: boolean
}

export interface MissionReportHero {
  readonly heroId: string
  readonly name: string | null
  readonly subtype: string | null
}

export interface MissionReportSummary {
  readonly outcome: string
  readonly outcomeReason: string | null
  readonly hero: MissionReportHero
  readonly startedAt: string
  readonly finishedAt: string
  readonly simulatedDuration: string | null
}

export interface MissionReport {
  readonly schemaVersion: number
  readonly enrollmentId: string
  readonly mission: {
    readonly missionId: string
    readonly name: string
    readonly category: string
    readonly difficulty: string
  }
  readonly summary: MissionReportSummary
  readonly rewards: readonly MissionReportRewardLine[]
  readonly experience?: MissionReportExperience
  readonly generatedAt: string
}

export const fetchMissionReport = (
  enrollmentId: string,
  signal?: AbortSignal,
): Promise<MissionReport> =>
  httpClient.get<MissionReport>(
    `/v1/missions/me/reports/${encodeURIComponent(enrollmentId)}`,
    signal,
  )
