import { HttpError } from '@/lib/http'

import type { BattleRoom, BattleRoomMode } from './types'

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
export const occupancyOf = (room: BattleRoom): { readonly filled: number; readonly total: number } =>
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
