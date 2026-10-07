import { describe, expect, it } from 'vitest'

import { emptyDraft, type ProductDraft } from './draft'
import { validateAttributes, validateBasics, validatePricing } from './validation'

const withBasics = (patch: Partial<ProductDraft> = {}): ProductDraft => ({
  ...emptyDraft(),
  name: 'Espada de Fuego',
  description: 'Espada de dos manos con daño de fuego.',
  imageUrl:
    'https://api.example.test/api/v1/catalog/product-assets/f293ce6b-98e9-41da-99ef-0ad4e3a95120/content',
  type: 'ARMA',
  ...patch,
})

describe('Paso 1: datos basicos', () => {
  it('acepta un producto correctamente descrito', () => {
    expect(validateBasics(withBasics())).toEqual({})
  })

  it.each([
    ['dos caracteres', 'Es'],
    ['ochenta y uno', 'x'.repeat(81)],
  ])('rechaza un nombre de %s', (_caso, name) => {
    expect(validateBasics(withBasics({ name }))).toHaveProperty('name')
  })

  it('exige elegir tipo de producto', () => {
    expect(validateBasics(withBasics({ type: '' }))).toHaveProperty('type')
  })

  it('rechaza una imagen que no procede de un asset finalizado', () => {
    expect(
      validateBasics(withBasics({ imageUrl: 'https://assets.example.test/catalog/espada.webp' })),
    ).toHaveProperty('imageUrl')
  })
})

describe('Paso 3: tiraje y precio', () => {
  const pricing = (patch: Partial<ProductDraft>): ProductDraft => withBasics(patch)

  it('acepta un tiraje limitado', () => {
    expect(validatePricing(pricing({ printRun: '150', creditsPrice: '40' }))).toEqual({})
  })

  /**
   * HU-34: con tiraje infinito NO se pide cantidad, asi que tampoco se valida.
   * Exigir un numero que la pantalla ya no muestra dejaria el formulario
   * bloqueado sin que se viera donde.
   */
  it('acepta tiraje infinito sin cantidad', () => {
    expect(
      validatePricing(pricing({ printRunMode: 'INFINITE', printRun: '', creditsPrice: '40' })),
    ).toEqual({})
  })

  it('ignora la cantidad escrita antes de elegir infinito', () => {
    // La modalidad manda sobre lo que quedara en el campo: cambiar a infinito
    // no debe arrastrar un error de un valor que ya no se usa.
    expect(
      validatePricing(pricing({ printRunMode: 'INFINITE', printRun: '0', creditsPrice: '40' })),
    ).toEqual({})
  })

  it('acepta precio en creditos cero', () => {
    expect(validatePricing(pricing({ printRun: '1', creditsPrice: '0' }))).toEqual({})
  })

  /**
   * CA-02: los valores que la historia nombra se atrapan ANTES de gastar una
   * peticion. `-5` ya no puede escribirse -la modalidad se elige y el campo es
   * de cantidad-, pero se mantiene el caso: si alguien volviera a permitir el
   * signo, esta prueba lo diria.
   */
  it.each([
    ['-5', '-5'],
    ['cero', '0'],
    ['decimal', '1.5'],
    ['vacio', ''],
  ])('rechaza una cantidad de %s en tiraje limitado', (_caso, printRun) => {
    expect(validatePricing(pricing({ printRun, creditsPrice: '40' }))).toHaveProperty('printRun')
  })

  it('exige precio en moneda real cuando el producto es premium', () => {
    const errors = validatePricing(
      pricing({ printRun: '1', creditsPrice: '0', premium: true, realMoneyAmount: '' }),
    )

    expect(errors).toHaveProperty('realMoneyAmount')
  })

  /**
   * CONTROL de la anterior: sin la bandera premium ese mismo formulario vacio
   * es valido. Sin este caso, «exige el precio real» podria estar pasando
   * porque el campo se exige SIEMPRE, que romperia el alta no premium.
   */
  it('NO exige precio en moneda real cuando el producto no es premium', () => {
    expect(
      validatePricing(pricing({ printRun: '1', creditsPrice: '0', realMoneyAmount: '' })),
    ).toEqual({})
  })
})

