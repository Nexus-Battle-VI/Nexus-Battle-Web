import { httpClient } from '@/lib/http'

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
