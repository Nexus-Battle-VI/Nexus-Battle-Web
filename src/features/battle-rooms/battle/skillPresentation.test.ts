import { describe, expect, it } from 'vitest'

import type { LastAttack, LastSkill } from './battleReducer'
import {
  ALL_IN,
  ANA,
  battle,
  BRUNO,
  combatBattle,
  MISS,
  recharging,
  RESOLUTION,
  SHIELD_STRIKE,
  skillBattle,
  STONE_HAND,
  withSkills,
} from './fixtures'
import {
  combatantPower,
  combatantSkills,
  describeDegradedAttack,
  describeLastSkill,
  describeLatestAction,
  describePowerCost,
  describeRecharge,
  describeSkillRejection,
  describeSkillStatus,
  skillAvailability,
  skillsVisible,
  type SkillAvailabilityInput,
} from './skillPresentation'

const ANA_ID = 'sujeto-ana'
const BRUNO_ID = 'sujeto-bruno'

/** Ana (posicion 1) tiene el turno; ambos con 10 de Poder y las dos habilidades. */
const ANAS_TURN = skillBattle(1)

describe('costo, recarga y estado en TEXTO', () => {
  it('describePowerCost distingue el monto fijo y todo el Poder', () => {
    expect(describePowerCost({ mode: 'FIXED', amount: 2 })).toBe('2 de Poder')
    expect(describePowerCost({ mode: 'ALL_AVAILABLE' })).toBe('Todo el Poder')
  })

  it('describeRecharge concuerda en singular y plural', () => {
    expect(describeRecharge(1)).toBe('1 turno de recarga')
    expect(describeRecharge(2)).toBe('2 turnos de recarga')
  })

  it('describeSkillStatus dice el estado y los turnos que faltan, sin depender del color', () => {
    expect(describeSkillStatus(SHIELD_STRIKE)).toBe('Disponible')
    expect(describeSkillStatus(recharging(SHIELD_STRIKE, 1))).toBe('En recarga: falta 1 turno')
    expect(describeSkillStatus(recharging(SHIELD_STRIKE, 2))).toBe('En recarga: faltan 2 turnos')
    expect(describeSkillStatus(STONE_HAND)).toBe('Todavía no disponible')
  })
})

describe('lo que Combat publica de cada participante', () => {
  it('combatantPower y combatantSkills leen el estado del participante correcto', () => {
    const view = withSkills(combatBattle(1), [
      { power: [3, 10], skills: [ALL_IN] },
      { power: [7, 8], skills: [SHIELD_STRIKE, STONE_HAND] },
    ])

    expect(combatantPower(view, BRUNO)).toEqual({ current: 3, max: 10 })
    expect(combatantPower(view, ANA)).toEqual({ current: 7, max: 8 })
    expect(combatantSkills(view, BRUNO)).toEqual([ALL_IN])
    expect(combatantSkills(view, ANA)).toEqual([SHIELD_STRIKE, STONE_HAND])
  })

  it('sin estado de habilidades (batalla anterior a HU-19) es `null` y `[]`', () => {
    expect(combatantPower(combatBattle(1), ANA)).toBeNull()
    expect(combatantSkills(combatBattle(1), ANA)).toEqual([])
    expect(combatantPower(battle(), ANA)).toBeNull()
    expect(combatantSkills(battle(), ANA)).toEqual([])
  })

  it('un participante desconocido tampoco inventa nada', () => {
    expect(combatantPower(skillBattle(), { teamLabel: 'Z', seat: 9 })).toBeNull()
    expect(combatantSkills(skillBattle(), { teamLabel: 'Z', seat: 9 })).toEqual([])
  })
})

