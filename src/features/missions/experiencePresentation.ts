import type { MissionExperience } from './missionReport'
import { i18n } from '@/shared/i18n/i18n'
import { localizedMessages } from '@/shared/i18n/messages'

/**
 * Textos del panel de experiencia (HU-09, Task HU-09.5). Módulo PURO: recibe el
 * bloque ya resuelto por Missions y solo decide CÓMO contarlo.
 *
 * NO DECIDE NADA DE JUEGO: la experiencia acreditada, el nivel y los niveles
 * cruzados vienen del servidor. Aquí no hay umbrales, ni progreso hacia el nivel
 * siguiente, ni sumas: la única aritmética es la de pluralizar.
 */

/** Los tres estados que puede contar el bloque, para quien no sepa de recompensas. */
export type ExperienceState = 'PENDING' | 'CREDITED' | 'FAILED'

export interface ExperiencePresentation {
  readonly state: ExperienceState
  readonly headline: string
  readonly detail: string
}

/** Las derrotas de la misión, en texto. */
export const defeatsText = (experience: MissionExperience): string =>
  i18n.t(
    experience.defeats === 1 ? 'missions:experience.defeat_one' : 'missions:experience.defeat_other',
    { count: experience.defeats },
  )

/** La experiencia acreditada, con su signo. */
export const experienceGainedText = (experience: MissionExperience): string =>
  i18n.t('missions:experience.gained', { amount: String(experience.totalXp) })

/**
 * Cuántas derrotas llevan su experiencia, sobre el total: `3/5`.
 *
 * Es un cociente de CONTADORES que ya publica el servidor, no un progreso
 * calculado: Missions dice cuántas se acreditaron y cuántas hay.
 */
export const creditedText = (experience: MissionExperience): string =>
  `${String(experience.credited)}/${String(experience.defeats)}`

/**
 * El estado del bloque en una frase.
 *
 * `null` cuando la misión no registró ninguna derrota: no hay nada que contar, y un
 * "0 XP" se leería como un fallo en lugar de como una misión sin bajas.
 *
 * Un fallo manda sobre el resto: si alguna derrota no se pudo acreditar, eso es lo
 * primero que hay que decir, aunque otras sí llegaran.
 */
export const describeExperience = (
  experience: MissionExperience,
): ExperiencePresentation | null => {
  if (experience.defeats === 0) {
    return null
  }

  if (experience.failed > 0) {
    return {
      state: 'FAILED',
      headline: i18n.t('missions:experience.notCreditedTitle'),
      detail:
        i18n.t('missions:experience.notCreditedDetail', {
          failed: i18n.t(
            experience.failed === 1 ? 'missions:experience.defeat_one' : 'missions:experience.defeat_other',
            { count: experience.failed },
          ),
          total: defeatsText(experience),
        }) + (experience.pending > 0 ? i18n.t('missions:experience.restPending') : ''),
    }
  }

  if (experience.credited === 0) {
    return {
      state: 'PENDING',
      headline: i18n.t('missions:experience.pendingTitle'),
      detail: i18n.t('missions:experience.pendingDetail'),
    }
  }

  return {
    state: 'CREDITED',
    headline: i18n.t('missions:experience.creditedTitle'),
    detail:
      experience.pending > 0
        ? i18n.t('missions:experience.creditedPartial', { remaining: remainingText(experience.pending) })
        : i18n.t('missions:experience.creditedFull', { amount: experienceGainedText(experience) }),
  }
}

/** Lo que queda en curso, con el verbo y el número concordados. */
const remainingText = (pending: number): string =>
  i18n.t(
    pending === 1 ? 'missions:experience.remaining_one' : 'missions:experience.remaining_other',
    { count: pending },
  )

/**
 * El nivel del héroe tras la misión, o `null` si todavía no hay ninguna
 * acreditación. `máximo` solo se añade cuando el propio servicio publica que el
 * nivel alcanzó su tope.
 */
export const levelText = (experience: MissionExperience): string | null => {
  if (experience.level === null) {
    return null
  }

  const level = i18n.t('missions:experience.level', { level: String(experience.level) })

  return experience.maxLevel !== null && experience.level >= experience.maxLevel
    ? i18n.t('missions:experience.levelMax', { level })
    : level
}

/** Los niveles cruzados con ESTA misión, o `null` si no subió ninguno. */
export const levelUpText = (experience: MissionExperience): string | null => {
  if (experience.levelsGained === 1) {
    return i18n.t('missions:experience.levelUpOne')
  }

  if (experience.levelsGained > 1) {
    return i18n.t('missions:experience.levelUpMany', { count: experience.levelsGained })
  }

  return null
}

/** La experiencia ACUMULADA del héroe, tal como la publica Missions. */
export const currentXpText = (experience: MissionExperience): string | null =>
  experience.currentXp === null
    ? null
    : i18n.t('missions:experience.currentXp', { amount: String(experience.currentXp) })

const LINE_STATES: Readonly<Record<string, string>> = localizedMessages({
  PENDING: 'missions:experience.lineState.PENDING',
  CREDITED: 'missions:experience.lineState.CREDITED',
  FAILED: 'missions:experience.lineState.FAILED',
})

/** El estado de UNA derrota en texto; un valor nuevo se muestra tal cual. */
export const lineStateText = (status: string): string => LINE_STATES[status] ?? status
