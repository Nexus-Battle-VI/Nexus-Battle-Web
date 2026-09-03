import { httpClient, HttpError } from '@/lib/http'

import type { HeroEquipment, HeroStats } from './equipment/api'

/**
 * Se reexporta la vista de equipamiento de HU-28 porque es literalmente lo que
 * viaja dentro de `HeroSelection.configuration`: quien consume este contrato la
 * necesita, y obligarle a importarla de `./equipment/api` repartiria el mismo
 * tipo por dos caminos.
 */
export type { HeroEquipment, HeroStats }

/**
 * Cliente de "Selección y equipamiento inicial del héroe" (HU-07).
 *
 * Consume Player/Inventory, que cruza el inventario del jugador (HU-27) con el
 * catálogo vigente y reutiliza el equipamiento de HU-28. **El frontend no
 * calcula reglas**: ni decide qué héroes hay, ni cuántas piezas caben, ni si la
 * configuración está lista. Presenta lo que el servicio devuelve.
 *
 * LOS OCHO PROTOTIPOS NO ESTÁN AQUÍ. La lista sale del servicio, de modo que un
 * noveno héroe aprobado por administración aparece sin tocar este módulo
 * (CA-11). Lo único que este archivo conoce es la FORMA del contrato.
 */

export interface HeroAbility {
  readonly reference: string
  /** `null` cuando Catalog no resolvió la referencia. No se inventa un nombre. */
  readonly name: string | null
}

export interface AvailableHero {
  readonly heroId: string
  readonly reference: string
  readonly subtype: string
  readonly name: string
  readonly imageUrl: string
  readonly lifecycleStatus: string
  readonly baseStats: HeroStats
  readonly abilities: readonly HeroAbility[]
  readonly selected: boolean
}

export type HeroReadinessBlockerCode =
  'HERO_NOT_ACTIVE' | 'EQUIPPED_PRODUCT_NOT_OWNED' | 'EQUIPPED_PRODUCT_NOT_ACTIVE'

export interface HeroReadinessBlocker {
  readonly code: HeroReadinessBlockerCode
  readonly slot: string | null
  readonly reference: string
  readonly detail: string
}

export interface HeroReadiness {
  readonly ready: boolean
  readonly blockers: readonly HeroReadinessBlocker[]
}

export interface EquipmentCapacity {
  readonly used: number
  readonly max: number
}

export interface HeroSelection {
  readonly selectedAt: string
  /** La MISMA vista que devuelve HU-28. */
  readonly configuration: HeroEquipment
  readonly readiness: HeroReadiness
  readonly capacity: {
    readonly weapons: EquipmentCapacity
    readonly armor: EquipmentCapacity
    readonly items: EquipmentCapacity
  }
}

export const fetchAvailableHeroes = (signal?: AbortSignal): Promise<readonly AvailableHero[]> =>
  httpClient.get<readonly AvailableHero[]>('/inventories/me/heroes', signal)

/**
 * Configuración preparada del jugador.
 *
 * **`null` no es un error.** El servicio responde 404 cuando todavía no se ha
 * elegido ningún héroe, y eso es un estado normal de la pantalla —la primera
 * visita—, no un fallo que haya que enseñar en rojo. Cualquier otro error sí se
 * propaga.
 */
export const fetchHeroSelection = async (signal?: AbortSignal): Promise<HeroSelection | null> => {
  try {
    return await httpClient.get<HeroSelection>('/inventories/me/heroes/selection', signal)
  } catch (error: unknown) {
    if (error instanceof HttpError && error.isNotFound) {
      return null
    }

    throw error
  }
}

export const selectHero = (heroReference: string): Promise<HeroSelection> =>
  httpClient.request<HeroSelection>('/inventories/me/heroes/selection', {
    method: 'PUT',
    body: { heroReference },
  })

/**
 * Traduce un fallo al preparar un héroe.
 *
 * Cada estado significa una cosa distinta y no se mezclan: un 409 dice que el
 * héroe ya no está disponible, y decirle a quien juega que "no lo tiene" le
 * mandaría a buscar donde no es.
 */
export const describeSelectionFailure = (error: unknown): string => {
  if (error instanceof HttpError) {
    if (error.isNotFound) {
      return 'Ese héroe ya no está en tu inventario. Vuelve a cargar la página.'
    }

    if (error.status === 409) {
      return error.message
    }

    if (error.status === 503) {
      return 'El catálogo no está disponible en este momento. Inténtalo de nuevo en unos minutos.'
    }

    return error.message
  }

  return 'No se pudo preparar el héroe. Inténtalo de nuevo.'
}
