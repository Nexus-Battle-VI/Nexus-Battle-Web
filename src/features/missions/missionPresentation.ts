import type { MissionCategory, PlayerMissionStatus } from './missionApi'
import type { RewardStatus } from './missionReportApi'

export const categoryLabel: Readonly<Record<MissionCategory, string>> = {
  STORY: 'Historia',
  CHALLENGE: 'Desafío',
  EXPLORATION: 'Exploración',
}

export const missionStatusLabel: Readonly<Record<PlayerMissionStatus, string>> = {
  AVAILABLE: 'Disponible',
  LOCKED: 'Bloqueada',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  FAILED: 'Fallida',
  ABANDONED: 'Abandonada',
}

export const rewardStatusLabel: Readonly<Record<RewardStatus, string>> = {
  PENDING: 'Pendiente de entrega',
  CREDITED: 'Entregada',
  FAILED: 'Entrega fallida',
}

// --- Vocabulario del dominio en palabras del jugador (diseño «misiones jugables», P-J10) ---

const HERO_TYPES: Readonly<Record<string, string>> = {
  GUERRERO_TANQUE: 'Guerrero Tanque',
  GUERRERO_ARMAS: 'Guerrero Armas',
  MAGO_FUEGO: 'Mago Fuego',
  MAGO_HIELO: 'Mago Hielo',
  PICARO_VENENO: 'Pícaro Veneno',
  PICARO_MACHETE: 'Pícaro Machete',
  CHAMAN: 'Chamán',
  MEDICO: 'Médico',
}

/** «PICARO_VENENO» → «Pícaro Veneno». Un tipo nuevo se lee igual, sin guiones bajos. */
export const heroTypeLabel = (subtype: string): string =>
  HERO_TYPES[subtype] ??
  subtype
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const STATS: Readonly<Record<string, string>> = {
  health: 'Vida',
  maxHealth: 'Vida',
  attack: 'Ataque',
  defense: 'Defensa',
  damage: 'Daño',
  power: 'Poder',
}

export const statLabel = (name: string): string => STATS[name] ?? name

const MASTER_STATUSES: Readonly<Record<string, string>> = {
  APPEARED_DEFEATED: 'apareció y lo derrotaste',
  APPEARED_HERO_DEFEATED: 'apareció y derrotó a tu héroe',
  APPEARED_ESCAPED: 'apareció y escapó',
  NOT_APPEARED: 'no apareció',
}

export const masterStatusLabel = (status: string): string => MASTER_STATUSES[status] ?? 'apareció'

const REWARD_KINDS: Readonly<Record<string, string>> = {
  EPIC: 'Épica',
  PRODUCT: 'Objeto',
  CREDITS: 'Créditos',
  EXPERIENCE: 'Experiencia',
}

export const rewardKindLabel = (kind: string): string => REWARD_KINDS[kind] ?? kind

const SKIP_REASONS: Readonly<Record<string, string>> = {
  UNSUPPORTED_EFFECT: 'no funciona en misiones',
  ON_COOLDOWN: 'estaba en recarga',
  NOT_ENOUGH_POWER: 'no había poder suficiente',
  UNKNOWN_ABILITY: 'el héroe ya no la tiene',
}

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
    ...(base === undefined ? [] : [`${probabilityLabel(base)} de aparecer`]),
    ...Object.entries(table)
      .filter(([heroType]) => heroType !== '*')
      .map(
        ([heroType, probability]) =>
          `${probabilityLabel(probability)} si tu héroe es ${heroTypeLabel(heroType)}`,
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
    hours > 0 ? `${String(hours)} h` : null,
    minutes > 0 ? `${String(minutes)} min` : null,
    seconds > 0 ? `${String(seconds)} s` : null,
  ]
    .filter((part) => part !== null)
    .join(' ')
}
