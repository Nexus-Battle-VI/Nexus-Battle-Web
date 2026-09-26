import type { MissionReport, MissionReportRewardLine } from './api'
import { localizedMessages } from '@/shared/i18n/messages'

/**
 * Lectura del informe de misión (HU-74) y de su experiencia (HU-09, Task HU-09.5).
 *
 * AQUÍ NO SE CALCULA NADA DE JUEGO. El agregado de experiencia lo publica Missions
 * ya resuelto -- derrotas, experiencia acreditada, desglose por estado y el nivel en
 * que quedó el héroe --, y esto solo lo lee sin fiarse de su forma: un servicio
 * anterior a HU-09.5 no trae el bloque y un campo suelto puede faltar.
 *
 * Lo que NO se hace, a propósito, es reconstruir el agregado contando las líneas del
 * informe: sería duplicar en Web la regla que ya vive en Missions, y las dos copias
 * acabarían discrepando.
 */

/** La experiencia de la misión, tal como la consume la pantalla. */
export interface MissionExperience {
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

/** Las líneas de experiencia del informe; el resto de recompensas no se tocan aquí. */
export const experienceLinesOf = (report: MissionReport): readonly MissionReportRewardLine[] =>
  report.rewards.filter((line) => line.source === 'HU-09' && line.kind === 'EXPERIENCE')

/** Un entero no negativo, o `null` si el dato no tiene esa forma. */
const countOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null

/** Un entero que falta no rompe la pantalla: cuenta como cero. */
const countOrZero = (value: unknown): number => countOf(value) ?? 0

/** Un nivel empieza en 1; `0` o un negativo no son un nivel. */
const levelOrNull = (value: unknown): number | null => {
  const level = countOf(value)

  return level !== null && level >= 1 ? level : null
}

/**
 * El bloque `experience` del informe, o `null` si el informe no lo trae (un
 * servicio anterior a HU-09.5) o no identifica ni las derrotas.
 *
 * `defeats` es el dato que da sentido al bloque -- sin él no se puede decir nada
 * del resto --, así que su ausencia invalida la lectura entera. Los demás campos se
 * leen con tolerancia: un contador que falta es cero, y un nivel que falta es
 * `null` (que no es lo mismo que un nivel 0, que no existe).
 */
export const readExperience = (report: MissionReport): MissionExperience | null => {
  const raw: unknown = report.experience

  if (typeof raw !== 'object' || raw === null) {
    return null
  }

  const source = raw as Record<string, unknown>
  const defeats = countOf(source.defeats)

  if (defeats === null) {
    return null
  }

  return {
    defeats,
    credited: countOrZero(source.credited),
    pending: countOrZero(source.pending),
    failed: countOrZero(source.failed),
    totalXp: countOrZero(source.totalXp),
    level: levelOrNull(source.level),
    currentXp: countOf(source.currentXp),
    maxLevel: levelOrNull(source.maxLevel),
    levelsGained: countOrZero(source.levelsGained),
    // Se lee tal cual lo publica Missions; `levelsGained` sirve para CONTAR la
    // subida, no para decidir si la hubo.
    leveledUp: source.leveledUp === true,
  }
}

const DIFFICULTY_LABELS: Readonly<Record<string, string>> = localizedMessages({
  NORMAL: 'missions:reportDifficulty.NORMAL',
  HEROIC: 'missions:reportDifficulty.HEROIC',
  LEGENDARY: 'missions:reportDifficulty.LEGENDARY',
  MYTHIC: 'missions:reportDifficulty.MYTHIC',
})

const OUTCOME_LABELS: Readonly<Record<string, string>> = localizedMessages({
  COMPLETED: 'missions:outcome.COMPLETED',
  FAILED: 'missions:outcome.FAILED',
  ABANDONED: 'missions:outcome.ABANDONED',
})

/** La dificultad del informe en texto; un valor nuevo se muestra tal cual. */
export const difficultyLabel = (difficulty: string): string =>
  DIFFICULTY_LABELS[difficulty] ?? difficulty

/** El desenlace del informe en texto; un valor nuevo se muestra tal cual. */
export const outcomeLabel = (outcome: string): string => OUTCOME_LABELS[outcome] ?? outcome
