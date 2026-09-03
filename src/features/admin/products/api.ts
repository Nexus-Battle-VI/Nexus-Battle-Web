import { HttpError, httpClient } from '@/lib/http'

import type { CreateProductRequest, CreatedProduct } from './contract'

/**
 * Alta canonica de producto (HU-33, ADR-013).
 *
 * La ruta lleva version -`/v1/catalog/products`- y no sustituye a `/products`,
 * que sigue sirviendo el catalogo heredado a la vitrina. Son dos contratos
 * distintos conviviendo, no uno migrado a medias.
 */
export const createProduct = (request: CreateProductRequest): Promise<CreatedProduct> =>
  httpClient.post<CreatedProduct>('/v1/catalog/products', request)

/**
 * Traduce el fallo del servicio a algo que se pueda leer sin abrir la consola.
 *
 * CADA CODIGO DICE ALGO DISTINTO y mezclarlos mandaria a corregir lo que no
 * es: 409 significa que el nombre ya existe -hay que cambiarlo-, 422 que un
 * valor incumple una regla -hay que corregirlo-, y 403 que la sesion no
 * alcanza -no hay nada que corregir en el formulario-.
 *
 * El 403 merece un mensaje propio porque su causa mas probable aqui no es el
 * rol: es la evidencia de segundo factor. Catalog exige TOTP verificado para
 * toda mutacion administrativa, asi que un Administrador que entro sin ser
 * retado la recibe igual, y sin esta explicacion buscaria el problema en sus
 * permisos.
 */
export const describeCreationFailure = (error: unknown): string => {
  if (!(error instanceof HttpError)) {
    return 'No se pudo crear el producto. Revisa tu conexión e inténtalo de nuevo.'
  }

  if (error.status === 401) {
    return 'Tu sesión no es válida o venció. Vuelve a iniciar sesión.'
  }

  if (error.status === 403) {
    return 'No tiene permisos para gestionar el catálogo. Se exige rol administrativo y segundo factor verificado en esta sesión.'
  }

  if (error.status === 409) {
    return 'Ya existe un producto activo de este tipo con el mismo nombre.'
  }

  if (error.status === 422 || error.status === 400) {
    // El mensaje del servicio nombra el campo exacto (`attributes.values...`),
    // que es mas util que cualquier texto generico que se escriba aqui.
    return error.message
  }

  if (error.status === 503) {
    return 'No se pudo comprobar el segundo factor. Inténtalo de nuevo en unos minutos.'
  }

  return 'No se pudo crear el producto.'
}

/**
 * Producto tal y como lo ve la administración (HU-34).
 *
 * Incluye `availableUnits`, que la vitrina pública no recibe: cuántas unidades
 * quedan es información de gestión.
 */
export interface AdministeredProduct {
  readonly productId: string
  readonly name: string
  readonly type: string
  readonly printRun: number
  readonly printRunMode: 'UNIQUE' | 'LIMITED' | 'INFINITE'
  readonly availableUnits: number | null
  readonly lifecycleStatus: 'ACTIVE' | 'SUSPENDED'
  readonly creditsPrice: number
  readonly premium: boolean
}

export const fetchAdministeredProduct = (productId: string): Promise<AdministeredProduct> =>
  httpClient.get<AdministeredProduct>(`/v1/admin/products/${productId}`)

/**
 * Ajusta el tiraje (HU-34, CA-02).
 *
 * SOLO SE ENVIA `printRun`. La disponibilidad la recalcula el servicio a partir
 * de las unidades ya entregadas; mandarla desde aquí permitiría reabrir un
 * producto agotado sin ampliar su tiraje.
 */
export const adjustProductInventory = (
  productId: string,
  printRun: number,
): Promise<AdministeredProduct> =>
  httpClient.patch<AdministeredProduct>(`/v1/admin/products/${productId}/inventory`, { printRun })

/**
 * Traduce el fallo del ajuste.
 *
 * El 422 NO se reescribe: el servicio distingue «el tiraje debe ser un entero
 * positivo o -1» de «no puede ser inferior a las unidades ya entregadas», y esa
 * diferencia es exactamente lo que el administrador necesita para corregir.
 * Un texto genérico se la quitaría.
 */
export const describeAdjustmentFailure = (error: unknown): string => {
  if (!(error instanceof HttpError)) {
    return 'No se pudo ajustar el tiraje. Revisa tu conexión e inténtalo de nuevo.'
  }

  if (error.status === 401) {
    return 'Tu sesión no es válida o venció. Vuelve a iniciar sesión.'
  }

  if (error.status === 403) {
    return 'No tiene permisos para gestionar el catálogo. Se exige rol administrativo y segundo factor verificado en esta sesión.'
  }

  if (error.status === 404) {
    return 'El producto no existe.'
  }

  if (error.status === 409) {
    return 'Otro ajuste modificó el producto mientras editabas. Vuelve a cargarlo y repite el cambio.'
  }

  if (error.status === 422 || error.status === 400) {
    return error.message
  }

  if (error.status === 503) {
    return 'No se pudo comprobar el segundo factor. Inténtalo de nuevo en unos minutos.'
  }

  return 'No se pudo ajustar el tiraje.'
}
