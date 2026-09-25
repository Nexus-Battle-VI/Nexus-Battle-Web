import { HttpError, httpClient } from '@/lib/http'

import type { CreateProductRequest, CreatedProduct } from './contract'
import { i18n } from '@/shared/i18n/i18n'
import { currentLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'

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
    return i18n.t('admin:products.failures.createNetwork')
  }

  if (error.status === 401) {
    return i18n.t('admin:products.failures.session')
  }

  if (error.status === 403) {
    return i18n.t('admin:products.failures.forbidden')
  }

  if (error.status === 409) {
    return i18n.t('admin:products.failures.duplicate')
  }

  if (error.status === 422 || error.status === 400) {
    // El mensaje del servicio nombra el campo exacto (`attributes.values...`),
    // que es mas util que cualquier texto generico que se escriba aqui. En
    // otro idioma se describe por estado (`describeFailure`).
    return describeFailure(error, i18n.t, currentLanguage())
  }

  if (error.status === 503) {
    return i18n.t('admin:products.failures.mfaUnavailable')
  }

  return i18n.t('admin:products.failures.create')
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
    return i18n.t('admin:products.failures.adjustNetwork')
  }

  if (error.status === 401) {
    return i18n.t('admin:products.failures.session')
  }

  if (error.status === 403) {
    return i18n.t('admin:products.failures.forbidden')
  }

  if (error.status === 404) {
    return i18n.t('admin:products.failures.notFound')
  }

  if (error.status === 409) {
    return i18n.t('admin:products.failures.concurrent')
  }

  if (error.status === 422 || error.status === 400) {
    return describeFailure(error, i18n.t, currentLanguage())
  }

  if (error.status === 503) {
    return i18n.t('admin:products.failures.mfaUnavailable')
  }

  return i18n.t('admin:products.failures.adjust')
}

/**
 * Suspende o reactiva un producto (HU-35, borrado lógico): `PATCH
 * /v1/admin/products/{id}/status`. Catalog sigue siendo la única autoridad
 * del estado -esta funcion solo transporta la solicitud y devuelve
 * exactamente lo que el servicio confirma-.
 */
export const updateProductLifecycleStatus = (
  productId: string,
  status: AdministeredProduct['lifecycleStatus'],
  reason: string,
): Promise<AdministeredProduct> =>
  httpClient.patch<AdministeredProduct>(`/v1/admin/products/${productId}/status`, {
    status,
    reason,
  })

/**
 * Traduce el fallo del cambio de estado.
 *
 * Misma taxonomia que Catalog expone para esta ruta (400/401/403/404/503):
 * no se inventa un codigo ni un mensaje distinto de los que el servicio ya
 * documenta para `PATCH .../status`.
 */
export const describeLifecycleStatusFailure = (error: unknown): string => {
  if (!(error instanceof HttpError)) {
    return i18n.t('admin:products.failures.statusNetwork')
  }

  if (error.status === 400) {
    return describeFailure(error, i18n.t, currentLanguage())
  }

  if (error.status === 401) {
    return i18n.t('admin:products.failures.session')
  }

  if (error.status === 403) {
    return i18n.t('admin:products.failures.forbidden')
  }

  if (error.status === 404) {
    return i18n.t('admin:products.failures.notFound')
  }

  if (error.status === 503) {
    return i18n.t('admin:products.failures.mfaUnavailable')
  }

  return i18n.t('admin:products.failures.status')
}
