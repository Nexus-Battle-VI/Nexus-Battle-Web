import { describe, expect, it } from 'vitest'

import type { EquippedEffect } from './api'
import { describeEquipmentEffect } from './effectPresentation'

const effect = (overrides: Partial<EquippedEffect>): EquippedEffect => ({
  sourceSlot: 'WEAPON_1',
  sourceProductId: 'producto-1',
  sourceProductReference: 'espada',
  kind: 'STAT_MODIFIER',
  target: 'SELF',
  hasActivationCondition: false,
  appliedToStats: true,
  ...overrides,
})

describe('describeEquipmentEffect — efectos en palabras, no en codigos', () => {
  it('+2 Ataque (modificador propio)', () => {
    expect(
      describeEquipmentEffect(
        effect({
          statistic: 'ATTACK',
          operation: 'INCREASE',
          magnitude: { mode: 'FIXED', amount: 2 },
        }),
      ),
    ).toBe('+2 Ataque')
  })

  it('−1 Ataque al rival', () => {
    expect(
      describeEquipmentEffect(
        effect({
          statistic: 'ATTACK',
          operation: 'DECREASE',
          target: 'OPPONENT',
          magnitude: { mode: 'FIXED', amount: 1 },
        }),
      ),
    ).toBe('−1 Ataque al rival')
  })

  it('Daño +1d4 (un dado sigue siendo un dado)', () => {
    expect(
      describeEquipmentEffect(
        effect({
          kind: 'DAMAGE',
          operation: 'INCREASE',
          magnitude: { mode: 'DICE', count: 1, sides: 4 },
        }),
      ),
    ).toBe('Daño +1d4')
  })

  it('+2% Probabilidad de crítico', () => {
    expect(
      describeEquipmentEffect(
        effect({
          statistic: 'CRITICAL_CHANCE',
          operation: 'INCREASE',
          magnitude: { mode: 'PERCENTAGE', basisPoints: 200 },
        }),
      ),
    ).toBe('+2% Probabilidad de crítico')
  })

  it('efectos especiales sin magnitud: nombre legible y a quien afecta', () => {
    expect(describeEquipmentEffect(effect({ kind: 'IMMUNITY', target: 'ALLIED_GROUP' }))).toBe(
      'Inmunidad a tu equipo',
    )
    expect(describeEquipmentEffect(effect({ kind: 'CODIGO_NUEVO' }))).toBe('Efecto especial')
  })

  it('nunca muestra los codigos crudos', () => {
    const text = describeEquipmentEffect(
      effect({
        statistic: 'DEFENSE',
        operation: 'INCREASE',
        magnitude: { mode: 'FIXED', amount: 1 },
      }),
    )

    expect(text).not.toMatch(/STAT_MODIFIER|INCREASE|SELF|DEFENSE/u)
  })
})
