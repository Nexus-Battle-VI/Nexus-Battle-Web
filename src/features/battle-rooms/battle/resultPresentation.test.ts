import { describe, expect, it } from 'vitest'

import { describeResult } from './resultPresentation'
import { battle, noWinnerResult, winResult } from './fixtures'
import type { BattleResult } from './types'

/**
 * Textos del resultado (HU-21): cada causa x rol, el espectador y el empate. La
 * presentacion NO recalcula el resultado: copia lo que Combat publico.
 */
const disconnection = (): BattleResult => ({
  ...winResult(),
  reason: 'DISCONNECTION',
  disconnected: { teamLabel: 'B', seat: 0 },
})

const absoluteLife = (): BattleResult => ({
  ...winResult(),
  reason: 'TIME_LIMIT',
  tiebreak: 'ABSOLUTE_LIFE',
})

const lifePercent = (): BattleResult => ({
  ...winResult(),
  reason: 'TIME_LIMIT',
  tiebreak: 'LIFE_PERCENT',
})

describe('describeResult — titular y causa por rol (HU-21)', () => {
  it.each([
    ['ganador', 'sujeto-ana', 'won', '¡Victoria!', 'Derrotaste a todos los héroes rivales.'],
    ['perdedor', 'sujeto-bruno', 'lost', 'Derrota', 'Todos tus héroes fueron eliminados.'],
  ] as const)('ELIMINATION, %s', (_label, subject, tone, headline, cause) => {
    const presentation = describeResult(winResult(), subject)

    expect(presentation).toMatchObject({ tone, headline, cause })
  })

  it('ELIMINATION, espectador: texto neutro con el equipo ganador', () => {
    const presentation = describeResult(winResult(), 'sujeto-ajeno')

    expect(presentation).toMatchObject({
      tone: 'neutral',
      headline: 'Ganó el equipo A',
      cause: 'Todos los héroes de un equipo fueron eliminados.',
    })
  })

  it.each([
    ['el ganador', 'sujeto-ana', 'Tu rival se desconectó y no volvió a tiempo.'],
    ['el desconectado', 'sujeto-bruno', 'Te desconectaste y no volviste a tiempo.'],
    ['el espectador', 'sujeto-ajeno', 'Un jugador se desconectó y no volvió a tiempo.'],
  ] as const)('DISCONNECTION, %s', (_label, subject, cause) => {
    expect(describeResult(disconnection(), subject).cause).toBe(cause)
  })

  it('DISCONNECTION, companero del desconectado: texto de equipo', () => {
    const twoVsTwo: BattleResult = {
      ...disconnection(),
      participants: [
        {
          teamLabel: 'A',
          seat: 0,
          kind: 'HUMAN',
          playerId: 'sujeto-ana',
          displayName: 'Ana',
          heroId: 'heroe-1',
          result: 'WON',
        },
        {
          teamLabel: 'B',
          seat: 0,
          kind: 'HUMAN',
          playerId: 'sujeto-bruno',
          displayName: 'Bruno',
          heroId: 'heroe-0',
          result: 'LOST',
        },
        {
          teamLabel: 'B',
          seat: 1,
          kind: 'HUMAN',
          playerId: 'sujeto-compa',
          displayName: 'Compa',
          heroId: 'heroe-2',
          result: 'LOST',
        },
      ],
    }

    expect(describeResult(twoVsTwo, 'sujeto-compa').cause).toBe(
      'Un integrante de tu equipo se desconectó.',
    )
  })
})

describe('describeResult — vencimiento global (HU-21)', () => {
  it.each([
    ['porcentaje', lifePercent(), 'Ganó el equipo con mayor porcentaje de vida restante.'],
    [
      'vida absoluta',
      absoluteLife(),
      'Empataron en porcentaje de vida; ganó el equipo con más vida restante.',
    ],
  ] as const)('TIME_LIMIT con desempate por %s', (_label, result, detail) => {
    const presentation = describeResult(result, 'sujeto-ana')

    expect(presentation.cause).toBe('Se acabó el tiempo (6 minutos).')
    expect(presentation.detail).toBe(detail)
  })

  it('NO_WINNER: titular y detalle de empate total', () => {
    const presentation = describeResult(noWinnerResult(), 'sujeto-ana')

    expect(presentation).toMatchObject({
      tone: 'no-winner',
      headline: 'Sin ganador (empate)',
      detail: 'Empataron en porcentaje y en vida restante: no hay ganador.',
    })
  })

  it('el espectador de un NO_WINNER tambien ve el empate', () => {
    const presentation = describeResult(noWinnerResult(), 'sujeto-ajeno')

    expect(presentation).toMatchObject({ tone: 'no-winner', headline: 'Sin ganador (empate)' })
  })
})

describe('describeResult — marcador y minimizacion', () => {
  it('el marcador copia la vida restante TAL CUAL la publica Combat', () => {
    const result: BattleResult = {
      ...noWinnerResult(),
      teams: [
        { teamLabel: 'A', remainingHealth: 22, maxHealth: 44, lifePercent: 50, eliminated: false },
        { teamLabel: 'B', remainingHealth: 25, maxHealth: 50, lifePercent: 50, eliminated: false },
      ],
    }

    const presentation = describeResult(result, 'sujeto-ana')

    expect(presentation.standings.map((standing) => standing.text)).toEqual([
      'Vida restante 22 / 44 (50 %)',
      'Vida restante 25 / 50 (50 %)',
    ])
  })

  it('el texto nunca expone campos crudos del servidor ni recompensas', () => {
    const presentation = describeResult(winResult(), 'sujeto-ana')
    const all = JSON.stringify(presentation)

    expect(all).not.toMatch(/credits|credit|cofre|recompensa|winnerTeamLabel|lifePercent/u)
    expect(all).not.toContain('ELIMINATION')
  })

  it('la vista del sujeto no depende de la batalla: el resultado trae todo lo necesario', () => {
    expect(describeResult(winResult(), null).headline).toBe('Ganó el equipo A')
    expect(battle().battleId).toBeDefined()
  })
})
