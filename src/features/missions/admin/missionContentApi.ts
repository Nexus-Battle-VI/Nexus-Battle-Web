import { HttpError, httpClient } from '@/lib/http'

import type { MissionContent } from './missionContent'
import { i18n } from '@/shared/i18n/i18n'
import { currentLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'

/**
 * Rutas de administracion de Missions: solo `ADMINISTRATOR` (y superiores). La
 * guarda de la ruta en Web es presentacion; quien decide es Missions.
 */
export const fetchMissionContents = (signal?: AbortSignal): Promise<readonly MissionContent[]> =>
  httpClient.get<readonly MissionContent[]>('/v1/admin/missions', signal)

export const saveMissionContent = (content: MissionContent): Promise<MissionContent> =>
  httpClient.request<MissionContent>(
    `/v1/admin/missions/${encodeURIComponent(content.missionId)}`,
    { method: 'PUT', body: content },
  )

/** Lo que el selector necesita de un producto de Catalog. */
export interface CatalogProductSummary {
  readonly productId: string
  readonly name: string
  readonly type: string
}

interface CatalogPage {
  readonly items?: readonly CatalogProductSummary[]
}

/**
 * Busqueda publica de Catalog por texto y, si se da, por tipo (una pagina de
 * 16). Lista los productos ACTIVE de todos los tipos, tambien ITEM y EPICA.
 */
export const searchCatalogProducts = async (
  query: string,
  type: string | null,
  signal?: AbortSignal,
): Promise<readonly CatalogProductSummary[]> => {
  const params = new URLSearchParams({ page: '1', query })
  if (type !== null) params.set('type', type)
  const page = await httpClient.get<CatalogPage>(`/v1/catalog/products?${params}`, signal)
  return page.items ?? []
}

/** `null` si Catalog ya no conoce el producto enlazado. */
export const fetchCatalogProduct = async (
  productId: string,
  signal?: AbortSignal,
): Promise<CatalogProductSummary | null> => {
  try {
    return await httpClient.get<CatalogProductSummary>(
      `/v1/catalog/products/${encodeURIComponent(productId)}`,
      signal,
    )
  } catch (error: unknown) {
    if (error instanceof HttpError && error.status === 404) return null
    throw error
  }
}

/** El mensaje que ve el administrador cuando Missions rechaza el guardado. */
export const describeSaveFailure = (error: unknown): string => {
  if (error instanceof HttpError) {
    if (error.status === 401) return i18n.t('admin:missions.failures.session')
    if (error.status === 403) return i18n.t('admin:missions.failures.forbidden')
    if (error.status === 400) return describeFailure(error, i18n.t, currentLanguage())
  }
  return error instanceof Error ? error.message : i18n.t('admin:missions.failures.save')
}
