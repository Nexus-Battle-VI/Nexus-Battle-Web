import { HttpError } from '@/lib/http'

const bodyOf = (error: HttpError): { code: string | null; blockers: readonly unknown[] } => {
  const body = error.body
  if (typeof body !== 'object' || body === null) return { code: null, blockers: [] }
  return {
    code: 'code' in body && typeof body.code === 'string' ? body.code : null,
    blockers:
      'blockers' in body && Array.isArray(body.blockers) ? (body.blockers as unknown[]) : [],
  }
}
const blockerLabel = (blocker: unknown): string => {
  if (typeof blocker !== 'object' || blocker === null) return 'un participante'
  const record = blocker as Record<string, unknown>
  const who = typeof record.playerId === 'string' ? record.playerId : 'un participante'
  const why =
    typeof record.reason === 'string'
      ? record.reason
      : typeof record.code === 'string'
        ? record.code
        : null
  return why === null ? who : `${who} (${why})`
}
/** Explicación visible de lo que decidió el servidor; nunca se oculta ni se inventa un resultado. */
export const explainAdminError = (error: unknown): string => {
  if (!(error instanceof HttpError))
    return 'No se pudo comprobar el resultado. Reintenta: se conserva la misma operación.'
  const { code, blockers } = bodyOf(error)
  if (error.status === 403 || error.status === 401)
    return 'Tu cuenta no tiene permiso para administrar justas. No se hizo ningún cambio.'
  switch (code) {
    case 'PARTICIPANTS_UNRESOLVED':
      return 'Esta justa todavía no tiene a sus dos equipos definidos. No se creó ninguna sala, no se asignaron participantes y no hay ganador.'
    case 'ENCOUNTER_NOT_PREPARED':
      return 'Primero hay que preparar la justa; todavía no tiene sala de combate.'
    case 'ENCOUNTER_FINISHED':
      return 'La justa ya terminó y no tiene una sala que preparar.'
    case 'BRACKET_NOT_PUBLISHED':
      return 'El torneo todavía no tiene llaves publicadas.'
    case 'COMBAT_REJECTED_PARTICIPANTS':
      return `Combat rechazó a un participante: ${blockers.length === 0 ? 'sin detalle' : blockers.map(blockerLabel).join(', ')}. No se vinculó ninguna sala.`
    case 'OPERATION_CONFLICT':
      return 'Este identificador de operación ya pertenece a otra acción. No se hizo ningún cambio.'
    case 'ENCOUNTER_NOT_FOUND':
    case 'TOURNAMENT_NOT_FOUND':
      return 'La justa no pertenece a este torneo.'
    case 'COMBAT_ROOM_CONFLICT':
      return 'Combat no reconoce la sala de esta justa. No se hizo ningún cambio.'
    case 'SERVICE_UNAVAILABLE':
      return 'Combat no está disponible. Reintenta: se conserva la misma operación y no se duplicará la sala.'
    default:
      return error.message
  }
}
export const explained = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work()
  } catch (error: unknown) {
    if (error instanceof HttpError)
      throw new HttpError(error.status, explainAdminError(error), error.body)
    throw error
  }
}
