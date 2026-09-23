import type { MissionCategory, PlayerMissionStatus } from './missionApi'

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

export const durationLabel = (duration: string): string => {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/u.exec(duration)
  if (match === null) return duration
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  if (hours === 0 && minutes === 0) return duration
  return [hours > 0 ? `${String(hours)} h` : null, minutes > 0 ? `${String(minutes)} min` : null]
    .filter((part) => part !== null)
    .join(' ')
}
