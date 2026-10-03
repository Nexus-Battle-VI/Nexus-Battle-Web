import { httpClient } from '@/lib/http'

import type { Magnitude } from './api'

/**
 * Cliente de "Épica equipada" (HU-31, contrato `hu-31-equipped-epic-v1`).
 *
 * Agregado HERMANO del equipamiento 2/6/2 de HU-28: su propio recurso
 * (`.../heroes/:heroId/epic`), su propia version de bloqueo optimista. El
 * frontend NO calcula compatibilidad ni efectos: presenta lo que el backend
 * ya resolvio (`applyEpicEffects`, Player-Inventory). El backend es la
 * autoridad de ownership, tipo de producto y bloqueo de batalla (HU-29).
 */

/** Mismo contrato de efecto que `EquippedEffect` (HU-28): se reutiliza la presentacion existente. */
export interface EpicEffect {
  readonly kind: string
  readonly target: string
  readonly statistic?: string
  readonly operation?: string
  readonly magnitude?: Magnitude
}

export interface HeroEpic {
  readonly epicProductId: string
  readonly epicReference: string
  readonly name: string
  readonly imageUrl: string
  readonly compatibleHeroSubtype: string
  /** `null` = "No aplica" (Tabla 20, Chaman/Medico). */
  readonly baseEffect: EpicEffect | null
  readonly specificEffect: EpicEffect
  readonly applied: {
    readonly baseApplied: EpicEffect | null
    /** `null` cuando el subtipo del heroe no coincide con `compatibleHeroSubtype`. */
    readonly additionalApplied: EpicEffect | null
  }
}

export interface HeroEpicState {
  readonly heroId: string
  /** `null` = el heroe no tiene ninguna epica equipada. */
  readonly epic: HeroEpic | null
  readonly version: number
  /** HU-29: `true` mientras el heroe participa en una batalla activa. */
  readonly locked: boolean
}

export const fetchHeroEpic = (
  heroReference: string,
  signal?: AbortSignal,
): Promise<HeroEpicState> =>
  httpClient.get<HeroEpicState>(
    `/inventories/me/heroes/${encodeURIComponent(heroReference)}/epic`,
    signal,
  )

export const equipEpicOnHero = (params: {
  readonly heroReference: string
  readonly productReference: string
}): Promise<HeroEpicState> =>
  httpClient.request<HeroEpicState>(
    `/inventories/me/heroes/${encodeURIComponent(params.heroReference)}/epic`,
    { method: 'PUT', body: { productReference: params.productReference } },
  )
