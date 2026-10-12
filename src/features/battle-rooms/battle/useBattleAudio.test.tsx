import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import type { LastAttack, LastEffect } from './battleReducer'
import { ANA, BRUNO, MISS, RESOLUTION, winResult } from './fixtures'
import { useBattleAudio, type BattleAudioInput } from './useBattleAudio'

const sound = vi.hoisted(() => ({
  playBattleSfx: vi.fn(),
  startBattleMusic: vi.fn(),
  stopBattleMusic: vi.fn(),
}))

vi.mock('@/shared/sound', () => sound)

const attack = (seq: number, resolution = RESOLUTION): LastAttack => ({
  seq,
  commandId: `cmd-${String(seq)}`,
  attacker: ANA,
  target: BRUNO,
  resolution,
  targetHealth: { before: 44, after: 44 - resolution.appliedDamage },
})

const epic = (seq: number): LastEffect => ({
  seq,
  commandId: `cmd-${String(seq)}`,
  kind: 'epic',
  actor: BRUNO,
  target: ANA,
  name: 'Furia ancestral',
  power: { before: 10, after: 0 },
  cooldown: { remainingTurns: 0 },
  appliedDamage: 9,
  healed: null,
  targetHealth: { before: 44, after: 35 },
})

const BASE: BattleAudioInput = {
  lastAttack: null,
  lastSkill: null,
  lastHealSkill: null,
  lastEffect: null,
  result: null,
  subject: 'sujeto-ana',
  finished: false,
  isMyTurn: false,
  turnsCompleted: 0,
}

const mount = (initial: BattleAudioInput = BASE) =>
  renderHook(
    (input: BattleAudioInput) => {
      useBattleAudio(input)
    },
    { initialProps: initial },
  )

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useBattleAudio (EN-031)', () => {
  it('la musica empieza con la batalla y se apaga al terminar o al salir', () => {
    const { rerender, unmount } = mount()
    expect(sound.startBattleMusic).toHaveBeenCalledTimes(1)

    rerender({ ...BASE, finished: true, result: winResult() })
    expect(sound.stopBattleMusic).toHaveBeenCalledTimes(1)

    unmount()
    expect(sound.startBattleMusic).toHaveBeenCalledTimes(1)
  })

  it('lo que ya estaba publicado al montar (reconexion) no vuelve a sonar', () => {
    mount({ ...BASE, lastAttack: attack(4) })

    expect(sound.playBattleSfx).not.toHaveBeenCalled()
  })

  it('cada accion nueva suena una vez segun lo que resolvio Combat', () => {
    const { rerender } = mount()

    rerender({ ...BASE, lastAttack: attack(2) })
    expect(sound.playBattleSfx).toHaveBeenLastCalledWith('critical')

    rerender({ ...BASE, lastAttack: attack(3, MISS) })
    expect(sound.playBattleSfx).toHaveBeenLastCalledWith('block')

    rerender({ ...BASE, lastAttack: attack(3, MISS), lastEffect: epic(5) })
    expect(sound.playBattleSfx).toHaveBeenLastCalledWith('epic')

    // Un re-render sin accion nueva no repite el efecto.
    rerender({ ...BASE, lastAttack: attack(3, MISS), lastEffect: epic(5) })
    expect(sound.playBattleSfx).toHaveBeenCalledTimes(3)
  })

  it('avisa con un toque cuando vuelve a ser mi turno, una vez por turno', () => {
    const { rerender } = mount()

    rerender({ ...BASE, isMyTurn: true, turnsCompleted: 1 })
    rerender({ ...BASE, isMyTurn: true, turnsCompleted: 1 })
    expect(sound.playBattleSfx).toHaveBeenCalledTimes(1)
    expect(sound.playBattleSfx).toHaveBeenLastCalledWith('turn')

    rerender({ ...BASE, isMyTurn: false, turnsCompleted: 2 })
    rerender({ ...BASE, isMyTurn: true, turnsCompleted: 3 })
    expect(sound.playBattleSfx).toHaveBeenCalledTimes(2)
  })

  it('al final suena la fanfarria de quien mira: victoria para Ana, derrota para Bruno', () => {
    const ana = mount()
    ana.rerender({ ...BASE, finished: true, result: winResult() })
    expect(sound.playBattleSfx).toHaveBeenLastCalledWith('victory')

    const bruno = mount({ ...BASE, subject: 'sujeto-bruno' })
    bruno.rerender({ ...BASE, subject: 'sujeto-bruno', finished: true, result: winResult() })
    expect(sound.playBattleSfx).toHaveBeenLastCalledWith('defeat')
  })
})
