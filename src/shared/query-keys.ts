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
    /**
     * Configuracion de equipamiento de un heroe propio (HU-28,
     * `GET /api/inventories/me/heroes/:heroId/equipment`). El servicio deduce el
     * jugador del testimonio; la clave solo lleva el heroe.
     */
    heroEquipment: (heroReference: string) =>
      ['inventory', 'me', 'hero-equipment', heroReference] as const,
    /**
     * Heroes que el jugador puede preparar (HU-07,
     * `GET /api/inventories/me/heroes`). Sin parametros: el servicio deduce el
     * jugador del testimonio.
     */
    availableHeroes: ['inventory', 'me', 'heroes'] as const,
    /**
     * Configuracion preparada del jugador (HU-07,
     * `GET /api/inventories/me/heroes/selection`). Clave distinta de
     * `heroEquipment`: aquella es "el equipamiento de ESTE heroe" y esta es "el
     * heroe con el que voy a jugar". Compartir clave haria que cambiar de
     * seleccion pareciera cambiar el equipamiento.
     */
    heroSelection: ['inventory', 'me', 'hero-selection'] as const,
  },
  community: {
    threads: ['community', 'threads'] as const,
    thread: (threadId: string) => ['community', 'thread', threadId] as const,
  },
  commerce: {
    byCustomer: (customerId: string) => ['commerce', 'orders', customerId] as const,
    detail: (orderId: string) => ['commerce', 'order', orderId] as const,
    /** La identidad en cache evita reutilizar datos privados de otra sesion. */
    cart: (subject: string | null) => ['commerce', 'cart', subject] as const,
    /**
     * Carrito guardado entre sesiones. Clave distinta de `cart`: son dos
     * cosas distintas, y compartir clave haria que guardar pareciera cambiar
     * el carrito vigente.
     */
    savedCart: (subject: string | null) => ['commerce', 'saved-cart', subject] as const,
    /**
     * Resumen de compra de un pedido. Lleva el pedido en la clave porque el
     * resumen es el de ese pedido concreto, no el del carrito de turno.
     */
    checkout: (subject: string | null, orderId: string) =>
      ['commerce', 'checkout', subject, orderId] as const,
    /** Catalog valida y ejecuta cada consulta, incluidas busqueda y paginacion. */
    showcase: (criteria: string) => ['commerce', 'showcase', criteria] as const,
    product: (reference: string) => ['commerce', 'product', reference] as const,
    payment: (subject: string | null, orderId: string | null) =>
      ['commerce', 'payment', subject, orderId] as const,
    /** Estado deseado/adquirido de todas las referencias visibles. */
    wishlist: (subject: string | null) => ['commerce', 'wishlist', subject] as const,
  },
  account: {
    detail: (accountId: string) => ['account', accountId] as const,
    /** La cuenta propia resuelta por el testimonio (`GET /api/accounts/me`). */
    me: ['account', 'me'] as const,
    /** Datos personales autorizados para el portal de privacidad (HU-45.4). */
    privacy: ['account', 'me', 'privacy'] as const,
    /** Panel administrativo de usuarios filtrado por criterios serializados. */
    adminUsers: (criteriaKey: string) => ['account', 'admin-users', criteriaKey] as const,
  },
} as const
