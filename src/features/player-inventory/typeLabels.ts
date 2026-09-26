import { i18n } from '@/shared/i18n/i18n'

import type { ProductType } from './api'

/**
 * Filtros de tipo de "Mi Inventario".
 *
 * El conjunto aprobado para la interfaz de HU-27 es `Todos, Héroes, Armas,
 * Armaduras, Ítems` (feedback de diseño de la Task #133). Los valores son
 * EXACTAMENTE los tipos canonicos de Catalog (`ProductType`), no categorias
 * inventadas. El backend `?type=` acepta ademas `HABILIDAD` y `EPICA`, pero no
 * se ofrecen como chip porque la evidencia funcional no los incluye. "Todos" es
 * el valor por defecto y no envia filtro.
 */
export interface TypeFilterOption {
  readonly value: ProductType | null
  /** Clave de traduccion de la etiqueta; el valor enviado al servicio no cambia. */
  readonly labelKey: string
}

export const TYPE_FILTERS: readonly TypeFilterOption[] = [
  { value: null, labelKey: 'inventory:catalog.filters.all' },
  { value: 'HEROE', labelKey: 'inventory:catalog.filters.HEROE' },
  { value: 'ARMA', labelKey: 'inventory:catalog.filters.ARMA' },
  { value: 'ARMADURA', labelKey: 'inventory:catalog.filters.ARMADURA' },
  { value: 'ITEM', labelKey: 'inventory:catalog.filters.ITEM' },
]

const KNOWN_TYPES = new Set(['HEROE', 'ARMA', 'ARMADURA', 'ITEM', 'HABILIDAD', 'EPICA'])

/** Etiqueta del tipo canonico en el idioma activo; un tipo desconocido se muestra tal cual. */
export const typeLabel = (type: string): string =>
  KNOWN_TYPES.has(type) ? i18n.t(`inventory:types.${type}`) : type

export const lifecycleLabel = (status: string): string =>
  status === 'SUSPENDED' || status === 'ACTIVE' ? i18n.t(`inventory:lifecycle.${status}`) : status
