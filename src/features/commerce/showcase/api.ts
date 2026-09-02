import { httpClient } from '@/lib/http'

/**
 * Productos de la vitrina, tal y como los publica Catalog **hoy**.
 *
 * Esta interfaz refleja el contrato real y no el deseado. HU-57 pide mostrar
 * ademas imagen, descripcion, habilidades y el porcentaje de descuento, y
 * ninguno de esos campos existe todavia en `GET /api/products`: el producto
 * canonico de Catalog si los modela (`imageUrl`, `description`, `attributes`),
 * pero su controlador no los expone.
 *
 * Se declara aqui en lugar de inventarlos: un campo opcional relleno con un
 * valor de relleno haria que la vitrina pareciera terminada cuando no lo esta.
 *
 * Commerce tiene su propio cliente en vez de importar el de `features/catalog`
 * porque ninguna feature importa de otra, y `features/catalog` pertenece a
 * Team Gama.
 */
export interface ShowcaseMoney {
  readonly amount: number
  readonly currency: string
}

export interface ShowcaseProduct {
  readonly sku: string
  readonly name: string
  /** Tipo de producto. Es el campo sobre el que filtra HU-57. */
  readonly category: string
  readonly price: ShowcaseMoney
  readonly isPremium: boolean
  readonly realMoneyPrice: ShowcaseMoney | null
  readonly status: string
}

/** Productos publicados. Catalog solo acepta filtrar por categoria. */
export const fetchShowcase = (signal?: AbortSignal): Promise<ShowcaseProduct[]> =>
  httpClient.get<ShowcaseProduct[]>('/products', signal)
