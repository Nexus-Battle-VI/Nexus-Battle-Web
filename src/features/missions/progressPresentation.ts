import type { ProgressEntry } from './missionPlayApi'
import { statLabel } from './missionPresentation'
import { i18n } from '@/shared/i18n/i18n'

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

const nameOf = (entry: ProgressEntry): string => entry.enemy ?? i18n.t('missions:progress.anEnemy')

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
  const turnsText =
    turns === '' ? '' : i18n.t('missions:progress.effect.turns', { turns: effect.turns })
  switch (effect.kind) {
    case 'BUFF':
      return amount === null
        ? null
        : i18n.t('missions:progress.effect.buff', {
            amount,
            statistic: statistic.toLowerCase(),
            turns: turnsText,
          })
    case 'DEBUFF':
      return amount === null
        ? null
        : i18n.t('missions:progress.effect.debuff', {
            amount,
            statistic: statistic.toLowerCase(),
            turns: turnsText,
          })
    case 'DIRECT_DAMAGE':
      return amount === null ? null : i18n.t('missions:progress.effect.directDamage', { amount })
    case 'HEAL':
      return amount === null ? null : i18n.t('missions:progress.effect.heal', { amount })
    case 'IMMUNITY':
      return i18n.t('missions:progress.effect.immunity', { turns: turnsText })
    case 'REFLECT':
      return typeof effect.basisPoints === 'number'
        ? i18n.t('missions:progress.effect.reflect', {
            percent: String(effect.basisPoints / 100),
            turns: turnsText,
          })
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
        ? {
            text: i18n.t('missions:progress.encounterBoss', { n: number(entry.encounter) }),
            tone: 'bad',
          }
        : {
            text: i18n.t('missions:progress.encounterStart', { n: number(entry.encounter) }),
            tone: 'info',
          }
    case 'ENEMY_APPEARED':
      return entry.role === 'MASTER'
        ? { text: i18n.t('missions:progress.masterAppeared', { name: nameOf(entry) }), tone: 'bad' }
        : { text: i18n.t('missions:progress.enemyAppeared', { name: nameOf(entry) }), tone: 'info' }
    case 'HERO_ACTION': {
      const verb =
        entry.ability === null || entry.ability === undefined
          ? i18n.t('missions:progress.verbAttacks')
          : i18n.t('missions:progress.verbUses', { ability: entry.ability })
      if (entry.attacked === false) {
        return {
          text: i18n.t('missions:progress.heroUsesAbility', {
            ability: entry.ability ?? i18n.t('missions:progress.anAbility'),
            effects: effectsText(entry),
          }),
          tone: 'hero',
        }
      }
      if (entry.hit !== true) {
        return {
          text: i18n.t('missions:progress.heroMisses', {
            verb,
            name: nameOf(entry),
            effects: effectsText(entry),
          }),
          tone: 'hero',
        }
      }
      const critical = entry.critical === true ? i18n.t('missions:progress.criticalHit') : ''
      return {
        text: i18n.t('missions:progress.heroHits', {
          verb,
          name: nameOf(entry),
          damage: number(entry.damage),
          effects: effectsText(entry),
          critical,
        }),
        tone: 'hero',
      }
    }
    case 'ENEMY_GUARDED':
      return {
        text: i18n.t('missions:progress.enemyGuards', { name: nameOf(entry) }),
        tone: 'enemy',
      }
    case 'ENEMY_ACTION': {
      const rage = entry.enraged === true ? i18n.t('missions:progress.enraged') : ''
      if (entry.hit !== true) {
        return {
          text: i18n.t('missions:progress.enemyMisses', { name: nameOf(entry), rage }),
          tone: 'enemy',
        }
      }
      const prevented =
        (entry.prevented ?? 0) > 0
          ? i18n.t('missions:progress.prevented', { amount: number(entry.prevented) })
          : ''
      const reflected =
        (entry.reflected ?? 0) > 0
          ? i18n.t('missions:progress.reflected', { amount: number(entry.reflected) })
          : ''
      return {
        text: i18n.t('missions:progress.enemyHits', {
          name: nameOf(entry),
          damage: number(entry.damage),
          prevented,
          reflected,
          rage,
        }),
        tone: 'enemy',
      }
    }
    case 'HERO_HEALED':
      return {
        text: i18n.t('missions:progress.heroHealed', { amount: number(entry.amount) }),
        tone: 'good',
      }
    case 'DEFEATED':
      if (entry.role === 'MASTER') {
        return {
          text: i18n.t('missions:progress.masterDefeated', { name: nameOf(entry) }),
          tone: 'good',
        }
      }
      if (entry.role === 'BOSS')
        return {
          text: i18n.t('missions:progress.bossDefeated', { name: nameOf(entry) }),
          tone: 'good',
        }
      return {
        text: i18n.t('missions:progress.enemyDefeated', { name: nameOf(entry) }),
        tone: 'good',
      }
    case 'ENCOUNTER_FINISHED':
      return {
        text: i18n.t('missions:progress.encounterFinished', { n: number(entry.encounter) }),
        tone: 'good',
      }
    case 'HERO_RECOVERED':
      return {
        text: i18n.t('missions:progress.heroRecovered', { health: number(entry.heroHealth) }),
        tone: 'good',
      }
    case 'MISSION_FINISHED':
      return entry.victory === true
        ? { text: i18n.t('missions:progress.missionSucceeded'), tone: 'good' }
        : { text: i18n.t('missions:progress.missionFailed'), tone: 'bad' }
    default:
      return null
  }
}
