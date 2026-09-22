/**
 * Identificador de un comando de tiempo real (UUID). Es el `commandId` de ADR-020: sirve
 * para que Combat procese cada comando una sola vez, NO es aleatoriedad de juego.
 *
 * Vive fuera de la pantalla de batalla a proposito: la guarda `noClientAuthority` prohibe
 * cualquier fuente de aleatoriedad en el codigo de la batalla, y un `commandId` es la unica
 * excepcion legitima, aislada aqui y inyectada en `useBattleRealtime` (asi las pruebas fijan
 * el id).
 */
export type CommandIdFactory = () => string

export const newCommandId: CommandIdFactory = () => globalThis.crypto.randomUUID()
