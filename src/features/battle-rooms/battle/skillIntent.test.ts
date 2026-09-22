import { describe, expect, it } from 'vitest'

import {
  initialSkillIntentState,
  skillIntentReducer,
  type SkillIntent,
  type SkillIntentAction,
  type SkillIntentState,
} from './skillIntent'

const INTENT: SkillIntent = {
  commandId: 'cmd-1',
  abilityId: 'hab-golpe-con-escudo',
  target: { teamLabel: 'B', seat: 0 },
}

const run = (
  actions: readonly SkillIntentAction[],
  from: SkillIntentState = initialSkillIntentState,
): SkillIntentState => actions.reduce(skillIntentReducer, from)

const pending = (): SkillIntentState => run([{ type: 'sent', intent: INTENT }])

describe('skillIntentReducer — una intencion de habilidad, un commandId', () => {
  it('estado inicial: sin intencion, sin dudas y sin rechazo', () => {
    expect(initialSkillIntentState).toEqual({ intent: null, unconfirmed: false, rejection: null })
  })

  it('enviar deja la intencion pendiente (con la habilidad y el objetivo) y limpia un rechazo anterior', () => {
    const rejected = run([
      { type: 'sent', intent: { ...INTENT, commandId: 'cmd-0' } },
      { type: 'rejected', code: 'SKILL_ON_COOLDOWN', commandId: 'cmd-0' },
    ])
    const state = run([{ type: 'sent', intent: INTENT }], rejected)

    expect(rejected.rejection).toBe('SKILL_ON_COOLDOWN')
    expect(state).toEqual({ intent: INTENT, unconfirmed: false, rejection: null })
  })

  it('el resultado con el MISMO commandId cierra la intencion', () => {
    expect(run([{ type: 'resolved', commandId: 'cmd-1' }], pending())).toEqual(
      initialSkillIntentState,
    )
  })

  it('el resultado de OTRO commandId (una accion del rival) no toca mi intencion', () => {
    const state = pending()

    expect(run([{ type: 'resolved', commandId: 'cmd-del-rival' }], state)).toBe(state)
  })

  it('un resultado sin intencion pendiente no cambia nada', () => {
    expect(run([{ type: 'resolved', commandId: 'cmd-1' }])).toBe(initialSkillIntentState)
  })

  it.each([
    'NOT_YOUR_TURN',
    'UNKNOWN_SKILL',
    'UNSUPPORTED_SKILL_EFFECT',
    'SKILL_ON_COOLDOWN',
    'SKILLS_NOT_AVAILABLE',
    'INVALID_TARGET',
  ])(
    'un rechazo definitivo (%s) con el mismo commandId cierra la intencion y guarda el codigo',
    (code) => {
      expect(run([{ type: 'rejected', code, commandId: 'cmd-1' }], pending())).toEqual({
        intent: null,
        unconfirmed: false,
        rejection: code,
      })
    },
  )

  it('un rechazo de OTRO commandId o sin commandId se ignora', () => {
    const state = pending()

    expect(run([{ type: 'rejected', code: 'NOT_YOUR_TURN', commandId: 'otro' }], state)).toBe(state)
    expect(run([{ type: 'rejected', code: 'NOT_YOUR_TURN' }], state)).toBe(state)
  })

  it('un rechazo sin intencion pendiente se ignora', () => {
    expect(run([{ type: 'rejected', code: 'NOT_YOUR_TURN', commandId: 'cmd-1' }])).toBe(
      initialSkillIntentState,
    )
  })

  it('COMMAND_CONFLICT NO cierra la intencion: pide reintentar con el mismo commandId', () => {
    const state = run(
      [{ type: 'rejected', code: 'COMMAND_CONFLICT', commandId: 'cmd-1' }],
      pending(),
    )

    expect(state).toEqual({ intent: INTENT, unconfirmed: true, rejection: null })
  })

  it('perder la conexion con una intencion pendiente la deja sin confirmar (no se reenvia sola)', () => {
    expect(run([{ type: 'connectionLost' }], pending())).toEqual({
      intent: INTENT,
      unconfirmed: true,
      rejection: null,
    })
  })

  it('perder la conexion sin intencion no cambia nada, y dos veces es idempotente', () => {
    expect(run([{ type: 'connectionLost' }])).toBe(initialSkillIntentState)

    const once = run([{ type: 'connectionLost' }], pending())

    expect(run([{ type: 'connectionLost' }], once)).toBe(once)
  })

  it('reintentar vuelve a «pendiente» y conserva el MISMO commandId, habilidad y objetivo', () => {
    const state = run([{ type: 'connectionLost' }, { type: 'retried' }], pending())

    expect(state).toEqual({ intent: INTENT, unconfirmed: false, rejection: null })
  })

  it('reintentar sin duda o sin intencion no cambia nada', () => {
    const state = pending()

    expect(run([{ type: 'retried' }], state)).toBe(state)
    expect(run([{ type: 'retried' }])).toBe(initialSkillIntentState)
  })

  it('cerrar el aviso de rechazo lo limpia; si no habia, no cambia nada', () => {
    const rejected = run(
      [{ type: 'rejected', code: 'SKILL_ON_COOLDOWN', commandId: 'cmd-1' }],
      pending(),
    )

    expect(run([{ type: 'dismissed' }], rejected).rejection).toBeNull()
    expect(run([{ type: 'dismissed' }])).toBe(initialSkillIntentState)
  })

  it('una habilidad degradada a ataque basico (Poder insuficiente) NO es un rechazo: cierra como cualquier resultado', () => {
    const state = run([{ type: 'resolved', commandId: 'cmd-1' }], pending())

    expect(state.rejection).toBeNull()
    expect(state.intent).toBeNull()
  })
})
