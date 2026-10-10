import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import {
  fetchOwnedItemDetail,
  fetchOwnedItems,
  type OwnedInventoryItemDetail,
  type OwnedInventoryPage,
  type ProductType,
} from './api'

/** Termino minimo para que la busqueda por nombre se envie al servicio (RF-27). */
export const MIN_SEARCH_LENGTH = 4

/**
 * Tamano de pagina que VE el jugador (decision de producto validada por
 * Richard y su equipo: 8 productos por pagina, 4x2 en escritorio).
 *
 * Player-Inventory fija `OWNED_ITEMS_PAGE_SIZE = 16` como regla de negocio de
 * servidor documentada (RF-27): no es un parametro de query, no se puede
 * pedir "8" al backend sin ampliar ese contrato. En vez de tocar esa regla
 * de servidor (fuera del alcance de este remaster visual), Web pide al
 * backend sus paginas reales de 16 y las vuelve a paginar del lado del
 * cliente en bloques de 8 -el jugador nunca ve "16", ni los datos ni la
 * autoridad de paginacion cambian: solo la presentacion-.
 */
export const UI_PAGE_SIZE = 8

/**
 * Cuantas paginas de la UI (8) caben en una pagina real del servidor (16).
 * Se deriva del propio tamano de pagina que el servidor devuelve en cada
 * respuesta (`OwnedInventoryPage.pageSize`), nunca de un numero inventado:
 * si Player-Inventory cambiara su tamano de pagina real, esta relacion se
 * sigue calculando sola.
 */
const uiPagesPerServerPage = (serverPageSize: number): number =>
  Math.max(1, Math.floor(serverPageSize / UI_PAGE_SIZE))

export interface OwnedInventoryParams {
  readonly page: number
  readonly term: string
  readonly type: ProductType | null
}

/**
 * Solo se envia `q` cuando el termino tiene 4 caracteres o mas: por debajo, la
 * pantalla se comporta como un listado normal y muestra una pista.
 */
export const effectiveSearch = (term: string): string => {
  const trimmed = term.trim()
  return trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : ''
}

/**
 * Reduce la pagina REAL del servidor (hasta 16 productos) a la "rebanada" de
 * `UI_PAGE_SIZE` (8) que corresponde a `uiPage`, y recalcula `page`/
 * `totalPages` en terminos de 8 -lo unico que el jugador ve-. `totalItems` es
 * el conteo global real que ya devuelve el servidor: no se inventa ningun
 * numero, solo se expresa en bloques de 8 en vez de 16.
 */
const sliceToUiPage = (serverPage: OwnedInventoryPage, uiPage: number): OwnedInventoryPage => {
  const perServerPage = uiPagesPerServerPage(serverPage.pageSize)
  const indexWithinServerPage = (uiPage - 1) % perServerPage
  const start = indexWithinServerPage * UI_PAGE_SIZE
  return {
    items: serverPage.items.slice(start, start + UI_PAGE_SIZE),
    page: uiPage,
    pageSize: UI_PAGE_SIZE,
    totalItems: serverPage.totalItems,
    totalPages: serverPage.totalItems === 0 ? 0 : Math.ceil(serverPage.totalItems / UI_PAGE_SIZE),
  }
}

export const useOwnedInventory = (
  params: OwnedInventoryParams,
): UseQueryResult<OwnedInventoryPage> => {
  const q = effectiveSearch(params.term)
  // `UI_PAGE_SIZE` fijo (8) para calcular a que pagina REAL del servidor
  // (16) pertenece `params.page`: no depende de una respuesta previa, asi
  // que funciona igual en la primera carga que en las siguientes.
  const perServerPage = uiPagesPerServerPage(16)
  const serverPage = Math.ceil(params.page / perServerPage)

  const query = useQuery({
    queryKey: queryKeys.inventory.mine({ page: serverPage, q, type: params.type }),
    queryFn: ({ signal }) =>
      fetchOwnedItems({ page: serverPage, ...(q === '' ? {} : { q }), type: params.type }, signal),
    // Mantiene la pagina anterior visible mientras llega la siguiente: evita el
    // parpadeo a "vacio" al pasar de pagina o teclear en la busqueda.
    placeholderData: keepPreviousData,
  })

  return {
    ...query,
    data: query.data === undefined ? undefined : sliceToUiPage(query.data, params.page),
  } as UseQueryResult<OwnedInventoryPage>
}

export const useOwnedItemDetail = (
  itemReference: string | null,
): UseQueryResult<OwnedInventoryItemDetail> =>
  useQuery({
    queryKey: queryKeys.inventory.mineItem(itemReference ?? ''),
    queryFn: ({ signal }) => fetchOwnedItemDetail(itemReference ?? '', signal),
    enabled: itemReference !== null && itemReference !== '',
  })
