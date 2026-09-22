import { describe, expect, it } from 'vitest'

import {
  attackIntentReducer,
  initialAttackIntentState,
  type AttackIntent,
  type AttackIntentAction,
  type AttackIntentState,
} from './attackIntent'

const INTENT: AttackIntent = { commandId: 'cmd-1', target: { teamLabel: 'A', seat: 0 } }

const run = (
  actions: readonly AttackIntentAction[],
  from: AttackIntentState = initialAttackIntentState,
): AttackIntentState => actions.reduce(attackIntentReducer, from)

const pending = (): AttackIntentState => run([{ type: 'sent', intent: INTENT }])

describe('attackIntentReducer — una intencion de ataque, un commandId', () => {
  it('estado inicial: sin intencion, sin dudas y sin rechazo', () => {
    expect(initialAttackIntentState).toEqual({ intent: null, unconfirmed: false, rejection: null })
  })

  it('enviar deja la intencion pendiente (y limpia un rechazo anterior)', () => {
    const rejected = run([
      { type: 'sent', intent: { ...INTENT, commandId: 'cmd-0' } },
      { type: 'rejected', code: 'NOT_YOUR_TURN', commandId: 'cmd-0' },
    ])
    const state = run([{ type: 'sent', intent: INTENT }], rejected)

    expect(rejected.rejection).toBe('NOT_YOUR_TURN')
    expect(state).toEqual({ intent: INTENT, unconfirmed: false, rejection: null })
  })

  it('el resultado con el MISMO commandId cierra la intencion', () => {
    expect(run([{ type: 'resolved', commandId: 'cmd-1' }], pending())).toEqual(
      initialAttackIntentState,
    )
  })

  it('el resultado de OTRO commandId (un ataque del rival) no toca mi intencion', () => {
    const state = pending()

    expect(run([{ type: 'resolved', commandId: 'cmd-del-rival' }], state)).toBe(state)
  })

  it('un rechazo definitivo con el mismo commandId cierra la intencion y guarda el codigo', () => {
    expect(
      run([{ type: 'rejected', code: 'INVALID_TARGET', commandId: 'cmd-1' }], pending()),
    ).toEqual({
      intent: null,
      unconfirmed: false,
      rejection: 'INVALID_TARGET',
    })
  })

  it('un rechazo de OTRO commandId o sin commandId se ignora', () => {
    const state = pending()

    expect(run([{ type: 'rejected', code: 'NOT_YOUR_TURN', commandId: 'otro' }], state)).toBe(state)
    expect(run([{ type: 'rejected', code: 'NOT_YOUR_TURN' }], state)).toBe(state)
  })

  it('un rechazo sin intencion pendiente se ignora', () => {
    expect(run([{ type: 'rejected', code: 'NOT_YOUR_TURN', commandId: 'cmd-1' }])).toBe(
      initialAttackIntentState,
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

  it('perder la conexion sin intencion no cambia nada', () => {
    expect(run([{ type: 'connectionLost' }])).toBe(initialAttackIntentState)
  })

  it('perder la conexion dos veces es idempotente', () => {
    const once = run([{ type: 'connectionLost' }], pending())

    expect(run([{ type: 'connectionLost' }], once)).toBe(once)
  })

  it('reintentar vuelve a «pendiente» y conserva el mismo commandId', () => {
    const state = run([{ type: 'connectionLost' }, { type: 'retried' }], pending())

    expect(state.intent?.commandId).toBe('cmd-1')
    expect(state.unconfirmed).toBe(false)
  })

  it('reintentar sin duda o sin intencion no cambia nada', () => {
    const state = pending()

    expect(run([{ type: 'retried' }], state)).toBe(state)
    expect(run([{ type: 'retried' }])).toBe(initialAttackIntentState)
  })

  it('cerrar el aviso de rechazo lo limpia; si no habia, no cambia nada', () => {
    const rejected = run(
      [{ type: 'rejected', code: 'INVALID_TARGET', commandId: 'cmd-1' }],
      pending(),
    )

    expect(run([{ type: 'dismissed' }], rejected).rejection).toBeNull()
    expect(run([{ type: 'dismissed' }])).toBe(initialAttackIntentState)
  })
})
