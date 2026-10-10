import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import capture from '@/features/tournament/dev/trio-combat-wire.fixture.json'
import { BattleScreen } from '@/features/battle-rooms/battle/BattleScreen'
import {
  battleReducer,
  initialBattleState,
  type BattleAction,
} from '@/features/battle-rooms/battle/battleReducer'
import { isBattleEventMessage, isSnapshotMessage } from '@/features/battle-rooms/battle/types'

/** Real HTTP/WS Combat bytes; external services and persistence are documented in the capture. */
const states = capture.encounters.map((encounter) => {
  const messages: unknown[] = encounter.raw.map((raw) => JSON.parse(raw) as unknown)
  const actions = messages.flatMap((message): BattleAction[] =>
    isSnapshotMessage(message)
      ? [{ type: 'snapshot', message }]
      : isBattleEventMessage(message)
        ? [{ type: 'event', message }]
        : [],
  )
  return { ...encounter, messages, state: actions.reduce(battleReducer, initialBattleState) }
})
describe('Combat TRIO real · DTO, reductor y arena compartida', () => {
  it('las dos salas mantienen identidades distintas y seis puestos en los mensajes de Combat', () => {
    expect(capture.kind).toBe('REAL_COMBAT_HTTP_WS_ENGINE_WITH_EXPLICIT_EXTERNAL_DOUBLES')
    expect(states).toHaveLength(2)
    expect(new Set(states.map((entry) => entry.roomId)).size).toBe(2)
    for (const { messages, state } of states) {
      expect(messages.some(isSnapshotMessage)).toBe(true)
      expect(state.battle?.turnOrder).toHaveLength(6)
      expect(state.battle?.combatants).toHaveLength(6)
      expect(
        new Set(state.battle?.turnOrder.map((entry) => `${entry.teamLabel}:${String(entry.seat)}`))
          .size,
      ).toBe(6)
    }
  })
  it('la acción contra el tercer puesto modifica solo E1 y Web reconoce el evento entero', () => {
    const first = states[0]!,
      second = states[1]!
    expect(first.state.lastAttack?.target.seat).toBe(2)
    expect(first.state.battle?.turnsCompleted).toBe(1)
    expect(second.state.battle?.turnsCompleted).toBe(0)
    expect(first.state.battle?.battleId).not.toBe(second.state.battle?.battleId)
  })
  it.each([0, 1])(
    'representa los seis participantes de la sala %i sin controles administrativos',
    (index) => {
      const entry = states[index]!
      if (!entry.state.battle) throw new Error('Captura sin batalla de Combat')
      renderWithProviders(
        <BattleScreen
          battle={entry.state.battle}
          subject={entry.subject}
          connection="open"
          synced
          lastAttack={entry.state.lastAttack}
        />,
      )
      expect(screen.getAllByRole('meter', { name: /^Vida de /u })).toHaveLength(6)
      expect(
        within(screen.getByRole('region', { name: 'Tu equipo' })).getAllByRole('listitem'),
      ).toHaveLength(3)
      expect(
        within(screen.getByRole('region', { name: 'Rival' })).getAllByRole('listitem'),
      ).toHaveLength(3)
      expect(screen.queryByRole('button', { name: /^Preparar|^Iniciar/u })).not.toBeInTheDocument()
    },
  )
})
