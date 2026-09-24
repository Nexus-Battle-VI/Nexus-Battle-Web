import { describe, expect, it } from 'vitest'

import { HttpError } from '@/lib/http'

import { battle, entry } from './fixtures'
import {
  combatantName,
  describeRejection,
  describeStartBattleFailure,
  describeTurn,
  findSelf,
  groupCombatants,
} from './presentation'

const ANA = 'sujeto-ana'
const BRUNO = 'sujeto-bruno'

describe('combatantName: nunca un identificador tecnico', () => {
  it('usa el nombre visible de un humano', () => {
    expect(combatantName(entry(0))).toBe('Bruno')
  })

  it('un humano sin nombre visible se llama "Jugador", no por su sujeto', () => {
    expect(combatantName(entry(0, { displayName: null }))).toBe('Jugador')
  })

  it('un oponente IA se llama "Oponente IA"', () => {
    expect(combatantName(entry(1, { kind: 'AI', playerId: null, displayName: null }))).toBe(
      'Oponente IA',
    )
  })
})

describe('findSelf', () => {
  it('encuentra al participante cuyo sujeto es el de la sesion', () => {
    expect(findSelf(battle(), ANA)?.displayName).toBe('Ana')
    expect(findSelf(battle(), BRUNO)?.displayName).toBe('Bruno')
  })

  it('sin sesion o con un sujeto ajeno no hay "yo"', () => {
    expect(findSelf(battle(), null)).toBeNull()
    expect(findSelf(battle(), 'sujeto-ajeno')).toBeNull()
  })

  it('un participante IA (playerId null) nunca coincide con la sesion', () => {
    const view = battle(0, [entry(0, { kind: 'AI', playerId: null }), entry(1)])

    expect(findSelf(view, ANA)?.position).toBe(1)
  })
})

describe('groupCombatants: reparte sin reordenar la cola', () => {
  it('1v1: aliado = yo, rival = el otro', () => {
    const groups = groupCombatants(battle(), ANA)

    expect(groups.allies.map((e) => e.displayName)).toEqual(['Ana'])
    expect(groups.opponents.map((e) => e.displayName)).toEqual(['Bruno'])
  })

  it('2v2: cada grupo conserva el orden de la cola del servidor', () => {
    const view = battle(0, [
      entry(0, { teamLabel: 'B', displayName: 'B1', playerId: 'b1' }),
      entry(1, { teamLabel: 'A', displayName: 'A1', playerId: ANA }),
      entry(2, { teamLabel: 'B', displayName: 'B2', playerId: 'b2' }),
      entry(3, { teamLabel: 'A', displayName: 'A2', playerId: 'a2' }),
    ])
    const groups = groupCombatants(view, ANA)

    expect(groups.allies.map((e) => e.displayName)).toEqual(['A1', 'A2'])
    expect(groups.opponents.map((e) => e.displayName)).toEqual(['B1', 'B2'])
  })

  it('un espectador (sin participar) ve los equipos juntos, con el primero de la cola como referencia', () => {
    const groups = groupCombatants(battle(), 'sujeto-ajeno')

    expect(groups.allies.map((e) => e.teamLabel)).toEqual(['B'])
    expect(groups.opponents.map((e) => e.teamLabel)).toEqual(['A'])
  })
})

describe('describeTurn: solo lee currentTurn, nunca calcula turno + 1', () => {
  it('"Tu turno" cuando el turno vigente es del sujeto de la sesion', () => {
    const turn = describeTurn(battle(0), BRUNO)

    expect(turn.isMyTurn).toBe(true)
    expect(turn.headline).toBe('Tu turno')
    expect(turn.detail).toBe('Tú inicias la batalla · Ronda 1')
  })

  it('"Turno de <nombre>" cuando el turno vigente es del rival', () => {
    const turn = describeTurn(battle(0), ANA)

    expect(turn.isMyTurn).toBe(false)
    expect(turn.headline).toBe('Turno de Bruno')
    expect(turn.detail).toBe('Inicia Bruno la batalla · Ronda 1')
  })

  it('tras el primer turno solo indica la ronda', () => {
    const turn = describeTurn(battle(1), ANA)

    expect(turn.isMyTurn).toBe(true)
    expect(turn.headline).toBe('Tu turno')
    expect(turn.detail).toBe('Ronda 1')
  })

  it('la ronda es la que publica el servidor', () => {
    expect(describeTurn(battle(2), BRUNO).detail).toBe('Ronda 2')
    expect(describeTurn(battle(5), ANA).detail).toBe('Ronda 3')
  })

  it('el turno de un oponente IA se anuncia sin identificadores', () => {
    const view = battle(0, [
      entry(0, { kind: 'AI', playerId: null, displayName: null, heroSubtype: null }),
      entry(1),
    ])

    expect(describeTurn(view, ANA).headline).toBe('Turno de Oponente IA')
  })

  it('sin sesion nunca es "tu turno"', () => {
    expect(describeTurn(battle(0), null).isMyTurn).toBe(false)
  })
})

describe('describeStartBattleFailure: textos propios por codigo, sin filtrar el mensaje crudo', () => {
  it.each([
    [401, 'Tu sesión expiró'],
    [403, 'Solo quien creó la sala puede iniciar la partida.'],
    [404, 'La sala ya no existe.'],
    [409, 'no está lista para comenzar o cambió de estado'],
    [422, 'ya no cumple los requisitos para combatir'],
    [503, 'no pudo validar a los participantes'],
    [500, 'No fue posible iniciar la batalla.'],
  ])('HTTP %i -> mensaje legible', (status, fragment) => {
    const message = describeStartBattleFailure(
      new HttpError(status, `detalle tecnico de la sala ${'x'.repeat(8)}`, null),
    )

    expect(message).toContain(fragment)
    expect(message).not.toContain('detalle tecnico')
  })

  it('422 por equipos de distinto tamano: mensaje propio (por el code, no por el texto), sin filtrar el crudo', () => {
    const message = describeStartBattleFailure(
      new HttpError(422, 'Los equipos tienen distinto tamano (1 contra 3)', {
        code: 'UNSUPPORTED_TEAM_COMPOSITION',
      }),
    )

    expect(message).toContain('distinto tamaño')
    expect(message).toContain('La batalla no comenzó')
    expect(message).not.toContain('1 contra 3')
    expect(message).not.toContain('ya no cumple los requisitos')
  })

  it('un 422 con otro code (o sin cuerpo) sigue siendo el de requisitos de un participante', () => {
    for (const body of [null, {}, { code: 'OTRO' }, 'texto']) {
      expect(describeStartBattleFailure(new HttpError(422, 'x', body))).toContain(
        'ya no cumple los requisitos para combatir',
      )
    }
  })

  it('un error que no es HttpError (red caida) tambien es legible', () => {
    expect(describeStartBattleFailure(new TypeError('Failed to fetch'))).toBe(
      'No fue posible iniciar la batalla. Inténtalo de nuevo.',
    )
  })
})

describe('describeRejection: codigos estables de command.rejected', () => {
  it('traduce los codigos conocidos y cae en un mensaje generico para los demas', () => {
    expect(describeRejection('NOT_A_PARTICIPANT')).toBe('No participas en esta batalla.')
    expect(describeRejection('ROOM_NOT_FOUND')).toBe('La sala ya no existe.')
    expect(describeRejection('ALREADY_AUTHENTICATED')).toBe(
      'No fue posible acceder a esta batalla.',
    )
  })
})
