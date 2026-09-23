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
