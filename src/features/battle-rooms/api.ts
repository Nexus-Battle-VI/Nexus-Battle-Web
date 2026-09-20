import { httpClient } from '@/lib/http'

import type { BattleRoom, CreateBattleRoomInput, JoinBattleRoomInput } from './types'

/**
 * `GET /v1/combat/rooms` (tras el gateway, `/api/v1/combat/rooms`).
 *
 * El controlador de Combat no acepta ningun parametro de consulta hoy (ver
 * `battle-room.controller.ts`, `list()`): cualquier filtro de la UI se aplica
 * client-side sobre el arreglo completo que devuelve esta funcion, nunca
 * como query string. Puede devolver `[]`, que es el estado vacio real, no un
 * error.
 */
export const fetchBattleRooms = (signal?: AbortSignal): Promise<readonly BattleRoom[]> =>
  httpClient.get<readonly BattleRoom[]>('/v1/combat/rooms', signal)

/**
 * `POST /v1/combat/rooms`. El creador SIEMPRE sale de `identity.subject` en el
 * servicio: este `input` no declara `createdBy` ni `playerId` porque el DTO
 * de Combat tampoco los acepta.
 */
export const createBattleRoom = (input: CreateBattleRoomInput): Promise<BattleRoom> =>
  httpClient.post<BattleRoom>('/v1/combat/rooms', input)

/**
 * `POST /v1/combat/rooms/:roomId/cancel`. Solo el creador puede cancelar
 * (403 si no lo es); la sala debe estar `WAITING_FOR_PLAYERS` (409 si no).
 * La UI oculta la accion para quien no es el creador, pero esa comprobacion
 * es solo visual: la autoridad real es el backend.
 */
export const cancelBattleRoom = (roomId: string): Promise<BattleRoom> =>
  httpClient.post<BattleRoom>(`/v1/combat/rooms/${encodeURIComponent(roomId)}/cancel`)

/**
 * `POST /v1/combat/rooms/:roomId/join` (HU-15.2/15.3). `team` viaja solo
 * cuando la persona eligio uno explicito; la autoridad real sobre si la
 * union es valida (sala llena, ya es participante, version en conflicto,
 * sin heroe equipado...) es siempre el backend — esta funcion no valida nada,
 * solo transporta la solicitud.
 */
export const joinBattleRoom = (
  roomId: string,
  input: JoinBattleRoomInput = {},
): Promise<BattleRoom> =>
  httpClient.post<BattleRoom>(`/v1/combat/rooms/${encodeURIComponent(roomId)}/join`, input)
