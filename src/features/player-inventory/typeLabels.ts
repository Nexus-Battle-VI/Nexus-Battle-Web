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
  readonly label: string
}

export const TYPE_FILTERS: readonly TypeFilterOption[] = [
  { value: null, label: 'Todos' },
  { value: 'HEROE', label: 'Héroes' },
  { value: 'ARMA', label: 'Armas' },
  { value: 'ARMADURA', label: 'Armaduras' },
  { value: 'ITEM', label: 'Ítems' },
]

const LABELS: Readonly<Record<string, string>> = {
  HEROE: 'Héroe',
  ARMA: 'Arma',
  ARMADURA: 'Armadura',
  ITEM: 'Ítem',
  HABILIDAD: 'Habilidad',
  EPICA: 'Épica',
}

export const typeLabel = (type: string): string => LABELS[type] ?? type

export const lifecycleLabel = (status: string): string =>
  status === 'SUSPENDED' ? 'Retirado del catálogo' : status === 'ACTIVE' ? 'Vigente' : status
