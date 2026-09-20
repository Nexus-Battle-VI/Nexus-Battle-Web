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

  it('reenvia el mensaje real de un 409 (sala llena, duplicado, version...)', () => {
    const error = new HttpError(409, 'La sala ya está llena.', null)
    expect(describeJoinBattleRoomFailure(error)).toBe('La sala ya está llena.')
  })

  it('da un mensaje de respaldo si el 409 llega sin cuerpo', () => {
    const error = new HttpError(409, '', null)
    expect(describeJoinBattleRoomFailure(error)).toContain('no está disponible')
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
