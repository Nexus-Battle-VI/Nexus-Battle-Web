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
  },
  community: {
    threads: ['community', 'threads'] as const,
    thread: (threadId: string) => ['community', 'thread', threadId] as const,
  },
  commerce: {
    byCustomer: (customerId: string) => ['commerce', 'orders', customerId] as const,
    detail: (orderId: string) => ['commerce', 'order', orderId] as const,
  },
  account: {
    detail: (accountId: string) => ['account', accountId] as const,
    /** La cuenta propia resuelta por el testimonio (`GET /api/accounts/me`). */
    me: ['account', 'me'] as const,
  },
} as const
