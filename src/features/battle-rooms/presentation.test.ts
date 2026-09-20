import { describe, expect, it } from 'vitest'

import { HttpError } from '@/lib/http'
import {
  describeBattleRoomFailure,
  describeJoinBattleRoomFailure,
  modeLabel,
  occupancyOf,
  teamByLetter,
} from './presentation'
import type { BattleRoom } from './types'

const room = (overrides: Partial<BattleRoom> = {}): BattleRoom => ({
  id: 'room-1',
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    {
      label: 'A',
      capacity: 2,
      participants: [{ kind: 'HUMAN', playerId: 'p1', heroId: null, joinedAt: '2026-01-01' }],
    },
    { label: 'B', capacity: 1, participants: [] },
  ],
  reward: { amount: 10 },
  createdBy: 'sujeto-ana',
  createdAt: '2026-01-01T00:00:00.000Z',
  version: 0,
  ...overrides,
})

describe('modeLabel', () => {
  it('traduce PVP y PVE sin cambiar el valor real del contrato', () => {
    expect(modeLabel('PVP')).toContain('JcJ')
    expect(modeLabel('PVE')).toContain('JcE')
  })
})

describe('occupancyOf', () => {
  it('suma jugadores y capacidad de ambos equipos', () => {
    expect(occupancyOf(room())).toEqual({ filled: 1, total: 3 })
  })
})

describe('describeBattleRoomFailure', () => {
  it('reescribe el 401 con un mensaje claro de sesion', () => {
    const error = new HttpError(401, 'Unauthorized', null)
    expect(describeBattleRoomFailure(error)).toContain('sesión expiró')
  })

  it('reenvia tal cual el mensaje de dominio de un 422/403/409', () => {
    const error = new HttpError(422, 'La recompensa debe ser un número mayor o igual a 0.', null)
    expect(describeBattleRoomFailure(error)).toBe(
      'La recompensa debe ser un número mayor o igual a 0.',
    )
  })

  it('da un mensaje generico ante un error que no es HttpError', () => {
    expect(describeBattleRoomFailure(new TypeError('Failed to fetch'))).toContain(
      'error inesperado',
    )
  })
})

describe('teamByLetter', () => {
  it('encuentra el equipo por su label real', () => {
    expect(teamByLetter(room(), 'A')?.capacity).toBe(2)
    expect(teamByLetter(room(), 'B')?.capacity).toBe(1)
  })

  it('cae a la posicion de creacion si ningun label coincide', () => {
    const noLabels = room({
      teams: [
        { label: 'equipo-1', capacity: 3, participants: [] },
        { label: 'equipo-2', capacity: 4, participants: [] },
      ],
    })

    expect(teamByLetter(noLabels, 'A')?.capacity).toBe(3)
    expect(teamByLetter(noLabels, 'B')?.capacity).toBe(4)
  })
})

describe('describeJoinBattleRoomFailure', () => {
  it('da un mensaje humano y distinto para cada codigo conocido', () => {
    const cases: readonly [number, string][] = [
      [400, 'no es válida'],
      [401, 'sesión expiró'],
      [404, 'ya no existe'],
      [422, 'héroe'],
      [503, 'no está disponible'],
    ]

    for (const [status, expected] of cases) {
      expect(
        describeJoinBattleRoomFailure(new HttpError(status, 'texto tecnico crudo', null)),
      ).toContain(expected)
    }
  })

  it('NUNCA reenvia el mensaje crudo de un 409, aunque Combat interpole roomId/playerId', () => {
    // UUID realista de sala + playerId, tal como los interpolan
    // RoomFullError/RoomNotJoinableError/DuplicateDisplayNameError en
    // Nexus-Battle-Combat (BattleRoomErrors.ts).
    const roomId = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/iu

    const messages = [
      `El equipo "B" de la sala "${roomId}" no tiene cupo disponible.`, // RoomFullError
      `El jugador "a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789" ya es participante de la sala "${roomId}".`, // PlayerAlreadyJoinedError
      `La sala "${roomId}" no admite nuevos jugadores porque su estado es PREPARING.`, // RoomNotJoinableError
      `El nombre "ana" ya lo usa otro jugador de la sala "${roomId}".`, // DuplicateDisplayNameError
    ]

    for (const message of messages) {
      const described = describeJoinBattleRoomFailure(new HttpError(409, message, null))

      expect(described).not.toMatch(uuidPattern)
      expect(described).not.toContain(roomId)
      expect(described).not.toBe(message)
    }
  })

  it('da el mismo mensaje generico fijo para cualquier 409 de union, sin cuerpo o vacio', () => {
    const withBody = describeJoinBattleRoomFailure(
      new HttpError(409, 'El equipo "B" de la sala "sala-xyz" no tiene cupo disponible.', null),
    )
    const withoutBody = describeJoinBattleRoomFailure(new HttpError(409, '', null))

    expect(withBody).toBe(withoutBody)
    expect(withBody).toContain('No fue posible unirte a la sala')
  })

  it('reenvia el mensaje real ante un codigo no contemplado explicitamente', () => {
    const error = new HttpError(500, 'Fallo interno del servicio.', null)
    expect(describeJoinBattleRoomFailure(error)).toBe('Fallo interno del servicio.')
  })

  it('da un mensaje generico ante un error que no es HttpError', () => {
    expect(describeJoinBattleRoomFailure(new TypeError('Failed to fetch'))).toContain(
      'error inesperado',
    )
  })
})