describe('skillsVisible — solo en MI turno, con Vida y con habilidades', () => {
  it('es mi turno y mi heroe tiene habilidades: visibles', () => {
    expect(skillsVisible(ANAS_TURN, ANA_ID)).toBe(true)
  })

  it('es el turno del rival: ocultas', () => {
    expect(skillsVisible(ANAS_TURN, BRUNO_ID)).toBe(false)
  })

  it('un espectador (sin participar) o sin sujeto: ocultas', () => {
    expect(skillsVisible(ANAS_TURN, 'sujeto-otro')).toBe(false)
    expect(skillsVisible(ANAS_TURN, null)).toBe(false)
  })

  it('una batalla sin estado de combate (HU-17): ocultas', () => {
    expect(skillsVisible(battle(1), ANA_ID)).toBe(false)
  })

  it('un heroe sin habilidades: ocultas', () => {
    const view = withSkills(combatBattle(1), [
      { power: [10, 10], skills: [SHIELD_STRIKE] },
      { power: [10, 10], skills: [] },
    ])

    expect(skillsVisible(view, ANA_ID)).toBe(false)
  })

  it('un heroe sin Vida no usa habilidades', () => {
    const view = withSkills(
      combatBattle(1, [
        [44, 44],
        [0, 44],
      ]),
      [
        { power: [10, 10], skills: [SHIELD_STRIKE] },
        { power: [10, 10], skills: [SHIELD_STRIKE] },
      ],
    )

    expect(skillsVisible(view, ANA_ID)).toBe(false)
  })
})

describe('skillAvailability — cuando se ofrece una habilidad', () => {
  const base = (patch: Partial<SkillAvailabilityInput> = {}): SkillAvailabilityInput => ({
    connection: 'open',
    synced: true,
    pending: false,
    target: BRUNO,
    skill: SHIELD_STRIKE,
    ...patch,
  })

  it('disponible, con objetivo, conexion lista y sin accion en curso: habilitada', () => {
    expect(skillAvailability(base())).toEqual({ enabled: true, hint: null })
  })

  it('en recarga: deshabilitada, con los turnos que faltan como TEXTO', () => {
    expect(skillAvailability(base({ skill: recharging(SHIELD_STRIKE, 2) }))).toEqual({
      enabled: false,
      hint: 'En recarga: faltan 2 turnos.',
    })
  })

  it('no soportada: deshabilitada, «Todavía no está disponible»', () => {
    expect(skillAvailability(base({ skill: STONE_HAND }))).toEqual({
      enabled: false,
      hint: 'Todavía no está disponible.',
    })
  })

  it('sin conexion abierta o sin sincronizar: deshabilitada', () => {
    expect(skillAvailability(base({ connection: 'reconnecting' })).enabled).toBe(false)
    expect(skillAvailability(base({ synced: false })).enabled).toBe(false)
    expect(skillAvailability(base({ synced: false })).hint).toBe(
      'Esperando la conexión con la batalla…',
    )
  })

  it('con otra accion pendiente (ataque o habilidad): deshabilitada, una accion por turno', () => {
    expect(skillAvailability(base({ pending: true }))).toEqual({
      enabled: false,
      hint: 'Esperando el resultado de tu acción…',
    })
  })

  it('sin objetivo: deshabilitada, pide elegir uno', () => {
    expect(skillAvailability(base({ target: null }))).toEqual({
      enabled: false,
      hint: 'Elige un objetivo.',
    })
  })

  it('el Poder NUNCA deshabilita: con Poder insuficiente Combat degrada a ataque basico (HU-11)', () => {
    // La habilidad cuesta 2 y el heroe tiene 0: la interfaz no lo sabe ni lo decide.
    expect(skillAvailability(base({ skill: ALL_IN })).enabled).toBe(true)
    expect(skillAvailability(base({ skill: SHIELD_STRIKE })).enabled).toBe(true)
  })

  it('CONTROL: cada deshabilitacion tiene su propia causa (ninguna se cuela por otra)', () => {
    const causes = [
      base({ skill: STONE_HAND }),
      base({ skill: recharging(SHIELD_STRIKE) }),
      base({ connection: 'connecting' }),
      base({ pending: true }),
      base({ target: null }),
    ].map((input) => skillAvailability(input).hint)

    expect(new Set(causes).size).toBe(causes.length)
    expect(skillAvailability(base()).hint).toBeNull()
  })
})

