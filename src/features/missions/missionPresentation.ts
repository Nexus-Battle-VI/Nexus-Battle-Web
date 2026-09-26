import type { MissionCategory, PlayerMissionStatus } from './missionApi'
import type { RewardStatus } from './missionReportApi'
import { i18n } from '@/shared/i18n/i18n'
import { localizedMessages } from '@/shared/i18n/messages'

export const categoryLabel: Readonly<Record<MissionCategory, string>> = localizedMessages({
  STORY: 'missions:category.STORY',
  CHALLENGE: 'missions:category.CHALLENGE',
  EXPLORATION: 'missions:category.EXPLORATION',
})

export const missionStatusLabel: Readonly<Record<PlayerMissionStatus, string>> = localizedMessages({
  AVAILABLE: 'missions:status.AVAILABLE',
  LOCKED: 'missions:status.LOCKED',
  IN_PROGRESS: 'missions:status.IN_PROGRESS',
  COMPLETED: 'missions:status.COMPLETED',
  FAILED: 'missions:status.FAILED',
  ABANDONED: 'missions:status.ABANDONED',
})

export const rewardStatusLabel: Readonly<Record<RewardStatus, string>> = localizedMessages({
  PENDING: 'missions:rewardStatus.PENDING',
  CREDITED: 'missions:rewardStatus.CREDITED',
  FAILED: 'missions:rewardStatus.FAILED',
})

// --- Vocabulario del dominio en palabras del jugador (diseño «misiones jugables», P-J10) ---

const HERO_TYPES: Readonly<Record<string, string>> = localizedMessages({
  GUERRERO_TANQUE: 'missions:heroType.GUERRERO_TANQUE',
  GUERRERO_ARMAS: 'missions:heroType.GUERRERO_ARMAS',
  MAGO_FUEGO: 'missions:heroType.MAGO_FUEGO',
  MAGO_HIELO: 'missions:heroType.MAGO_HIELO',
  PICARO_VENENO: 'missions:heroType.PICARO_VENENO',
  PICARO_MACHETE: 'missions:heroType.PICARO_MACHETE',
  CHAMAN: 'missions:heroType.CHAMAN',
  MEDICO: 'missions:heroType.MEDICO',
})

/** «PICARO_VENENO» → «Pícaro Veneno». Un tipo nuevo se lee igual, sin guiones bajos. */
export const heroTypeLabel = (subtype: string): string =>
  HERO_TYPES[subtype] ??
  subtype
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const STATS: Readonly<Record<string, string>> = localizedMessages({
  health: 'missions:stat.health',
  maxHealth: 'missions:stat.health',
  attack: 'missions:stat.attack',
  defense: 'missions:stat.defense',
  damage: 'missions:stat.damage',
  power: 'missions:stat.power',
})

export const statLabel = (name: string): string => STATS[name] ?? name

const MASTER_STATUSES: Readonly<Record<string, string>> = localizedMessages({
  APPEARED_DEFEATED: 'missions:master.APPEARED_DEFEATED',
  APPEARED_HERO_DEFEATED: 'missions:master.APPEARED_HERO_DEFEATED',
  APPEARED_ESCAPED: 'missions:master.APPEARED_ESCAPED',
  NOT_APPEARED: 'missions:master.NOT_APPEARED',
})

export const masterStatusLabel = (status: string): string =>
  MASTER_STATUSES[status] ?? i18n.t('missions:master.default')

const REWARD_KINDS: Readonly<Record<string, string>> = localizedMessages({
  EPIC: 'missions:rewardKind.EPIC',
  PRODUCT: 'missions:rewardKind.PRODUCT',
  CREDITS: 'missions:rewardKind.CREDITS',
  EXPERIENCE: 'missions:rewardKind.EXPERIENCE',
})

export const rewardKindLabel = (kind: string): string => REWARD_KINDS[kind] ?? kind

const SKIP_REASONS: Readonly<Record<string, string>> = localizedMessages({
  UNSUPPORTED_EFFECT: 'missions:skipReason.UNSUPPORTED_EFFECT',
  ON_COOLDOWN: 'missions:skipReason.ON_COOLDOWN',
  NOT_ENOUGH_POWER: 'missions:skipReason.NOT_ENOUGH_POWER',
  UNKNOWN_ABILITY: 'missions:skipReason.UNKNOWN_ABILITY',
})

export const skipReasonLabel = (reason: string): string => SKIP_REASONS[reason] ?? reason

const PERCENT = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 })

/** Una probabilidad de 0 a 1 como porcentaje legible: 0.15 → «15 %». */
export const probabilityLabel = (probability: number): string => PERCENT.format(probability)

/**
 * La probabilidad de un Máster según el héroe: «5 % de aparecer; 15 % si tu héroe es
 * Guerrero Tanque». `*` vale para cualquier héroe (HU-73, P-X2).
 */
export const masterChanceLabel = (table: Readonly<Record<string, number>>): string => {
  const base = table['*']
  const parts = [
    ...(base === undefined
      ? []
      : [i18n.t('missions:masterChance.baseAppear', { percent: probabilityLabel(base) })]),
    ...Object.entries(table)
      .filter(([heroType]) => heroType !== '*')
      .map(([heroType, probability]) =>
        i18n.t('missions:masterChance.byHero', {
          percent: probabilityLabel(probability),
          hero: heroTypeLabel(heroType),
        }),
      ),
  ]
  return parts.join('; ')
}

/** La primera letra en mayúscula: los motivos de Combat llegan en minúscula. */
export const sentence = (text: string): string =>
  text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1)

export const durationLabel = (duration: string): string => {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/u.exec(duration)
  if (match === null) return duration
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  if (hours === 0 && minutes === 0 && seconds === 0) return duration
  return [
    hours > 0 ? i18n.t('missions:duration.hours', { value: String(hours) }) : null,
    minutes > 0 ? i18n.t('missions:duration.minutes', { value: String(minutes) }) : null,
    seconds > 0 ? i18n.t('missions:duration.seconds', { value: String(seconds) }) : null,
  ]
    .filter((part) => part !== null)
    .join(' ')
}
