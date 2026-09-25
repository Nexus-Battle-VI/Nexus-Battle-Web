import { HttpError } from '@/lib/http'

import type { BattleRoom, BattleRoomMode, Team, TeamLetter } from './types'
import { i18n } from '@/shared/i18n/i18n'
import { localizedMessages } from '@/shared/i18n/messages'
import { currentLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'

/**
 * Traduccion de presentacion UNICAMENTE. El valor que viaja al backend sigue
 * siendo literalmente `'PVP'`/`'PVE'` (ver `types.ts`); esto solo decide que
 * texto lee la persona en pantalla.
 */
export const MODE_LABELS: Readonly<Record<BattleRoomMode, string>> = localizedMessages({
  PVP: 'battle:modes.PVP',
  PVE: 'battle:modes.PVE',
})

/** Descripción breve de cada modalidad, para el selector de creación. */
export const MODE_DESCRIPTIONS: Readonly<Record<BattleRoomMode, string>> = localizedMessages({
  PVP: 'battle:modeDescriptions.PVP',
  PVE: 'battle:modeDescriptions.PVE',
})

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
      return i18n.t('battle:sessionExpired')
    }

    // En español, el mensaje de dominio de Combat tal cual; en otro idioma,
    // la descripcion por estado (`describeFailure`).
    return describeFailure(error, i18n.t, currentLanguage())
  }

  return i18n.t('battle:unexpected')
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
 * texto tecnico crudo.
 *
 * El 409 YA NO reenvia `error.message` (auditoria HU-15.3, hallazgo:
 * `RoomFullError`/`PlayerAlreadyJoinedError`/`RoomNotJoinableError`/
 * `DuplicateDisplayNameError` interpolan `roomId` -- y `PlayerAlreadyJoinedError`
 * ademas `playerId` -- crudos en `BattleRoomErrors.ts`; ese texto llegaba
 * intacto via `ConflictException(error.message)` hasta el `<p role="alert">`
 * de `BattleRoomCard.tsx`, exponiendo UUID tecnico de sala y playerId en
 * pantalla pese al requisito explicito de la HU de no mostrarlos).
 *
 * Se evaluo distinguir las 4 variantes por algun campo estructurado del
 * cuerpo 409 (`error.body`), pero Nest serializa `ConflictException(message)`
 * como `{ statusCode, message, error: "Conflict" }`: el campo `error` es el
 * mismo texto fijo "Conflict" para las cuatro clases de dominio, no un codigo
 * discriminante, y Combat no expone ningun otro campo (ver
 * `battle-room.controller.ts`, `mapJoinBattleRoomError` /
 * `toHttpException`: las cuatro llegan a la misma rama
 * `new ConflictException(error.message)`). Sin una senal fuera del texto
 * libre del mensaje -que es justamente lo que hay que dejar de usar- la
 * solucion minima y honesta es un unico mensaje generico fijo para todo 409
 * de union, sin intentar adivinar la variante por el contenido del texto.
 *
 * Seguimiento recomendado (Combat, tarea futura, NO implementada aqui): que
 * `JoinBattleRoomError`/las subclases de `BattleRoomErrors.ts` expongan un
 * `code` estructurado (p. ej. `ROOM_FULL`, `PLAYER_ALREADY_JOINED`,
 * `ROOM_NOT_JOINABLE`, `DUPLICATE_DISPLAY_NAME`) en el cuerpo de la
 * respuesta 409, para que el cliente pueda diferenciar sin depender de texto
 * libre ni tocar los mensajes de dominio existentes.
 */
const JOIN_CONFLICT_MESSAGE = 'battle:join.conflict'

/**
 * Mensaje para el 422 de union causado por `ACCOUNT_PROFILE_NOT_FOUND`
 * (HU-15.4, Nexus-Battle-Combat `AccountProfileMissingError`): el testimonio
 * es valido, pero Account no tiene una cuenta asociada a ese sujeto todavia.
 * Distinto del 422 por falta de heroe equipado -- ambos comparten status
 * 422, asi que se distinguen por el `code` estructurado del cuerpo
 * (`error.body`), NO por texto libre (mismo criterio que la nota sobre el
 * 409 mas abajo: nunca adivinar la variante por el contenido del mensaje).
 */
const ACCOUNT_PROFILE_NOT_FOUND_MESSAGE = 'battle:join.accountMissing'

const MISSING_HERO_MESSAGE = 'battle:join.missingHero'

/**
 * HU-23 (contrato §11): rechazos del intento de unirse con apuesta. Se
 * distinguen por el `code` estructurado del cuerpo, nunca por texto libre
 * (mismo criterio que el resto del mapper).
 */