describe('describeSkillRejection — texto propio por codigo, nunca el del servidor', () => {
  it.each([
    ['NOT_YOUR_TURN', 'No es tu turno'],
    ['BATTLE_NOT_ACTIVE', 'no está en curso'],
    ['INVALID_TARGET', 'ya no existe'],
    ['SAME_TEAM_TARGET', 'propio equipo'],
    ['TARGET_UNAVAILABLE', 'ya no tiene Vida'],
    ['ACTOR_UNAVAILABLE', 'ya no tiene Vida'],
    ['UNSUPPORTED_COMBAT_PROFILE', 'todavía no están disponibles'],
    ['SKILLS_NOT_AVAILABLE', 'antes de que existieran las habilidades'],
    ['UNKNOWN_SKILL', 'no pertenece a tu héroe'],
    ['UNSUPPORTED_SKILL_EFFECT', 'su efecto aún no está definido'],
    ['SKILL_ON_COOLDOWN', 'sigue en recarga'],
    ['NOT_A_PARTICIPANT', 'No participas'],
    ['ROOM_NOT_FOUND', 'ya no existe'],
  ])('%s -> un texto que menciona «%s»', (code, fragment) => {
    expect(describeSkillRejection(code)).toContain(fragment)
  })

  it('un codigo desconocido cae en un mensaje generico y no repite lo recibido', () => {
    const text = describeSkillRejection('CODIGO_INVENTADO <script>')

    expect(text).toBe('No fue posible usar la habilidad. Inténtalo de nuevo.')
    expect(text).not.toContain('CODIGO_INVENTADO')
  })

  it('en recarga dice que el turno NO se consumio', () => {
    expect(describeSkillRejection('SKILL_ON_COOLDOWN')).toContain('Tu turno no se consumió')
  })
})

