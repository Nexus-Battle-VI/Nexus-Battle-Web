import { describe, expect, it } from 'vitest'

import { emptyDraft, type ProductDraft } from './draft'
import { buildCreateRequest } from './payload'

const base = (patch: Partial<ProductDraft>): ProductDraft => ({
  ...emptyDraft(),
  name: '  Espada de Fuego  ',
  description: 'Espada de dos manos con daño de fuego.',
  imageUrl: 'https://assets.example.test/catalog/espada.webp',
  printRun: '150',
  creditsPrice: '40',
  ...patch,
})

const fixedEffect = (): ProductDraft['effects'][number] => {
  const effect = emptyDraft().effects[0]!

  return {
    ...effect,
    kind: 'DAMAGE',
    magnitude: { ...effect.magnitude, mode: 'FIXED', amount: '7' },
  }
}

describe('Construccion de la peticion', () => {
  it('recorta el nombre y envia los campos comunes', () => {
    const request = buildCreateRequest(base({ type: 'ITEM', effects: [fixedEffect()] }))

    expect(request.name).toBe('Espada de Fuego')
    expect(request.type).toBe('ITEM')
    expect(request.printRun).toBe(150)
    expect(request.creditsPrice).toBe(40)
    expect(request.attributes.schemaVersion).toBe('1')
  })

  /**
   * EL CASO QUE DEVUELVE 422 SI SE HACE MAL. El validador del dominio rechaza
   * toda clave que no reconozca en un efecto, y `stackable` NO esta entre las
   * admitidas: lo fija el propio dominio. Enviarlo -aunque valga `false`-
   * invalida la peticion entera.
   */
  it('NO incluye stackable en el efecto', () => {
    const request = buildCreateRequest(base({ type: 'ITEM', effects: [fixedEffect()] }))
    const values = request.attributes.values as { effects: readonly Record<string, unknown>[] }

    expect(values.effects[0]).not.toHaveProperty('stackable')
  })

  /**
   * Misma familia de fallo: una magnitud solo admite las claves de SU modo. Un
   * `amount` colado en una magnitud de dados no se ignora, invalida el efecto.
   */
  it('la magnitud solo lleva las claves de su modo', () => {
    const effect = fixedEffect()
    const request = buildCreateRequest(
      base({
        type: 'ITEM',
        effects: [
          {
            ...effect,
            magnitude: { ...effect.magnitude, mode: 'DICE', diceCount: '2', diceSides: '6' },
          },
        ],
      }),
    )

    const values = request.attributes.values as {
      effects: readonly { magnitude: Record<string, unknown> }[]
    }

    expect(values.effects[0]?.magnitude).toEqual({ mode: 'DICE', count: 2, sides: 6 })
  })

  it('omite realMoneyPrice cuando el producto no es premium', () => {
    const request = buildCreateRequest(base({ type: 'ITEM', effects: [fixedEffect()] }))

    expect(request).not.toHaveProperty('realMoneyPrice')
    expect(request.premium).toBe(false)
  })

  it('incluye realMoneyPrice cuando el producto es premium', () => {
    const request = buildCreateRequest(
      base({
        type: 'ITEM',
        effects: [fixedEffect()],
        premium: true,
        realMoneyAmount: '999',
        realMoneyCurrency: 'USD',
      }),
    )

    expect(request.realMoneyPrice).toEqual({ amount: 999, currency: 'USD' })
  })

  it('omite powerCost cuando la habilidad consume todo el poder', () => {
    const request = buildCreateRequest(
      base({
        type: 'HABILIDAD',
        compatibleHeroSubtypes: 'GUERRERO, MAGO',
        powerCostMode: 'ALL_AVAILABLE',
        effects: [fixedEffect()],
      }),
    )

    const values = request.attributes.values

    expect(values).not.toHaveProperty('powerCost')
    expect(values.compatibleHeroSubtypes).toEqual(['GUERRERO', 'MAGO'])
    expect(values.chargeTurns).toBe(1)
  })

  /**
   * CONTROL del anterior: con coste fijo la clave SI viaja. Sin este caso,
   * «omite powerCost» podria estar pasando porque nunca se envia.
   */
  it('incluye powerCost cuando la habilidad tiene coste fijo', () => {
    const request = buildCreateRequest(
      base({
        type: 'HABILIDAD',
        compatibleHeroSubtypes: 'GUERRERO',
        powerCostMode: 'FIXED',
        powerCost: '3',
        effects: [fixedEffect()],
      }),
    )

    expect(request.attributes.values).toMatchObject({ powerCost: 3 })
  })

  it('un heroe ofensivo declara ataque y daño, nunca curacion', () => {
    const magnitude = {
      mode: 'FIXED' as const,
      amount: '4',
      basisPoints: '',
      diceCount: '',
      diceSides: '',
    }
    const request = buildCreateRequest(
      base({
        type: 'HEROE',
        heroSubtype: 'GUERRERO',
        basePower: '10',
        baseHealth: '100',
        baseDefense: '5',
        heroProfile: 'OFFENSIVE',
        baseAttack: magnitude,
        baseDamage: magnitude,
        abilities: ['a', 'b', 'c'],
      }),
    )

    const values = request.attributes.values

    expect(values).toHaveProperty('baseAttack')
    expect(values).toHaveProperty('baseDamage')
    expect(values).not.toHaveProperty('baseHealing')
  })

  it('una epica sin efecto general no lo envia', () => {
    const request = buildCreateRequest(
      base({ type: 'EPICA', compatibleHeroSubtype: 'GUERRERO', specificEffect: fixedEffect() }),
    )

    const values = request.attributes.values

    expect(values).not.toHaveProperty('generalEffect')
    expect(values.powerCost).toBe(0)
    expect(values.cooldownTurns).toBe(2)
  })
})
