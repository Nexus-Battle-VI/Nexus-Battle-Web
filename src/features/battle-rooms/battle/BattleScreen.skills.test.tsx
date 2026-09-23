import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { CombatControls } from './AttackPanel'
import { initialAttackIntentState, type AttackIntentState } from './attackIntent'
import type { LastAttack, LastSkill } from './battleReducer'
import { BattleScreen, type BattleScreenProps } from './BattleScreen'
import {
  ANA as ANA_REF,
  BRUNO as BRUNO_REF,
  combatBattle,
  DEFAULT_SKILL_STATE,
  entry,
  MISS,
  RESOLUTION,
  SHIELD_STRIKE,
  skillBattle,
  withSkills,
} from './fixtures'
import { initialSkillIntentState, type SkillIntentState } from './skillIntent'

const ANA = 'sujeto-ana'
const BRUNO = 'sujeto-bruno'

const controles = (
  overrides: { attack?: AttackIntentState; skill?: SkillIntentState } = {},
): CombatControls => ({
  attack: overrides.attack ?? initialAttackIntentState,
  onAttack: vi.fn(),
  onRetry: vi.fn(),
  onDismissRejection: vi.fn(),
  skill: overrides.skill ?? initialSkillIntentState,
  onUseSkill: vi.fn(),
  onRetrySkill: vi.fn(),
  onDismissSkillRejection: vi.fn(),
})

const pintar = (overrides: Partial<BattleScreenProps> = {}) =>
  render(
    <BattleScreen
      battle={skillBattle(1)}
      subject={ANA}
      connection="open"
      synced
      combat={controles()}
      {...overrides}
    />,
  )

const region = (): HTMLElement =>
  screen.getByRole('status', { name: 'Resultado de la última acción' })

const lastSkill = (patch: Partial<LastSkill> = {}): LastSkill => ({
  seq: 3,
  commandId: 'cmd-1',
  actor: ANA_REF,
  target: BRUNO_REF,
  skill: {
    abilityId: SHIELD_STRIKE.abilityId,
    name: SHIELD_STRIKE.name,
    powerCost: SHIELD_STRIKE.powerCost,
    chargeTurns: SHIELD_STRIKE.chargeTurns,
  },
  power: { before: 10, after: 8 },
  cooldown: { remainingTurns: 1 },
  bonus: { attack: 0, damage: null },
  resolution: RESOLUTION,
  targetHealth: { before: 44, after: 38 },
  ...patch,
})

const lastAttack = (patch: Partial<LastAttack> = {}): LastAttack => ({
  seq: 2,
  commandId: 'cmd-0',
  attacker: BRUNO_REF,
  target: ANA_REF,
  resolution: RESOLUTION,
  targetHealth: { before: 44, after: 38 },
  ...patch,
})

