import { describe, expect, it } from 'vitest'

import { emptyDraft, type ProductDraft } from './draft'
import { validateAttributes, validateBasics, validatePricing } from './validation'

const withBasics = (patch: Partial<ProductDraft> = {}): ProductDraft => ({
  ...emptyDraft(),
  name: 'Espada de Fuego',
  description: 'Espada de dos manos con daño de fuego.',
  imageUrl: 'https://assets.example.test/catalog/espada.webp',
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

  /**
   * Catalog exige una URL ABSOLUTA. Una ruta relativa se veria bien en el
   * formulario y el servicio la rechazaria con 422 despues de recorrer los
   * cuatro pasos.
   */
  it('rechaza una imagen que no es una URL absoluta', () => {
    expect(validateBasics(withBasics({ imageUrl: '/imagenes/espada.webp' }))).toHaveProperty(
      'imageUrl',
    )
  })
})

describe('Paso 3: tiraje y precio', () => {
  const pricing = (patch: Partial<ProductDraft>): ProductDraft => withBasics(patch)

  it('acepta un tiraje limitado', () => {
    expect(validatePricing(pricing({ printRun: '150', creditsPrice: '40' }))).toEqual({})
  })

  it('acepta -1 como tiraje infinito', () => {
    expect(validatePricing(pricing({ printRun: '-1', creditsPrice: '40' }))).toEqual({})
  })

  it('acepta precio en creditos cero', () => {
    expect(validatePricing(pricing({ printRun: '1', creditsPrice: '0' }))).toEqual({})
  })

  /**
   * CA-02 de HU-33: un tiraje de -5 debe rechazarse. Es el caso que la historia
   * nombra explicitamente, y aqui se atrapa ANTES de gastar una peticion.
   */
  it.each([
    ['-5', '-5'],
    ['cero', '0'],
    ['decimal', '1.5'],
  ])('rechaza un tiraje de %s', (_caso, printRun) => {
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
