import type { MissionExperience } from './missionReport'

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

const plural = (count: number, one: string, many: string): string =>
  count === 1 ? `1 ${one}` : `${String(count)} ${many}`

/** Las derrotas de la misión, en texto. */
export const defeatsText = (experience: MissionExperience): string =>
  plural(experience.defeats, 'derrota', 'derrotas')

/** La experiencia acreditada, con su signo. */
export const experienceGainedText = (experience: MissionExperience): string =>
  `+${String(experience.totalXp)} XP`

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
      headline: 'Parte de la experiencia no se acreditó',
      detail:
        `${plural(experience.failed, 'derrota', 'derrotas')} sin acreditar de ${defeatsText(experience)}.` +
        (experience.pending > 0 ? ' El resto sigue en curso.' : ''),
    }
  }

  if (experience.credited === 0) {
    return {
      state: 'PENDING',
      headline: 'Experiencia en camino',
      detail: 'Las derrotas ya están registradas: la experiencia se acreditará en breve.',
    }
  }

  return {
    state: 'CREDITED',
    headline: 'Experiencia acreditada',
    detail:
      experience.pending > 0
        ? `Ya se acreditó parte; ${remainingText(experience.pending)}.`
        : `${experienceGainedText(experience)} para tu héroe.`,
  }
}

/** Lo que queda en curso, con el verbo y el número concordados. */
const remainingText = (pending: number): string =>
  pending === 1 ? 'queda 1 derrota en curso' : `quedan ${String(pending)} derrotas en curso`

/**
 * El nivel del héroe tras la misión, o `null` si todavía no hay ninguna
 * acreditación. `máximo` solo se añade cuando el propio servicio publica que el
 * nivel alcanzó su tope.
 */
export const levelText = (experience: MissionExperience): string | null => {
  if (experience.level === null) {
    return null
  }

  const level = `Nivel ${String(experience.level)}`

  return experience.maxLevel !== null && experience.level >= experience.maxLevel
    ? `${level} · máximo`
    : level
}

/** Los niveles cruzados con ESTA misión, o `null` si no subió ninguno. */
export const levelUpText = (experience: MissionExperience): string | null => {
  if (experience.levelsGained === 1) {
    return '¡Has subido de nivel!'
  }

  if (experience.levelsGained > 1) {
    return `¡Has subido ${String(experience.levelsGained)} niveles!`
  }

  return null
}

/** La experiencia ACUMULADA del héroe, tal como la publica Missions. */
export const currentXpText = (experience: MissionExperience): string | null =>
  experience.currentXp === null ? null : `${String(experience.currentXp)} XP acumulada`

const LINE_STATES: Readonly<Record<string, string>> = {
  PENDING: 'En curso',
  CREDITED: 'Acreditada',
  FAILED: 'Sin acreditar',
}

/** El estado de UNA derrota en texto; un valor nuevo se muestra tal cual. */
export const lineStateText = (status: string): string => LINE_STATES[status] ?? status
