import { describe, expect, it } from 'vitest'

import {
  chestProgressFraction,
  chestProgressText,
  describeDelivery,
  weeklyLimitReached,
  weeklyLimitText,
} from './rewardPresentation'
import type { RewardProduct } from './api'

/**
 * Textos y numeros del panel de recompensa (HU-22). Modulo PURO: recibe
 * `progress`/`threshold`/`count`/`limit`/`delivery`/`reward` ya resueltos por
 * Wallet/Combat y solo decide como contarlos.
 */
const PRODUCT: RewardProduct = {
  productId: 'p-armadura-1',
  sku: 'ARM-001',
  name: 'Armadura de Escamas',
}

describe('chestProgressFraction — barra de progreso (HU-22)', () => {
  it('devuelve la fraccion exacta dentro de rango', () => {
    expect(chestProgressFraction(10, 20)).toBe(0.5)
    expect(chestProgressFraction(0, 20)).toBe(0)
  })

  it('nunca supera 1 aunque el progreso cruce el umbral', () => {
    expect(chestProgressFraction(25, 20)).toBe(1)
  })

  it('nunca baja de 0 con un progreso negativo', () => {
    expect(chestProgressFraction(-5, 20)).toBe(0)
  })

  it('un umbral 0 o negativo no divide: devuelve 0', () => {
    expect(chestProgressFraction(10, 0)).toBe(0)
    expect(chestProgressFraction(10, -1)).toBe(0)
  })
})

describe('chestProgressText / weeklyLimitText — "x / y" tal cual llega', () => {
  it('compone el texto del progreso de cofre', () => {
    expect(chestProgressText(10, 20)).toBe('10 / 20')
  })

  it('compone el texto del limite semanal', () => {
    expect(weeklyLimitText(1, 2)).toBe('1 / 2')
  })
})

describe('weeklyLimitReached', () => {
  it('alcanzado cuando el conteo llega o supera el limite', () => {
    expect(weeklyLimitReached(2, 2)).toBe(true)
    expect(weeklyLimitReached(3, 2)).toBe(true)
  })

  it('no alcanzado por debajo del limite', () => {
    expect(weeklyLimitReached(1, 2)).toBe(false)
  })
})

describe('describeDelivery — estado de entrega (HU-22 S9)', () => {
  it('NONE no muestra ninguna tarjeta: no hay cofre que anunciar', () => {
    expect(describeDelivery('NONE', null, null)).toBeNull()
  })

  it('PENDING nunca dice "entregado": sigue seleccionando o completando', () => {
    const withoutProduct = describeDelivery('PENDING', null, 20)
    const withProduct = describeDelivery('PENDING', PRODUCT, 20)

    expect(withoutProduct?.headline).toBe('Cofre obtenido')
    expect(withoutProduct?.detail).toMatch(/Seleccionando/u)
    expect(withProduct?.detail).toContain('Armadura de Escamas')
    expect(withoutProduct?.detail).not.toMatch(/añadida a tu inventario/u)
    expect(withProduct?.detail).not.toMatch(/añadida a tu inventario/u)
  })

  it('CONFIRMED con producto anuncia la entrega real', () => {
    const delivery = describeDelivery('CONFIRMED', PRODUCT, 20)

    expect(delivery?.headline).toBe('Cofre obtenido')
    expect(delivery?.detail).toBe('Armadura de Escamas añadida a tu inventario ✓')
  })

  it('el texto nunca inventa un nombre de producto que no llego del servidor', () => {
    const delivery = describeDelivery('CONFIRMED', null, 20)

    expect(delivery?.detail).toBeNull()
  })
})

describe('describeDelivery — FAILED (HU-22, corregido en revision): terminal, nunca sondea para siempre', () => {
  it('con saldo desconocido (el credito nunca se confirmo) no dice que ya se acredito', () => {
    const delivery = describeDelivery('FAILED', null, null)

    expect(delivery?.headline).not.toMatch(/Cofre obtenido/u)
    expect(delivery?.detail).not.toMatch(/ya se acreditaron/u)
  })

  it('con saldo conocido (el credito si se confirmo, solo fallo la entrega) lo dice tal cual', () => {
    const delivery = describeDelivery('FAILED', null, 20)

    expect(delivery?.detail).toMatch(/ya se acreditaron/u)
    expect(delivery?.detail).toMatch(/no pudimos completar la entrega/u)
  })

  it('nunca dice "entregado" ni "añadida a tu inventario"', () => {
    const conProducto = describeDelivery('FAILED', PRODUCT, 20)
    const sinProducto = describeDelivery('FAILED', null, null)

    expect(conProducto?.detail).not.toMatch(/añadida a tu inventario/u)
    expect(sinProducto?.detail).not.toMatch(/añadida a tu inventario/u)
  })
})
