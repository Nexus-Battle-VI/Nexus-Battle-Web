import { HttpError } from '@/lib/http'

import type { BattleRoom, BattleRoomMode, Team, TeamLetter } from './types'

/**
 * Traduccion de presentacion UNICAMENTE. El valor que viaja al backend sigue
 * siendo literalmente `'PVP'`/`'PVE'` (ver `types.ts`); esto solo decide que
 * texto lee la persona en pantalla.
 */
export const MODE_LABELS: Readonly<Record<BattleRoomMode, string>> = {
  PVP: 'Jugador vs Jugador (JcJ)',
  PVE: 'Jugador vs Máquina (JcE)',
}

/** Descripción breve de cada modalidad, para el selector de creación. */
export const MODE_DESCRIPTIONS: Readonly<Record<BattleRoomMode, string>> = {
  PVP: 'Combate competitivo contra otro jugador.',
  PVE: 'Combate contra oponentes controlados por IA.',
}

export const modeLabel = (mode: BattleRoomMode): string => MODE_LABELS[mode]

/** Formatos de equipo soportados por la UI. Ambos equipos comparten capacidad. */
export const TEAM_FORMATS: readonly { readonly capacity: number; readonly label: string }[] = [
  { capacity: 1, label: '1 vs 1' },
  { capacity: 2, label: '2 vs 2' },
  { capacity: 3, label: '3 vs 3' },
]

/** Cupos ocupados / capacidad total, sumando ambos equipos de la sala. */
export const occupancyOf = (
  room: BattleRoom,
): { readonly filled: number; readonly total: number } =>
  room.teams.reduce(
    (acc, team) => ({
      filled: acc.filled + team.participants.length,
      total: acc.total + team.capacity,
    }),
    { filled: 0, total: 0 },
  )

/**
 * Mensaje legible para un fallo de consulta o mutacion sobre salas de
 * batalla. Los mensajes de dominio de Combat (422/409/403) ya llegan en
 * español y listos para mostrarse (ver `BattleRoomErrors.ts`, auditoria
 * seccion 14): se reenvian tal cual. Solo se reescribe el 401, porque el
 * backend no manda cuerpo estructurado para ese caso.
 */
export const describeBattleRoomFailure = (error: unknown): string => {
  if (error instanceof HttpError) {
    if (error.isUnauthorized) {
      return 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.'
    }

    return error.message
  }

  return 'Ocurrió un error inesperado al comunicarse con el servicio de combate.'
}

/**
 * Equipo A o B de una sala, por su letra. Se busca primero por `label`
 * (el contrato lo declara como `string`, pero Combat asigna literalmente
 * `'A'`/`'B'` — es lo unico que el body de `join` acepta) y, si por algun
 * motivo no coincidiera ningun `label`, se cae a la posicion de creacion
 * (`teamConfigs[0]` es siempre el primer equipo, `[1]` el segundo — ver
 * `CreateBattleRoomInput`), nunca se inventa un equipo que Combat no declaro.
 */
export const teamByLetter = (room: BattleRoom, letter: TeamLetter): Team | undefined =>
  room.teams.find((team) => team.label === letter) ?? room.teams[letter === 'A' ? 0 : 1]

/**
 * Mensaje legible para un fallo de union a sala (HU-15.3). A diferencia de
 * `describeBattleRoomFailure`, aqui SI se fija un texto propio por codigo:
 * unirse tiene mas variantes de error (400/401/404/409×4/422/503) y el
 * enunciado exige que cada una tenga un mensaje humano explicito, nunca el
 * texto tecnico crudo. El 409 es la excepcion deliberada: Combat ya
 * distingue sala llena / duplicado / conflicto de version / no disponible
 * con su propio mensaje de dominio en español (ver auditoria HU-15.2), asi
 * que se reenvia tal cual en vez de aplanarlos a un unico texto generico que
 * ocultaria cual de los cuatro casos ocurrio realmente.
 */
export const describeJoinBattleRoomFailure = (error: unknown): string => {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 400:
        return 'La solicitud de unión no es válida. Actualiza la sala e inténtalo de nuevo.'
      case 401:
        return 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.'
      case 404:
        return 'Esta sala ya no existe o fue eliminada.'
      case 409:
        return error.message.length > 0
          ? error.message
          : 'No fue posible unirte a esta sala: ya no está disponible.'
      case 422:
        return 'Debes preparar un héroe antes de unirte a una sala de batalla.'
      case 503:
        return 'El servicio de combate no está disponible en este momento. Inténtalo de nuevo en unos segundos.'
      default:
        return error.message.length > 0
          ? error.message
          : 'Ocurrió un error inesperado al intentar unirte a la sala.'
    }
  }

  return 'Ocurrió un error inesperado al comunicarse con el servicio de combate.'
}
