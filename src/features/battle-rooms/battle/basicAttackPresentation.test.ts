import { describe, expect, it } from 'vitest'

import type { LastAttack } from './battleReducer'
import {
  ANA,
  battle,
  BRUNO,
  combatBattle,
  entry,
  MISS,
  RESOLUTION,
  withCombatants,
} from './fixtures'
import {
  attackableTargets,
  attackAvailability,
  combatantHealth,
  describeAttackRejection,
  describeLastAttack,
  findEntry,
  hasCombatState,
  healthFraction,
  healthTone,
  type AttackAvailabilityInput,
} from './presentation'

const ANA_ID = 'sujeto-ana'

describe('healthTone — umbrales del documento oficial (§7.6)', () => {
  it.each([
    [100, 100, 'high'],
    [61, 100, 'high'],
    [60, 100, 'medium'],
    [59, 100, 'medium'],
    [41, 100, 'medium'],
    [40, 100, 'medium'],
    [39, 100, 'low'],
    [1, 100, 'low'],
    [0, 100, 'low'],
  ] as const)('%i de %i -> %s', (current, max, tone) => {
    expect(healthTone({ current, max })).toBe(tone)
  })

  it.each([
    [44, 44, 'high'],
    [27, 44, 'high'], // 61,36 %
    [26, 44, 'medium'], // 59,09 %
    [18, 44, 'medium'], // 40,90 %
    [17, 44, 'low'], // 38,63 %
    [0, 44, 'low'],
  ] as const)('con una Vida maxima que no es 100: %i de %i -> %s', (current, max, tone) => {
    expect(healthTone({ current, max })).toBe(tone)
  })

  it('en el limite exacto del 60 % (p. ej. 30 de 50) es amarillo, no verde; en el 40 % (20 de 50) tambien', () => {
    expect(healthTone({ current: 30, max: 50 })).toBe('medium')
    expect(healthTone({ current: 20, max: 50 })).toBe('medium')
  })

  it('healthFraction es la fraccion 0..1 de la barra', () => {
    expect(healthFraction({ current: 0, max: 44 })).toBe(0)
    expect(healthFraction({ current: 22, max: 44 })).toBe(0.5)
    expect(healthFraction({ current: 44, max: 44 })).toBe(1)
  })
})

describe('Vida de la batalla (HU-18)', () => {
  it('combatantHealth lee la Vida por identidad estable (teamLabel, seat), nunca por heroId', () => {
    const view = combatBattle(0, [
      [40, 44],
      [12, 30],
    ])

    expect(combatantHealth(view, BRUNO)).toEqual({ current: 40, max: 44 })
    expect(combatantHealth(view, ANA)).toEqual({ current: 12, max: 30 })
    expect(combatantHealth(view, { teamLabel: 'Z', seat: 0 })).toBeNull()
  })

  it('un participante sin perfil o una batalla sin `combatants` no tiene Vida', () => {
    expect(combatantHealth(withCombatants(battle(), [null, [44, 44]]), BRUNO)).toBeNull()
    expect(combatantHealth(battle(), BRUNO)).toBeNull()
  })

  it('hasCombatState distingue una batalla con Vida de una anterior a HU-18', () => {
    expect(hasCombatState(combatBattle())).toBe(true)
    expect(hasCombatState(battle())).toBe(false)
    expect(hasCombatState({ ...battle(), combatants: [] })).toBe(false)
  })

  it('findEntry encuentra al participante por identidad estable', () => {
    expect(findEntry(battle(), ANA)?.displayName).toBe('Ana')
    expect(findEntry(battle(), { teamLabel: 'A', seat: 7 })).toBeNull()
  })
})

describe('attackableTargets — solo rivales con Vida (ayuda de interfaz; Combat valida)', () => {
  const order = [
    entry(0, { teamLabel: 'B', seat: 0, displayName: 'B1', playerId: 'b1' }),
    entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: ANA_ID }),
    entry(2, { teamLabel: 'B', seat: 1, displayName: 'B2', playerId: 'b2' }),
    entry(3, { teamLabel: 'A', seat: 1, displayName: 'A2', playerId: 'a2' }),
  ]

  it('excluye a los aliados (y a mi mismo) y a los rivales sin Vida', () => {
    const view = withCombatants(battle(1, order), [
      [30, 44],
      [44, 44],
      [0, 44],
      [44, 44],
    ])

    expect(attackableTargets(view, ANA_ID).map((member) => member.displayName)).toEqual(['B1'])
  })

  it('con todos los rivales con Vida los ofrece en el orden de la cola', () => {
    const view = withCombatants(battle(1, order), [
      [30, 44],
      [44, 44],
      [10, 44],
      [44, 44],
    ])

    expect(attackableTargets(view, ANA_ID).map((member) => member.displayName)).toEqual([
      'B1',
      'B2',
    ])
  })

  it('un rival sin perfil (IA sin Vida) no es un objetivo', () => {
    const view = withCombatants(battle(1), [null, [44, 44]])

    expect(attackableTargets(view, ANA_ID)).toEqual([])
  })

  it('una batalla anterior a HU-18 no ofrece objetivos', () => {
    expect(attackableTargets(battle(1), ANA_ID)).toEqual([])
  })
})

