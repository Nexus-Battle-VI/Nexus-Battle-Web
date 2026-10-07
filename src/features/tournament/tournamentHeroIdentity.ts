import { HERO_VISUAL_SPECS_BY_ID } from '@/shared/visual-library/heroes/hero-definitions'
import type { HeroId } from '@/shared/visual-library/heroes/hero-ids'
import { heroIdFromReference, heroIdFromSubtype } from '@/shared/visual-library/heroes/hero-subtype'

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu
export const tournamentHumanName = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' && !uuid.test(value.trim()) ? value.trim() : null

/** Authorized visual metadata only. An instance UUID never selects a hero. */
export function tournamentHeroIdentity(value: object): { label: string; modelId: HeroId | null } {
  const subtype =
    'heroSubtype' in value && typeof value.heroSubtype === 'string' ? value.heroSubtype : null
  const reference = 'heroId' in value && typeof value.heroId === 'string' ? value.heroId : null
  const modelId =
    (subtype ? heroIdFromSubtype(subtype) : null) ??
    (reference ? heroIdFromReference(reference) : null)
  const name = 'heroName' in value ? tournamentHumanName(value.heroName) : null
  return {
    modelId,
    label:
      name ??
      (modelId ? HERO_VISUAL_SPECS_BY_ID.get(modelId)?.displayName : null) ??
      'Héroe por identificar',
  }
}