const INSUFFICIENT_AVAILABLE_BALANCE_MESSAGE = 'battle:join.insufficientBalance'

const STAKE_NOT_ALLOWED_IN_PVE_MESSAGE = 'battle:join.stakeInPve'

const INVALID_STAKE_AMOUNT_MESSAGE = 'battle:join.invalidStake'

/**
 * Ruta de accion opcional que acompana un mensaje de fallo de union: siempre
 * una de las rutas ya existentes de React Router (`routes.tsx`), NUNCA una
 * pantalla nueva creada para HU-16.3.
 */
export interface JoinBattleRoomFailureAction {
  readonly label: string
  readonly to: string
}

export interface JoinBattleRoomFailure {
  readonly message: string
  readonly action: JoinBattleRoomFailureAction | null
}

// HU-07 (2026-09-22): "Mi Héroe" se consolido en "Mi Inventario" -ya no es una
// pantalla propia (`/heroes` solo redirige)-, asi que esta accion apunta
// directo al destino real en vez de depender de ese redirect.
// La etiqueta se traduce al leerse (idioma activo); la ruta es fija.
const HEROES_ACTION: JoinBattleRoomFailureAction = {
  get label() {
    return i18n.t('battle:join.reviewHero')
  },
  to: '/inventory',
}
const INVENTORY_ACTION: JoinBattleRoomFailureAction = {
  get label() {
    return i18n.t('battle:join.reviewInventory')
  },
  to: '/inventory',
}

/**
 * HU-16.3 (RF-16, Management#25/#401/#402/#403). Rechazos de elegibilidad
 * precombate de Nexus-Battle-Combat (`PrecombatEligibilityBlockedError`,
 * HU-16.2): el heroe equipado SI existe, pero `blockers[]` declara por que
 * no puede usarse en ESTA sala. Los codigos vienen de dos fuentes distintas,
 * reenviadas TAL CUAL por Combat (nunca reinterpretadas):
 *
 *  - `HeroReadinessPolicy` de Player-Inventory (deriva post-equipar):
 *    `HERO_NOT_ACTIVE`, `EQUIPPED_PRODUCT_NOT_OWNED`,
 *    `EQUIPPED_PRODUCT_NOT_ACTIVE`.
 *  - `PrecombatEligibilityPolicy` de Combat (propia de la sala, DP-5):
 *    `HERO_CLASS_NOT_ALLOWED_FOR_FORMAT`.
 *  - `HERO_NOT_READY` es el codigo de reserva de Combat cuando
 *    `ready=false` sin ningun motivo declarado (defensa en profundidad).
 *
 * Pueden concurrir varios `blockers` a la vez; se elige un unico mensaje por
 * prioridad, del mas especifico y accionable al mas generico. Nunca se
 * interpolan `detail`/`reference`/`slot` del backend en el mensaje: esos
 * campos pueden llevar el id interno del producto (`EQUIPPED_PRODUCT_*`), y
 * la TASK exige no filtrar identificadores internos en la UI.
 *
 * NIVEL DE HEROE, NIVEL MINIMO DE SALA Y MISION ACTIVA NO SE MAPEAN AQUI:
 * `PrecombatEligibilityPolicy` (Combat) documenta explicitamente que ningun
 * servicio tiene hoy una fuente autoritativa para esos tres (ver
 * `docs/hu-16-precombat-eligibility.md` en Nexus-Battle-Combat). Inventar un
 * codigo o un mensaje para ellos aqui violaria la prohibicion expresa de la
 * TASK HU-16.3 de fingir datos que el backend todavia no produce.
 */
const HERO_CLASS_NOT_ALLOWED_FOR_FORMAT_MESSAGE = 'battle:join.classNotAllowed'

const EQUIPMENT_INVALID_MESSAGE = 'battle:join.equipmentInvalid'

const HERO_NOT_ACTIVE_MESSAGE = 'battle:join.heroNotActive'

const HERO_NOT_READY_MESSAGE = 'battle:join.heroNotReady'

/**
 * Fallback seguro para un `code` de bloqueo que esta UI todavia no
 * reconoce (nuevo codigo de Combat/Player-Inventory no contemplado aqui):
 * ningun detalle tecnico del backend, ningun id, solo una accion generica.
 */
const UNKNOWN_ELIGIBILITY_MESSAGE = 'battle:join.unknownEligibility'

