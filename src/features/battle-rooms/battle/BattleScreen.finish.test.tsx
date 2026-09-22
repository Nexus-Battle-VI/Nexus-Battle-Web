import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { BattleScreen } from './BattleScreen'
import { combatBattle, noWinnerResult, winResult, withCombatants } from './fixtures'

/**
 * Pantalla de batalla tras el final (HU-21): se conserva la arena, desaparecen
 * las acciones (no deshabilitadas: no existen), no hay temporizadores y la vista
 * de resultado va entre la arena y el resto. Web no decide nada: pinta el
 * resultado de Combat.
 */
const renderFinished = (
  overrides: Partial<Parameters<typeof BattleScreen>[0]> = {},
): ReturnType<typeof renderWithProviders> =>
  renderWithProviders(
    <BattleScreen
      battle={combatBattle(2)}
      subject="sujeto-ana"
      connection="open"
      synced
      result={winResult()}
      {...overrides}
    />,
  )

describe('BattleScreen — resultado (HU-21)', () => {
  it('victoria: titular, causa, marcador y «Batalla terminada» en el HUD', () => {
    renderFinished()

    expect(screen.getByRole('heading', { name: '¡Victoria!' })).toBeInTheDocument()
    expect(screen.getByText('Derrotaste a todos los héroes rivales.')).toBeInTheDocument()
    expect(screen.getByText('Batalla terminada')).toBeInTheDocument()
    expect(screen.queryByText('Tu turno')).not.toBeInTheDocument()
  })

  it('derrota y empate tienen su propio titular', () => {
    const { unmount } = renderFinished({ subject: 'sujeto-bruno' })

    expect(screen.getByRole('heading', { name: 'Derrota' })).toBeInTheDocument()
    unmount()

    renderFinished({ result: noWinnerResult(), subject: 'sujeto-ana' })

    expect(screen.getByRole('heading', { name: 'Sin ganador (empate)' })).toBeInTheDocument()
  })

  it('las acciones de combate NO existen tras el final (ni deshabilitadas)', () => {
    renderFinished({
      combat: {
        attack: { intent: null, unconfirmed: false, rejection: null },
        onAttack: () => undefined,
        onRetry: () => undefined,
        onDismissRejection: () => undefined,
        skill: { intent: null, unconfirmed: false, rejection: null },
        onUseSkill: () => undefined,
        onRetrySkill: () => undefined,
        onDismissSkillRejection: () => undefined,
      },
    })

    expect(screen.queryByRole('button', { name: /ataque básico/iu })).toBeNull()
    expect(screen.queryByText(/Las acciones de combate no están disponibles/u)).toBeNull()
  })

  it('no se montan temporizadores tras el final', () => {
    renderFinished({
      serverClock: { serverAtSyncMs: 0, monotonicAtSyncMs: 0 },
      battle: {
        ...combatBattle(2),
        deadlines: {
          turnEndsAt: '2026-09-21T10:00:30.000Z',
          battleEndsAt: '2026-09-21T10:06:00.000Z',
        },
      },
    })

    expect(screen.queryAllByRole('timer')).toHaveLength(0)
  })

  it('la franja de resultado conserva el ultimo golpe', () => {
    renderFinished({
      lastAttack: {
        seq: 2,
        commandId: 'cmd-1',
        attacker: { teamLabel: 'A', seat: 0 },
        target: { teamLabel: 'B', seat: 0 },
        resolution: {
          attackValue: 16,
          defenseValue: 11,
          effective: true,
          effect: 'DAMAGE',
          percent: 100,
          baseDamage: 6,
          calculatedDamage: 6,
          appliedDamage: 6,
        },
        targetHealth: { before: 44, after: 38 },
      },
    })

    expect(screen.getByRole('status', { name: 'Resultado de la última acción' })).toHaveTextContent(
      /6/u,
    )
  })

  it('un turno perdido mas reciente que las acciones se anuncia con el nombre de la cola', () => {
    renderFinished({
      lastAttack: {
        seq: 2,
        commandId: 'cmd-1',
        attacker: { teamLabel: 'A', seat: 0 },
        target: { teamLabel: 'B', seat: 0 },
        resolution: {
          attackValue: 16,
          defenseValue: 11,
          effective: true,
          effect: 'DAMAGE',
          percent: 100,
          baseDamage: 6,
          calculatedDamage: 6,
          appliedDamage: 6,
        },
        targetHealth: { before: 44, after: 38 },
      },
      lastTurnTimeout: { seq: 3, timedOut: { teamLabel: 'B', seat: 0 }, occurredAt: 'x' },
    })

    expect(screen.getByText('Bruno perdió el turno por tiempo.')).toBeInTheDocument()
  })

  it('la vista de resultado va DESPUES de la arena y ANTES de la franja de resultado (orden del DOM)', () => {
    const { container } = renderFinished()
    const html = container.innerHTML

    expect(html.indexOf('VS')).toBeGreaterThan(-1)
    expect(html.indexOf('VS')).toBeLessThan(html.indexOf('battle-result-headline'))
    expect(html.indexOf('battle-result-headline')).toBeLessThan(
      html.indexOf('Resultado de la última acción'),
    )
  })

  it('una batalla en curso sigue mostrando el panel de acciones y el turno', () => {
    renderWithProviders(
      <BattleScreen
        battle={withCombatants(combatBattle(1), [
          [44, 44],
          [44, 44],
        ])}
        subject="sujeto-ana"
        connection="open"
        synced
        combat={{
          attack: { intent: null, unconfirmed: false, rejection: null },
          onAttack: () => undefined,
          onRetry: () => undefined,
          onDismissRejection: () => undefined,
          skill: { intent: null, unconfirmed: false, rejection: null },
          onUseSkill: () => undefined,
          onRetrySkill: () => undefined,
          onDismissSkillRejection: () => undefined,
        }}
      />,
    )

    expect(screen.getByText('Tu turno')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '¡Victoria!' })).toBeNull()
  })
})
