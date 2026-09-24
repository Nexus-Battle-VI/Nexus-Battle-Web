import type { MissionAchievements } from '@/features/missions/missionAchievementApi'

import type { PlayerAchievement } from './types'

/** El perfil muestra logros obtenidos; la consulta de Missions también trae los bloqueados. */
export const toPlayerAchievements = (response: MissionAchievements): readonly PlayerAchievement[] =>
  response.items
    .filter((item) => item.status === 'UNLOCKED')
    .map((item) => ({
      id: item.achievementId,
      name: item.name,
      ...(item.unlockedAt === null ? {} : { obtainedAt: item.unlockedAt }),
      recognition: { name: item.recognition.name, status: item.recognition.status },
    }))
