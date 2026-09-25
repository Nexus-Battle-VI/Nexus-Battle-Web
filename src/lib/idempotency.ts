/**
 * Valor de la cabecera `Idempotency-Key` de un comando que el servidor deduplica:
 * un reintento con la misma clave devuelve el mismo resultado en vez de repetir el
 * efecto. Es la identidad de una peticion, no una decision de juego; por eso vive
 * fuera de las features y las guardas que prohiben el azar en una feature (la de
 * Misiones, HU-09.5) no la confunden con un calculo. Mismo criterio que
 * `newIdempotencyKey` de Auction y `newCommandId` de battle-rooms.
 */
export const newIdempotencyKey = (): string => globalThis.crypto.randomUUID()