const last = (resolution = RESOLUTION, before = 44, after = 38): LastAttack => ({
  seq: 2,
  commandId: 'cmd-1',
  attacker: BRUNO,
  target: ANA,
  resolution,
  targetHealth: { before, after },
})

describe('describeLastAttack — solo con lo que envio el servidor, jerarquia quien/que/cuanto/Vida', () => {
  const view = combatBattle(1)

  it('golpe critico: titular, impacto, Vida y detalle tecnico secundario', () => {
    const text = describeLastAttack(last(), view)

    expect(text.headline).toBe('¡Golpe crítico de Bruno a Ana!')
    expect(text.impact).toBe('−6 Vida')
    expect(text.tone).toBe('damage')
    expect(text.life).toBe('Ana: 44 → 38')
    expect(text.detail).toBe('Ataque 14 vs Defensa 11 · Golpe crítico 137 %')
  })

  it('daño normal: "Bruno golpeó a Ana"', () => {
    const text = describeLastAttack(last({ ...RESOLUTION, effect: 'DAMAGE', percent: 100 }), view)

    expect(text.headline).toBe('Bruno golpeó a Ana')
    expect(text.detail).toBe('Ataque 14 vs Defensa 11 · Daño normal 100 %')
  })

  it('golpe que no supera la Defensa (igualdad incluida): sin daño, con los dos valores', () => {
    const text = describeLastAttack(last(MISS, 44, 44), view)

    expect(text.headline).toBe('Bruno atacó a Ana, pero no superó su Defensa')
    expect(text.impact).toBe('Sin daño')
    expect(text.life).toBeNull()
    expect(text.detail).toBe('Ataque 11 vs Defensa 11 · el Ataque debe superar la Defensa')
  })

  it('efecto «no causa daño» (0 %): lo dice y no muestra Vida cambiada', () => {
    const text = describeLastAttack(
      last(
        {
          ...RESOLUTION,
          effect: 'NO_DAMAGE',
          percent: 0,
          baseDamage: null,
          calculatedDamage: 0,
          appliedDamage: 0,
        },
        44,
        44,
      ),
      view,
    )

    expect(text.headline).toBe('El ataque de Bruno alcanzó a Ana, pero no causó daño')
    expect(text.impact).toBe('Sin pérdida de Vida')
    expect(text.life).toBeNull()
    expect(text.detail).toBe('Ataque 14 vs Defensa 11 · Efecto: sin daño')
  })

  it('cuando la Vida se acota en 0 (dano aplicado menor que el calculado) lo aclara', () => {
    const text = describeLastAttack(
      last({ ...RESOLUTION, calculatedDamage: 20, appliedDamage: 4 }, 4, 0),
      view,
    )

    expect(text.impact).toBe('−4 Vida')
    expect(text.life).toBe('Ana: 4 → 0')
    expect(text.detail).toContain('daño calculado 20 (la Vida no baja de 0)')
  })

  it.each([
    ['EVADE', 5, 'Ana redujo el impacto del ataque de Bruno', 'Evasión 80 %'],
    ['EVADE', 0, 'Ana esquivó el ataque de Bruno', 'Evasión 80 %'],
    ['RESIST', 5, 'Ana resistió parte del ataque de Bruno', 'Resistencia 80 %'],
    ['RESIST', 0, 'Ana resistió el ataque de Bruno', 'Resistencia 80 %'],
    ['ESCAPE', 5, 'Ana escapó en parte del ataque de Bruno', 'Escape 80 %'],
    ['ESCAPE', 0, 'Ana escapó del ataque de Bruno', 'Escape 80 %'],
  ] as const)(
    '%s con %i de daño: el titular no exagera ("%s")',
    (effect, applied, headline, detail) => {
      const text = describeLastAttack(
        last(
          { ...RESOLUTION, effect, percent: 80, calculatedDamage: applied, appliedDamage: applied },
          44,
          44 - applied,
        ),
        view,
      )

      expect(text.headline).toBe(headline)
      expect(text.impact).toBe(applied > 0 ? `−${String(applied)} Vida` : 'Sin daño')
      expect(text.detail).toContain(detail)
    },
  )

  it('NUNCA muestra identificadores tecnicos', () => {
    const { headline, impact, life, detail } = describeLastAttack(last(), view)

    expect(`${headline} ${String(impact)} ${String(life)} ${detail}`).not.toMatch(
      /sujeto-|heroe-|cmd-1/u,
    )
  })
})

