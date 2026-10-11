import type { MissionCategory, PlayerMissionStatus } from './missionApi'
import type { MissionIconName } from './missionsRemasterAssets'

/**
 * Correspondencias puramente visuales del remaster de Misiones (EN-031): que
 * icono y que tono de insignia acompanan a cada categoria o estado. El texto
 * sigue saliendo de `missionPresentation.ts`; esto solo elige la piel.
 */
export const CATEGORY_ICON: Readonly<Record<MissionCategory, MissionIconName>> = {
  STORY: 'story',
  CHALLENGE: 'challenge',
  EXPLORATION: 'exploration',
}

export const STATUS_BADGE: Readonly<Record<PlayerMissionStatus, string>> = {
  AVAILABLE: 'msn-badge--available',
  LOCKED: 'msn-badge--locked',
  IN_PROGRESS: 'msn-badge--progress',
  COMPLETED: 'msn-badge--COMPLETED',
  FAILED: 'msn-badge--FAILED',
  ABANDONED: 'msn-badge--ABANDONED',
}