describe('BattleScreen — HU-19: Poder por heroe (medidor de HU-11)', () => {
  it('cada heroe muestra su medidor de Poder con lo que Combat publica', () => {
    const battle = withSkills(combatBattle(1), [
      { power: [3, 10], skills: [] },
      { power: [8, 10], skills: [SHIELD_STRIKE] },
    ])

    pintar({ battle })

    const meters = screen.getAllByRole('meter', { name: /^Poder de / })

    expect(screen.getAllByTestId('power-meter')).toHaveLength(2)
    expect(meters).toHaveLength(2)
    expect(screen.getByRole('meter', { name: 'Poder de Bruno' })).toHaveAttribute(
      'aria-valuenow',
      '3',
    )
    expect(screen.getByRole('meter', { name: 'Poder de Ana' })).toHaveAttribute(
      'aria-valuenow',
      '8',
    )
    expect(screen.getByRole('meter', { name: 'Poder de Ana' })).toHaveAttribute(
      'aria-valuemax',
      '10',
    )
  })

  it('el Poder es de CADA heroe: nunca se combina ni se comparte entre los dos', () => {
    const battle = withSkills(combatBattle(1), [
      { power: [1, 4], skills: [] },
      { power: [9, 12], skills: [] },
    ])

    pintar({ battle })

    expect(screen.getByRole('meter', { name: 'Poder de Bruno' })).toHaveAttribute(
      'aria-valuemax',
      '4',
    )
    expect(screen.getByRole('meter', { name: 'Poder de Ana' })).toHaveAttribute(
      'aria-valuemax',
      '12',
    )
  })

  it('sin estado de habilidades (Combat anterior a HU-19) NO hay medidor de Poder', () => {
    pintar({ battle: combatBattle(1) })

    expect(screen.queryByTestId('power-meter')).not.toBeInTheDocument()
  })

  it('un participante sin Poder publicado (`power: null`) no muestra medidor', () => {
    pintar({ battle: withSkills(combatBattle(1), [null, { power: [5, 10], skills: [] }]) })

    expect(screen.getAllByTestId('power-meter')).toHaveLength(1)
    expect(screen.queryByRole('meter', { name: 'Poder de Bruno' })).not.toBeInTheDocument()
  })

  it('el Poder se actualiza al llegar un `battle` nuevo (sin estado propio en el medidor)', () => {
    const { rerender } = pintar()

    expect(screen.getByRole('meter', { name: 'Poder de Ana' })).toHaveAttribute(
      'aria-valuenow',
      '10',
    )

    rerender(
      <BattleScreen
        battle={withSkills(combatBattle(1), [
          DEFAULT_SKILL_STATE,
          { power: [8, 10], skills: [SHIELD_STRIKE] },
        ])}
        subject={ANA}
        connection="open"
        synced
        combat={controles()}
      />,
    )

    expect(screen.getByRole('meter', { name: 'Poder de Ana' })).toHaveAttribute(
      'aria-valuenow',
      '8',
    )
  })

  it('en 2 contra 2 cada tarjeta muestra el Poder de SU heroe (cuatro valores distintos)', () => {
    const order = [
      entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bea', playerId: 'sujeto-bea' }),
      entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: ANA }),
      entry(2, { teamLabel: 'B', seat: 1, displayName: 'Beto', playerId: 'sujeto-beto' }),
      entry(3, { teamLabel: 'A', seat: 1, displayName: 'Alan', playerId: 'sujeto-alan' }),
    ]
    const battle = withSkills(
      combatBattle(
        1,
        [
          [44, 44],
          [44, 44],
          [44, 44],
          [44, 44],
        ],
        order,
      ),
      [
        { power: [1, 4], skills: [] },
        { power: [2, 5], skills: [SHIELD_STRIKE] },
        { power: [3, 6], skills: [] },
        { power: [4, 7], skills: [] },
      ],
    )

    pintar({ battle })

    for (const [name, current, max] of [
      ['Bea', '1', '4'],
      ['Ana', '2', '5'],
      ['Beto', '3', '6'],
      ['Alan', '4', '7'],
    ] as const) {
      const meter = screen.getByRole('meter', { name: `Poder de ${name}` })

      expect(meter).toHaveAttribute('aria-valuenow', current)
      expect(meter).toHaveAttribute('aria-valuemax', max)
    }
  })

  it('en 2 contra 2 hay un medidor por cada uno de los cuatro heroes', () => {
    const order = [
      entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bea', playerId: 'sujeto-bea' }),
      entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: ANA }),
      entry(2, { teamLabel: 'B', seat: 1, displayName: 'Beto', playerId: 'sujeto-beto' }),
      entry(3, { teamLabel: 'A', seat: 1, displayName: 'Alan', playerId: 'sujeto-alan' }),
    ]
    const battle = withSkills(
      combatBattle(
        1,
        [
          [44, 44],
          [44, 44],
          [44, 44],
          [44, 44],
        ],
        order,
      ),
      [DEFAULT_SKILL_STATE, DEFAULT_SKILL_STATE, DEFAULT_SKILL_STATE, DEFAULT_SKILL_STATE],
    )

    pintar({ battle })

    expect(screen.getAllByTestId('power-meter')).toHaveLength(4)
  })
})

