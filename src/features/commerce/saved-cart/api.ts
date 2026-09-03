import { httpClient, HttpError } from '@/lib/http'

export interface SavedCartItem {
  readonly productId?: string
  readonly name?: string
  readonly imageUrl?: string
  readonly sku: string
  /** Precio congelado al guardar, no el vigente. */
  readonly unitPrice: number
  readonly quantity: number
  readonly subtotal: number
}

export interface SavedCart {
  readonly currency: string
  readonly total: number
  readonly itemCount: number
  readonly items: readonly SavedCartItem[]
}

/** El carrito vigente, tal y como lo devuelve la recuperacion. */
export interface RestoredCart {
  readonly id: string
  readonly currency: string
  readonly total: number
  readonly itemCount: number
}

/**
 * Cliente del carrito guardado entre sesiones (HU-61).
 *
 * **Todas estas rutas exigen una identidad verificada.** Con
 * `AUTH_MODE=disabled` el servicio responde `401`, y es correcto: un carrito
 * guardado bajo la identidad anonima seria el carrito compartido de todo el
 * que pase por el servicio. La interfaz distingue ese caso y lo explica, en
 * lugar de mostrarlo como un fallo generico.
 */
export class SavedCartUnavailableError extends Error {
  constructor() {
    super('Guardar el carrito para otra sesion necesita que hayas iniciado sesion.')
    this.name = 'SavedCartUnavailableError'
  }
}

const translate = (error: unknown): unknown =>
  error instanceof HttpError && error.isUnauthorized ? new SavedCartUnavailableError() : error

/** Devuelve `null` cuando el cliente no tiene ningun carrito guardado. */
export const fetchSavedCart = async (signal?: AbortSignal): Promise<SavedCart | null> => {
  try {
    return await httpClient.get<SavedCart>('/orders/cart/persistence', signal)
  } catch (error: unknown) {
    // `404` no es un fallo: es «todavia no has guardado nada».
    if (error instanceof HttpError && error.isNotFound) {
      return null
    }

    throw translate(error)
  }
}

export const saveCart = async (): Promise<SavedCart> => {
  try {
    return await httpClient.post<SavedCart>('/orders/cart/persistence')
  } catch (error: unknown) {
    throw translate(error)
  }
}

export const restoreSavedCart = async (): Promise<RestoredCart> => {
  try {
    return await httpClient.post<RestoredCart>('/orders/cart/persistence/restoration')
  } catch (error: unknown) {
    throw translate(error)
  }
}

export const discardSavedCart = async (): Promise<void> => {
  try {
    await httpClient.delete('/orders/cart/persistence')
  } catch (error: unknown) {
    throw translate(error)
  }
}
