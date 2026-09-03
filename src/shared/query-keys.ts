/**
 * Claves de consulta centralizadas.
 *
 * Definirlas en un unico lugar evita que dos features usen claves distintas
 * para el mismo recurso, que es la causa habitual de que una invalidacion no
 * refresque lo que deberia.
 */
export const queryKeys = {
  catalog: {
    all: ['catalog', 'products'] as const,
    byCategory: (category: string | null) => ['catalog', 'products', category] as const,
    detail: (sku: string) => ['catalog', 'product', sku] as const,
  },
  inventory: {
    byOwner: (ownerId: string) => ['inventory', ownerId] as const,
    /**
     * Pagina de "Mi Inventario" (HU-27). Lleva pagina, busqueda y filtro en la
     * clave porque la paginacion y la busqueda ocurren en el servicio: cada
     * combinacion es una consulta distinta, y el servicio ya restringe el
     * resultado al inventario del testimonio.
     */
    mine: (params: { readonly page: number; readonly q: string; readonly type: string | null }) =>
      ['inventory', 'me', 'items', params] as const,
    /** Ficha de un producto poseido (`GET /api/inventories/me/items/:reference`). */
    mineItem: (reference: string) => ['inventory', 'me', 'item', reference] as const,
  },
  community: {
    threads: ['community', 'threads'] as const,
    thread: (threadId: string) => ['community', 'thread', threadId] as const,
  },
  commerce: {
    byCustomer: (customerId: string) => ['commerce', 'orders', customerId] as const,
    detail: (orderId: string) => ['commerce', 'order', orderId] as const,
    /**
     * El carrito vigente no lleva el cliente en la clave: el servicio lo
     * deduce del testimonio, asi que la peticion ya es «mi carrito». Ponerlo
     * aqui obligaria a conocerlo antes de poder consultarlo.
     */
    cart: ['commerce', 'cart'] as const,
    /**
     * Carrito guardado entre sesiones. Clave distinta de `cart`: son dos
     * cosas distintas, y compartir clave haria que guardar pareciera cambiar
     * el carrito vigente.
     */
    savedCart: ['commerce', 'saved-cart'] as const,
    /**
     * Resumen de compra de un pedido. Lleva el pedido en la clave porque el
     * resumen es el de ese pedido concreto, no el del carrito de turno.
     */
    checkout: (orderId: string) => ['commerce', 'checkout', orderId] as const,
    /**
     * Vitrina. No lleva los filtros en la clave: se consulta el catalogo una
     * vez y el filtrado ocurre en memoria, asi que incluirlos provocaria una
     * peticion por cada tecla escrita en la busqueda.
     */
    showcase: ['commerce', 'showcase'] as const,
    /**
     * Lista de deseos. Se consulta entera una vez y se resuelve por referencia
     * en memoria: pedir el estado producto a producto serian dieciseis
     * peticiones para pintar una pagina de la vitrina.
     */
    wishlist: ['commerce', 'wishlist'] as const,
  },
  account: {
    detail: (accountId: string) => ['account', accountId] as const,
    /** La cuenta propia resuelta por el testimonio (`GET /api/accounts/me`). */
    me: ['account', 'me'] as const,
    /** Datos personales autorizados para el portal de privacidad (HU-45.4). */
    privacy: ['account', 'me', 'privacy'] as const,
  },
} as const
