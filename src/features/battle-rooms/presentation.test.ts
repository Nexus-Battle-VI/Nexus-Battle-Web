import { describe, expect, it } from 'vitest'

import { HttpError } from '@/lib/http'
import { describeBattleRoomFailure, modeLabel, occupancyOf } from './presentation'
import type { BattleRoom } from './types'

const room = (overrides: Partial<BattleRoom> = {}): BattleRoom => ({
  id: 'room-1',
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    { label: 'A', capacity: 2, participants: [{ kind: 'HUMAN', playerId: 'p1', heroId: null, joinedAt: '2026-01-01' }] },
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