describe('describeAttackRejection — por codigo estable, nunca el texto del servidor', () => {
  it.each([
    ['NOT_YOUR_TURN', 'No es tu turno'],
    ['BATTLE_NOT_ACTIVE', 'no está en curso'],
    ['INVALID_TARGET', 'ya no existe'],
    ['SAME_TEAM_TARGET', 'propio equipo'],
    ['TARGET_UNAVAILABLE', 'ya no tiene Vida'],
    ['ACTOR_UNAVAILABLE', 'no puede atacar'],
    ['UNSUPPORTED_COMBAT_PROFILE', 'todavía no está disponible'],
    ['NOT_A_PARTICIPANT', 'No participas'],
    ['ROOM_NOT_FOUND', 'ya no existe'],
  ])('%s', (code, fragment) => {
    expect(describeAttackRejection(code)).toContain(fragment)
  })

  it.each(['MALFORMED_COMMAND', 'INVALID_COMMAND_ID', 'INTERNAL_ERROR', 'CODIGO_NUEVO'])(
    '%s cae en un mensaje generico y seguro',
    (code) => {
      expect(describeAttackRejection(code)).toBe(
        'No fue posible ejecutar el ataque. Inténtalo de nuevo.',
      )
    },
  )
})

describe('attackAvailability — cuando se ofrece el «Ataque básico»', () => {
  const ready = (overrides: Partial<AttackAvailabilityInput> = {}): AttackAvailabilityInput => ({
    battle: combatBattle(1), // turno de Ana
    subject: ANA_ID,
    connection: 'open',
    synced: true,
    pending: false,
    target: BRUNO,
    ...overrides,
  })

  it('en mi turno, con objetivo, conexion lista y sin ataque en curso: habilitado', () => {
    expect(attackAvailability(ready())).toEqual({ visible: true, enabled: true, hint: null })
  })

  it('fuera de mi turno no se ofrece el boton', () => {
    const result = attackAvailability(ready({ battle: combatBattle(0) }))

    expect(result.visible).toBe(false)
    expect(result.enabled).toBe(false)
    expect(result.hint).toContain('cuando sea tu turno')
  })

  it('sin objetivo elegido: visible pero deshabilitado, con la razon en texto', () => {
    expect(attackAvailability(ready({ target: null }))).toEqual({
      visible: true,
      enabled: false,
      hint: 'Elige un objetivo.',
    })
  })

  it.each([
    ['conectando', { connection: 'connecting' as const }],
    ['reconectando', { connection: 'reconnecting' as const }],
    ['fallida', { connection: 'failed' as const }],
    ['abierta pero sin sincronizar', { synced: false }],
  ])('conexion %s: deshabilitado con la razon en texto', (_name, patch) => {
    expect(attackAvailability(ready(patch))).toMatchObject({
      visible: true,
      enabled: false,
      hint: 'Esperando la conexión con la batalla…',
    })
  })

  it('con un ataque pendiente: deshabilitado (no se envia otro)', () => {
    expect(attackAvailability(ready({ pending: true }))).toMatchObject({
      enabled: false,
      hint: 'Esperando el resultado de tu acción…',
    })
  })

  it('sin rivales con Vida: deshabilitado', () => {
    const view = withCombatants(battle(1), [
      [0, 44],
      [44, 44],
    ])

    expect(attackAvailability(ready({ battle: view, target: null }))).toMatchObject({
      enabled: false,
      hint: 'No hay rivales con Vida a los que atacar.',
    })
  })

  it('mi heroe sin Vida no puede atacar', () => {
    const view = withCombatants(battle(1), [
      [44, 44],
      [0, 44],
    ])

    expect(attackAvailability(ready({ battle: view }))).toMatchObject({
      visible: true,
      enabled: false,
      hint: 'Tu héroe no tiene Vida y no puede atacar.',
    })
  })

  it('una batalla anterior a HU-18 no admite ataque y lo explica', () => {
    const result = attackAvailability(ready({ battle: battle(1) }))

    expect(result.visible).toBe(false)
    expect(result.hint).toContain('antes de que existieran las acciones de combate')
  })

  it('NO depende del Poder: la disponibilidad no recibe ni lee ninguna estadistica', () => {
    expect(Object.keys(ready()).sort()).toEqual(
      ['battle', 'connection', 'pending', 'subject', 'synced', 'target'].sort(),
    )
  })
})