describe('BattleScreen — HU-19: habilidades en el panel de acciones', () => {
  it('en mi turno, junto al «Ataque básico», aparecen las habilidades de mi heroe', () => {
    pintar()

    expect(screen.getByRole('button', { name: 'Ataque básico' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Habilidades' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Usar Golpe con escudo' })).toBeInTheDocument()
  })

  it('fuera de mi turno no hay habilidades ni ataque', () => {
    pintar({ subject: BRUNO, battle: skillBattle(1) })

    expect(screen.queryByRole('heading', { name: 'Habilidades' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Usar / })).not.toBeInTheDocument()
  })

  it('con el control de habilidades ausente (HU-18) el panel es el de siempre', () => {
    const { skill: _skill, onUseSkill: _use, ...sinHabilidades } = controles()

    void _skill
    void _use
    pintar({ combat: sinHabilidades })

    expect(screen.getByRole('button', { name: 'Ataque básico' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Habilidades' })).not.toBeInTheDocument()
  })

  it('una habilidad enviada usa el objetivo elegido y NO dispara el ataque basico', async () => {
    const combat = controles()

    pintar({ combat })
    await userEvent.click(screen.getByRole('button', { name: 'Usar Golpe con escudo' }))

    expect(combat.onUseSkill).toHaveBeenCalledWith(SHIELD_STRIKE.abilityId, {
      teamLabel: 'B',
      seat: 0,
    })
    expect(combat.onAttack).not.toHaveBeenCalled()
  })

  it('con una habilidad pendiente el «Ataque básico» tambien se bloquea (una accion por turno)', async () => {
    const combat = controles({
      skill: {
        intent: {
          commandId: 'cmd-1',
          abilityId: SHIELD_STRIKE.abilityId,
          target: { teamLabel: 'B', seat: 0 },
        },
        unconfirmed: false,
        rejection: null,
      },
    })

    pintar({ combat })

    const ataque = screen.getByRole('button', { name: 'Ataque básico' })

    expect(ataque).toHaveAttribute('aria-disabled', 'true')
    expect(ataque).toHaveAttribute('aria-busy', 'false')

    await userEvent.click(ataque)

    expect(combat.onAttack).not.toHaveBeenCalled()
  })

  it('con un ataque pendiente las habilidades se bloquean tambien', async () => {
    const combat = controles({
      attack: {
        intent: { commandId: 'cmd-1', target: { teamLabel: 'B', seat: 0 } },
        unconfirmed: false,
        rejection: null,
      },
    })

    pintar({ combat })
    await userEvent.click(screen.getByRole('button', { name: 'Usar Golpe con escudo' }))

    expect(screen.getByRole('button', { name: 'Usar Golpe con escudo' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(combat.onUseSkill).not.toHaveBeenCalled()
  })

  it('la epica NO tiene boton: se dice en texto que no hay ninguna disponible (HU-31)', () => {
    pintar()

    expect(screen.queryByRole('button', { name: /épica/iu })).not.toBeInTheDocument()
    expect(
      screen.getByText(/La habilidad épica llegará cuando el juego defina/u),
    ).toBeInTheDocument()
  })
})

describe('BattleScreen — HU-19: resultado de la ultima accion', () => {
  it('una habilidad: quien la uso, contra quien, el resultado, la Vida, el Poder y la recarga', () => {
    pintar({ lastSkill: lastSkill() })

    expect(region()).toHaveTextContent('Ana usó Golpe con escudo contra Bruno')
    expect(region()).toHaveTextContent('−6 Vida')
    expect(region()).toHaveTextContent('Bruno: 44 → 38')
    expect(region()).toHaveTextContent('Poder 10 → 8')
    expect(region()).toHaveTextContent('Recarga 1 turno')
  })

  it('habilidad y ataque: se pinta el de seq mayor', () => {
    const { unmount } = pintar({
      lastSkill: lastSkill({ seq: 3 }),
      lastAttack: lastAttack({ seq: 2 }),
    })

    expect(region()).toHaveTextContent('Ana usó Golpe con escudo')

    unmount()
    pintar({ lastSkill: lastSkill({ seq: 3 }), lastAttack: lastAttack({ seq: 4 }) })

    expect(region()).toHaveTextContent('¡Golpe crítico de Bruno a Ana!')
    expect(region()).not.toHaveTextContent('usó Golpe con escudo')
  })

  it('un ataque basico que sustituyo a una habilidad se explica: Poder insuficiente, la habilidad no se gasto', () => {
    pintar({
      lastAttack: lastAttack({
        seq: 5,
        attacker: ANA_REF,
        target: BRUNO_REF,
        degradedFrom: {
          command: 'useSkill',
          abilityId: SHIELD_STRIKE.abilityId,
          reason: 'INSUFFICIENT_POWER',
        },
      }),
    })

    expect(region()).toHaveTextContent(
      'No había Poder suficiente para Golpe con escudo. Se ejecutó un ataque básico en su lugar',
    )
    expect(region()).toHaveTextContent('la habilidad no se gastó ni quedó en recarga.')
  })

  it('un golpe de habilidad que no supera la Defensa dice sin daño y aun asi muestra el Poder y la recarga', () => {
    pintar({
      lastSkill: lastSkill({ resolution: MISS, targetHealth: { before: 44, after: 44 } }),
    })

    expect(region()).toHaveTextContent(
      'Ana usó Golpe con escudo contra Bruno, pero no superó su Defensa',
    )
    expect(region()).toHaveTextContent('Poder 10 → 8')
  })

  it('ambos jugadores ven el mismo resultado de la habilidad', () => {
    const { unmount } = pintar({ subject: ANA, lastSkill: lastSkill() })
    const ana = region().textContent

    unmount()
    pintar({ subject: BRUNO, lastSkill: lastSkill() })

    expect(region().textContent).toBe(ana)
  })

  it('no filtra identificadores tecnicos: ni el commandId ni el abilityId', () => {
    const { container } = pintar({ lastSkill: lastSkill({ commandId: 'cmd-secreto-123' }) })

    expect(container.textContent).not.toContain('cmd-secreto-123')
    expect(within(region()).queryByText(SHIELD_STRIKE.abilityId)).not.toBeInTheDocument()
    expect(region().textContent).not.toContain(SHIELD_STRIKE.abilityId)
  })

  it('sin nada que decir la region existe pero vacia', () => {
    pintar()

    expect(region()).toBeEmptyDOMElement()
  })
})
