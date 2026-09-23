/**
 * `Idempotency-Key` de una operacion de compra inmediata (HU-64.6). El backend
 * (HU-64.4) la exige y la usa para que un reintento -manual o automatico por
 * timeout- devuelva la misma confirmacion en vez de ejecutar la compra dos
 * veces.
 *
 * Inyectable, mismo criterio que `newCommandId` en battle-rooms: `crypto.randomUUID`
 * no existe en todos los entornos de prueba.
 */
export type IdempotencyKeyFactory = () => string

export const newIdempotencyKey: IdempotencyKeyFactory = () => globalThis.crypto.randomUUID()
