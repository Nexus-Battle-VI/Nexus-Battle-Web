import type { PlayerAchievement, PlayerStatistics } from './types'

/**
 * Contenido de ejemplo EXCLUSIVAMENTE DE DESARROLLO para la vista previa
 * `/__dev/account/statistics` (HU-06.4).
 *
 * Reglas: nunca se importa desde código productivo, nunca viaja por `httpClient`,
 * nunca se presenta como respuesta de un backend, nunca se usa como fallback y
 * nunca entra en el bundle de producción. El marcador de abajo lo verifica
 * `scripts/assert-production-bundle.mjs`.
 */
export const DEV_STATISTICS_FIXTURE_MARKER = 'DEV_STATISTICS_FIXTURE'

export const devPlayerStatistics: PlayerStatistics = {
  gamesPlayed: 128,
  wins: 74,
  // El progreso general sigue sin definición funcional aprobada: ni siquiera el
  // fixture inventa una fórmula.
  generalProgress: { kind: 'pending-definition' },
}

export const devPlayerAchievements: readonly PlayerAchievement[] = [
  {
    id: 'dev-fixture-achievement-primera-victoria',
    name: 'Primera victoria',
    description: 'Ganaste tu primer combate en la arena Nexus.',
    obtainedAt: '2026-02-14T20:12:00.000Z',
  },
  {
    id: 'dev-fixture-achievement-veterano',
    name: 'Veterano de la arena',
    description: 'Alcanzaste las 100 partidas jugadas.',
    obtainedAt: '2026-07-03T18:40:00.000Z',
  },
]
