import type { ProgressEntry } from './missionPlayApi'
import { statLabel } from './missionPresentation'

/**
 * La bitácora de una misión en palabras del jugador (diseño «misiones jugables»,
 * P-J6). Missions ya envía nombres y cifras; aquí solo se eligen las palabras. El
 * tono sirve para el color, pero el texto dice lo mismo sin él.
 */
export type ProgressTone = 'info' | 'hero' | 'enemy' | 'good' | 'bad'

export interface ProgressLine {
  readonly text: string
  readonly tone: ProgressTone
}

const nameOf = (entry: ProgressEntry): string => entry.enemy ?? 'un enemigo'

const number = (value: number | undefined): string => String(value ?? 0)

/** Lo que hizo una habilidad, tal como lo informa Combat (P-J4). */
const effectText = (effect: Readonly<Record<string, unknown>>): string | null => {
  const amount = typeof effect.amount === 'number' ? String(effect.amount) : null
  const turns =
    typeof effect.turns === 'number' && effect.turns > 1
      ? ` durante ${String(effect.turns)} turnos`
      : ''
  // Combat las nombra en mayúsculas (`DAMAGE`); las etiquetas usan el nombre del perfil.
  const statistic =
    typeof effect.statistic === 'string' ? statLabel(effect.statistic.toLowerCase()) : ''
  switch (effect.kind) {
    case 'BUFF':
      return amount === null ? null : `+${amount} de ${statistic.toLowerCase()}${turns}`
    case 'DEBUFF':
      return amount === null ? null : `−${amount} de ${statistic.toLowerCase()} al enemigo${turns}`
    case 'DIRECT_DAMAGE':
      return amount === null ? null : `${amount} de daño directo`
    case 'HEAL':
      return amount === null ? null : `recupera ${amount} de vida`
    case 'IMMUNITY':
      return `no recibe daño${turns}`
    case 'REFLECT':
      return typeof effect.basisPoints === 'number'
        ? `devuelve el ${String(effect.basisPoints / 100)} % del daño${turns}`
        : null
    default:
      return null
  }
}

const effectsText = (entry: ProgressEntry): string => {
  const parts = (entry.effects ?? [])
    .map(effectText)
    .filter((part): part is string => part !== null)
  return parts.length === 0 ? '' : ` (${parts.join(', ')})`
}

/** La frase de una entrada; `null` si no hay nada que contar. */
export const progressLine = (entry: ProgressEntry): ProgressLine | null => {
  switch (entry.kind) {
    case 'ENCOUNTER_STARTED':
      return entry.boss === true
        ? { text: `Encuentro ${number(entry.encounter)}: ¡el jefe final!`, tone: 'bad' }
        : { text: `Comienza el encuentro ${number(entry.encounter)}.`, tone: 'info' }
    case 'ENEMY_APPEARED':
      return entry.role === 'MASTER'
        ? { text: `¡Aparece un Máster: ${nameOf(entry)}!`, tone: 'bad' }
        : { text: `Aparece ${nameOf(entry)}.`, tone: 'info' }
    case 'HERO_ACTION': {
      const verb =
        entry.ability === null || entry.ability === undefined
          ? 'ataca a'
          : `usa ${entry.ability} contra`
      if (entry.attacked === false) {
        return {
          text: `Tu héroe usa ${entry.ability ?? 'una habilidad'}${effectsText(entry)}.`,
          tone: 'hero',
        }
      }
      if (entry.hit !== true) {
        return {
          text: `Tu héroe ${verb} ${nameOf(entry)} y falla${effectsText(entry)}.`,
          tone: 'hero',
        }
      }
      const critical = entry.critical === true ? ' ¡Golpe crítico!' : ''
      return {
        text: `Tu héroe ${verb} ${nameOf(entry)}: ${number(entry.damage)} de daño${effectsText(entry)}.${critical}`,
        tone: 'hero',
      }
    }
    case 'ENEMY_GUARDED':
      return { text: `${nameOf(entry)} se cubre y espera.`, tone: 'enemy' }
    case 'ENEMY_ACTION': {
      const rage = entry.enraged === true ? ' ¡Está furioso!' : ''
      if (entry.hit !== true) {
        return { text: `${nameOf(entry)} ataca y falla.${rage}`, tone: 'enemy' }
      }
      const prevented =
        (entry.prevented ?? 0) > 0 ? ` Tu héroe evita ${number(entry.prevented)}.` : ''
      const reflected =
        (entry.reflected ?? 0) > 0 ? ` Le devuelves ${number(entry.reflected)}.` : ''
      return {
        text: `${nameOf(entry)} golpea: ${number(entry.damage)} de daño a tu héroe.${prevented}${reflected}${rage}`,
        tone: 'enemy',
      }
    }
    case 'HERO_HEALED':
      return { text: `Tu héroe recupera ${number(entry.amount)} de vida.`, tone: 'good' }
    case 'DEFEATED':
      if (entry.role === 'MASTER') {
        return { text: `¡Derrotaste al Máster ${nameOf(entry)}!`, tone: 'good' }
      }
      if (entry.role === 'BOSS') return { text: `¡Derrotaste a ${nameOf(entry)}!`, tone: 'good' }
      return { text: `${nameOf(entry)} cae derrotado.`, tone: 'good' }
    case 'ENCOUNTER_FINISHED':
      return { text: `Encuentro ${number(entry.encounter)} superado.`, tone: 'good' }
    case 'HERO_RECOVERED':
      return {
        text: `Tu héroe descansa y queda con ${number(entry.heroHealth)} de vida.`,
        tone: 'good',
      }
    case 'MISSION_FINISHED':
      return entry.victory === true
        ? { text: '¡Misión cumplida!', tone: 'good' }
        : { text: 'Tu héroe no pudo completar la misión.', tone: 'bad' }
    default:
      return null
  }
}
