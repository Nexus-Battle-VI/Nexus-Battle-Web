import type { MissionDifficulties } from '@/features/missions/api'

/**
 * Datos controlados exclusivamente de pruebas; nunca importados por el
 * producto. Son los fixtures del contrato hu-75-mission-difficulty-v1
 * (Infrastructure, Task HU-75.1), tal como los responde Missions.
 */
export const MISSION_ID = 'msn_templo-olvidado'

export const difficultiesWithoutProgress = (): MissionDifficulties => ({
  missionId: MISSION_ID,
  items: [
    {
      difficulty: 'NORMAL',
      unlocked: true,
      lockReason: null,
      enemyStatMultiplier: 1,
      rewardTier: 'STANDARD',
    },
    {
      difficulty: 'HEROIC',
      unlocked: false,
      lockReason: 'Debes completar esta misión en Normal al menos una vez.',
      enemyStatMultiplier: 1.5,
      rewardTier: 'IMPROVED',
    },
    {
      difficulty: 'LEGENDARY',
      unlocked: false,
      lockReason: 'Debes completar esta misión en Heroico al menos una vez.',
      enemyStatMultiplier: 2,
      rewardTier: 'PREMIUM',
    },
    {
      difficulty: 'MYTHIC',
      unlocked: false,
      lockReason: 'Debes completar esta misión en Legendario al menos una vez.',
      enemyStatMultiplier: null,
      rewardTier: 'EXCLUSIVE',
    },
  ],
})

/** Segundo fixture del contrato: el jugador ya completo la mision en Normal. */
export const difficultiesAfterNormal = (): MissionDifficulties => {
  const base = difficultiesWithoutProgress()

  return {
    ...base,
    items: base.items.map((item) =>
      item.difficulty === 'HEROIC' ? { ...item, unlocked: true, lockReason: null } : item,
    ),
  }
}

export const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