interface PrecombatEligibilityBlockerLike {
  readonly code?: unknown
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null

const stringCodeOf = (body: unknown): string | null => {
  const code = asRecord(body)?.code
  return typeof code === 'string' ? code : null
}

/** Codigos de `blockers[].code` presentes en el cuerpo, ignorando cualquier entrada mal formada. */
const blockerCodesOf = (body: unknown): readonly string[] => {
  const blockers = asRecord(body)?.blockers

  if (!Array.isArray(blockers)) {
    return []
  }

  return (blockers as readonly unknown[])
    .map((blocker) =>
      typeof blocker === 'object' && blocker !== null
        ? (blocker as PrecombatEligibilityBlockerLike).code
        : undefined,
    )
    .filter((code): code is string => typeof code === 'string')
}

/**
 * Un unico mensaje/accion para el conjunto de `blockers[]` de
 * `PrecombatEligibilityBlockedError`. Orden de prioridad deliberado: primero
 * lo que NO se arregla revisando equipamiento (restriccion de clase/formato,
 * heroe suspendido), luego lo que si (producto no poseido/no activo),
 * despues el generico sin detalle, y por ultimo el fallback seguro.
 */
const eligibilityBlockerFailure = (codes: readonly string[]): JoinBattleRoomFailure => {
  if (codes.includes('HERO_CLASS_NOT_ALLOWED_FOR_FORMAT')) {
    return { message: i18n.t(HERO_CLASS_NOT_ALLOWED_FOR_FORMAT_MESSAGE), action: HEROES_ACTION }
  }

  if (codes.includes('HERO_NOT_ACTIVE')) {
    return { message: i18n.t(HERO_NOT_ACTIVE_MESSAGE), action: HEROES_ACTION }
  }

  if (
    codes.includes('EQUIPPED_PRODUCT_NOT_OWNED') ||
    codes.includes('EQUIPPED_PRODUCT_NOT_ACTIVE')
  ) {
    return { message: i18n.t(EQUIPMENT_INVALID_MESSAGE), action: INVENTORY_ACTION }
  }

  if (codes.includes('HERO_NOT_READY')) {
    return { message: i18n.t(HERO_NOT_READY_MESSAGE), action: HEROES_ACTION }
  }

  return { message: i18n.t(UNKNOWN_ELIGIBILITY_MESSAGE), action: null }
}

/**
 * Mapper centralizado del fallo de union a sala (HU-15.3 + HU-16.3). Unico
 * punto que interpreta `error.body`; todo componente consume su salida, sin
 * volver a mirar `code`/`blockers` por su cuenta.
 */
export const joinBattleRoomFailure = (error: unknown): JoinBattleRoomFailure => {
  if (!(error instanceof HttpError)) {
    return {
      message: i18n.t('battle:unexpected'),
      action: null,
    }
  }

  switch (error.status) {
    case 400:
      return {
        message: i18n.t('battle:join.badRequest'),
        action: null,
      }
    case 401:
      return { message: i18n.t('battle:sessionExpired'), action: null }
    case 404:
      return { message: i18n.t('battle:join.notFound'), action: null }
    case 409:
      return { message: i18n.t(JOIN_CONFLICT_MESSAGE), action: null }
    case 422: {
      const code = stringCodeOf(error.body)

      if (code === 'ACCOUNT_PROFILE_NOT_FOUND') {
        return { message: i18n.t(ACCOUNT_PROFILE_NOT_FOUND_MESSAGE), action: null }
      }

      if (code === 'HERO_NOT_SELECTED') {
        return { message: i18n.t(MISSING_HERO_MESSAGE), action: HEROES_ACTION }
      }

      if (code === 'INSUFFICIENT_AVAILABLE_BALANCE') {
        return { message: i18n.t(INSUFFICIENT_AVAILABLE_BALANCE_MESSAGE), action: null }
      }

      if (code === 'STAKE_NOT_ALLOWED_IN_PVE') {
        return { message: i18n.t(STAKE_NOT_ALLOWED_IN_PVE_MESSAGE), action: null }
      }

      if (code === 'INVALID_AMOUNT') {
        return { message: i18n.t(INVALID_STAKE_AMOUNT_MESSAGE), action: null }
      }

      const blockerCodes = blockerCodesOf(error.body)

      if (blockerCodes.length > 0) {
        return eligibilityBlockerFailure(blockerCodes)
      }

      // 422 sin `code` reconocido y sin `blockers`: comportamiento previo a
      // HU-16.3 intacto (p. ej. un cuerpo vacio o de forma desconocida).
      return { message: i18n.t(MISSING_HERO_MESSAGE), action: HEROES_ACTION }
    }
    case 503:
      return {
        message: i18n.t('battle:join.unavailable'),
        action: null,
      }
    default:
      return {
        message:
          error.message.length > 0 && currentLanguage() === 'es'
            ? error.message
            : i18n.t('battle:join.unexpected'),
        action: null,
      }
  }
}

export const describeJoinBattleRoomFailure = (error: unknown): string =>
  joinBattleRoomFailure(error).message