describe('Paso 2: atributos por tipo', () => {
  it('un heroe exige exactamente tres habilidades', () => {
    const errors = validateAttributes(
      withBasics({
        type: 'HEROE',
        heroSubtype: 'GUERRERO',
        basePower: '10',
        baseHealth: '100',
        baseDefense: '5',
        abilities: ['3f1d2c4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f', '', ''],
      }),
    )

    expect(errors).toHaveProperty('abilities.1')
    expect(errors).toHaveProperty('abilities.2')
  })

  it('un subtipo de heroe en minusculas se rechaza', () => {
    const errors = validateAttributes(withBasics({ type: 'HEROE', heroSubtype: 'guerrero' }))

    expect(errors).toHaveProperty('heroSubtype')
  })

  /**
   * El dominio RECHAZA la lista de subtipos cuando el ambito es «todos los
   * heroes»: no la ignora. Sin esta comprobacion, un formulario que dejara el
   * campo relleno tras cambiar de ambito enviaria una contradiccion.
   */
  it('rechaza subtipos declarados junto a «todos los heroes»', () => {
    const errors = validateAttributes(
      withBasics({
        type: 'ARMA',
        compatibilityScope: 'ALL_HEROES',
        compatibleHeroSubtypes: 'GUERRERO',
        effects: [
          {
            ...emptyDraft().effects[0]!,
            magnitude: { ...emptyDraft().effects[0]!.magnitude, amount: '5' },
          },
        ],
      }),
    )

    expect(errors).toHaveProperty('compatibleHeroSubtypes')
  })

  // HU-30 (correccion post-incidente): ARMA/ARMADURA/ITEM exigen declarar su
  // probabilidad de caida desde que nacen; HEROE/HABILIDAD/EPICA no se tocan.
  describe('HU-30: probabilidad de caida', () => {
    const equipable = (
      type: 'ARMA' | 'ARMADURA' | 'ITEM',
      dropChancePercent: string,
    ): ProductDraft =>
      withBasics({
        type,
        armorSlot: 'CHEST',
        effects: [
          {
            ...emptyDraft().effects[0]!,
            magnitude: { ...emptyDraft().effects[0]!.magnitude, amount: '5' },
          },
        ],
        dropChancePercent,
      })

    it('WEB-05: un equipable sin probabilidad de caida no permite avanzar', () => {
      const errors = validateAttributes(equipable('ARMA', ''))

      expect(errors).toHaveProperty('dropChancePercent')
    })

    it('WEB-06: 0 % es un valor valido (decision explicita de que no cae)', () => {
      const errors = validateAttributes(equipable('ARMADURA', '0'))

      expect(errors).not.toHaveProperty('dropChancePercent')
    })

    it('100 % es valido (el maximo permitido)', () => {
      const errors = validateAttributes(equipable('ITEM', '100'))

      expect(errors).not.toHaveProperty('dropChancePercent')
    })

    it('rechaza un valor fuera de 0..100', () => {
      const errors = validateAttributes(equipable('ARMA', '101'))

      expect(errors).toHaveProperty('dropChancePercent')
    })

    it('un HEROE no exige probabilidad de caida', () => {
      const errors = validateAttributes(
        withBasics({
          type: 'HEROE',
          heroSubtype: 'GUERRERO',
          basePower: '3',
          baseHealth: '12',
          baseDefense: '4',
          baseAttack: { ...emptyDraft().baseAttack, mode: 'FIXED', amount: '3' },
          baseDamage: { ...emptyDraft().baseDamage, mode: 'DICE', diceCount: '2', diceSides: '6' },
          abilities: [
            '11111111-1111-4111-8111-111111111111',
            '22222222-2222-4222-8222-222222222222',
            '33333333-3333-4333-8333-333333333333',
          ],
        }),
      )

      expect(errors).not.toHaveProperty('dropChancePercent')
    })
  })

  it('una habilidad con coste fijo exige el poder consumido', () => {
    const errors = validateAttributes(
      withBasics({
        type: 'HABILIDAD',
        compatibleHeroSubtypes: 'GUERRERO',
        powerCostMode: 'FIXED',
        powerCost: '',
      }),
    )

    expect(errors).toHaveProperty('powerCost')
  })

  it('una habilidad que consume todo el poder NO pide cantidad', () => {
    const base = emptyDraft().effects[0]!
    const errors = validateAttributes(
      withBasics({
        type: 'HABILIDAD',
        compatibleHeroSubtypes: 'GUERRERO',
        powerCostMode: 'ALL_AVAILABLE',
        powerCost: '',
        effects: [{ ...base, magnitude: { ...base.magnitude, amount: '5' } }],
      }),
    )

    expect(errors).toEqual({})
  })

  it('reflejar daño solo admite magnitud en porcentaje', () => {
    const base = emptyDraft().effects[0]!
    const errors = validateAttributes(
      withBasics({
        type: 'ITEM',
        effects: [
          {
            ...base,
            kind: 'REFLECT_DAMAGE',
            magnitude: { ...base.magnitude, mode: 'FIXED', amount: '5' },
          },
        ],
      }),
    )

    expect(errors).toHaveProperty('effects.0.magnitude.mode')
  })
})