const lastSkill = (patch: Partial<LastSkill> = {}): LastSkill => ({
  seq: 2,
  commandId: 'cmd-1',
  actor: ANA,
  target: BRUNO,
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

describe('describeLastSkill — solo con lo que Combat envio', () => {
  it('golpe efectivo: efecto, porcentaje, dano, Vida, Poder y recarga tal cual llegaron', () => {
    const { headline, detail } = describeLastSkill(lastSkill(), ANAS_TURN)

    expect(headline).toBe('Ana usó Golpe con escudo contra Bruno: Golpe crítico (137 %)')
    expect(detail).toContain('El Ataque (14) superó la Defensa (11).')
    expect(detail).toContain('Daño aplicado: 6.')
    expect(detail).toContain('Vida de Bruno: 44 → 38.')
    expect(detail).toContain('Poder de Ana: 10 → 8.')
    expect(detail).toContain('La habilidad queda en recarga: 1 turno.')
  })

  it('golpe que no supera la Defensa: «sin efecto» con los dos valores y sin Vida', () => {
    const { headline, detail } = describeLastSkill(
      lastSkill({ resolution: MISS, targetHealth: { before: 44, after: 44 } }),
      ANAS_TURN,
    )

    expect(headline).toBe('Ana usó Golpe con escudo contra Bruno: sin efecto')
    expect(detail).toContain('El Ataque (11) no superó la Defensa (11).')
    expect(detail).toContain('Poder de Ana: 10 → 8.')
    expect(detail).not.toContain('Vida de Bruno')
  })

  it('efecto «no causa dano»: lo dice y no inventa dano', () => {
    const { headline, detail } = describeLastSkill(
      lastSkill({
        resolution: {
          ...RESOLUTION,
          effect: 'NO_DAMAGE',
          percent: null,
          baseDamage: null,
          calculatedDamage: 0,
          appliedDamage: 0,
        },
        targetHealth: { before: 44, after: 44 },
      }),
      ANAS_TURN,
    )

    expect(headline).toBe('Ana usó Golpe con escudo contra Bruno: No causa daño')
    expect(detail).toContain('El efecto fue «no causa daño».')
  })

  it('muestra los bonos de la habilidad SOLO si son mayores que 0', () => {
    const withBonus = describeLastSkill(lastSkill({ bonus: { attack: 3, damage: 4 } }), ANAS_TURN)
    const withoutBonus = describeLastSkill(
      lastSkill({ bonus: { attack: 0, damage: null } }),
      ANAS_TURN,
    )
    const zeroDamage = describeLastSkill(lastSkill({ bonus: { attack: 0, damage: 0 } }), ANAS_TURN)

    expect(withBonus.detail).toContain('Bono de Ataque de la habilidad: +3.')
    expect(withBonus.detail).toContain('Bono de Daño de la habilidad: +4.')
    expect(withoutBonus.detail).not.toContain('Bono')
    expect(zeroDamage.detail).not.toContain('Bono')
  })

  it('un participante que ya no esta en la cola cae en un texto neutro, no rompe', () => {
    const { headline } = describeLastSkill(
      lastSkill({ actor: { teamLabel: 'Z', seat: 0 }, target: { teamLabel: 'Y', seat: 0 } }),
      ANAS_TURN,
    )

    expect(headline).toBe(
      'Un participante usó Golpe con escudo contra su objetivo: Golpe crítico (137 %)',
    )
  })

  it('recarga en plural', () => {
    expect(
      describeLastSkill(lastSkill({ cooldown: { remainingTurns: 2 } }), ANAS_TURN).detail,
    ).toContain('La habilidad queda en recarga: 2 turnos.')
  })
})

const lastAttack = (patch: Partial<LastAttack> = {}): LastAttack => ({
  seq: 2,
  commandId: 'cmd-1',
  attacker: ANA,
  target: BRUNO,
  resolution: RESOLUTION,
  targetHealth: { before: 44, after: 38 },
  ...patch,
})

describe('describeDegradedAttack y describeLatestAction (HU-11)', () => {
  const degraded = lastAttack({
    degradedFrom: {
      command: 'useSkill',
      abilityId: SHIELD_STRIKE.abilityId,
      reason: 'INSUFFICIENT_POWER',
    },
  })

  it('un ataque normal no se describe como degradado', () => {
    expect(describeDegradedAttack(lastAttack(), ANAS_TURN)).toBeNull()
  })

  it('un ataque degradado explica POR QUE hubo un ataque basico y luego describe el golpe', () => {
    const feedback = describeDegradedAttack(degraded, ANAS_TURN)

    expect(feedback?.headline).toBe(
      'Ana no tenía Poder suficiente para Golpe con escudo: se usó un ataque básico',
    )
    expect(feedback?.detail).toContain('Ana atacó a Bruno: Golpe crítico (137 %).')
    expect(feedback?.detail).toContain('Vida de Bruno: 44 → 38.')
    expect(feedback?.detail).toContain('La habilidad no se gastó ni quedó en recarga.')
  })

  it('si la habilidad ya no esta en la lista, cae en «la habilidad»', () => {
    const view = withSkills(combatBattle(1), [
      { power: [10, 10], skills: [] },
      { power: [10, 10], skills: [] },
    ])

    expect(describeDegradedAttack(degraded, view)?.headline).toContain(
      'para la habilidad: se usó un ataque básico',
    )
  })

  it('describeLatestAction: sin nada que decir es `null`', () => {
    expect(describeLatestAction(null, null, ANAS_TURN)).toBeNull()
  })

  it('describeLatestAction: gana el de seq mayor, sea habilidad o ataque', () => {
    const skillLater = describeLatestAction(
      lastAttack({ seq: 2 }),
      lastSkill({ seq: 3 }),
      ANAS_TURN,
    )
    const attackLater = describeLatestAction(
      lastAttack({ seq: 4 }),
      lastSkill({ seq: 3 }),
      ANAS_TURN,
    )

    expect(skillLater?.headline).toContain('usó Golpe con escudo')
    expect(attackLater?.headline).toContain('atacó a Bruno')
  })

  it('describeLatestAction: solo habilidad o solo ataque', () => {
    expect(describeLatestAction(null, lastSkill(), ANAS_TURN)?.headline).toContain('usó')
    expect(describeLatestAction(lastAttack(), null, ANAS_TURN)?.headline).toContain('atacó')
  })

  it('describeLatestAction: un ataque degradado (seq mayor) se explica como tal', () => {
    const feedback = describeLatestAction({ ...degraded, seq: 5 }, lastSkill({ seq: 3 }), ANAS_TURN)

    expect(feedback?.headline).toContain('no tenía Poder suficiente')
  })
})
