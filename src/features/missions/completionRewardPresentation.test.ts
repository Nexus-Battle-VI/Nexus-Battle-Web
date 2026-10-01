import { describe, expect, it } from 'vitest'

import {
  completionCreditsAmountText,
  completionCurrentXpText,
  completionLevelText,
  completionLevelsGainedText,
  completionXpAmountText,
} from './completionRewardPresentation'
import type { MissionRewardProgression } from './api'

/**
 * Textos de la recompensa de finalización (HU-10.6, sobre la liquidación de
 * HU-10.5). Módulo PURO: nada aquí calcula un importe, un nivel o un progreso
 * -- solo elige palabras sobre lo que Missions ya resolvió.
 */
const PROGRESSION: MissionRewardProgression = {
  level: 3,
  currentXp: 315,
  maxLevel: 8,
  levelsGained: 1,
}

describe('completionXpAmountText — el signo solo aparece cuando ya se entregó', () => {
  it('CREDITED: "+{amount} XP"', () => {
    expect(completionXpAmountText({ quantity: 120, status: 'CREDITED' })).toBe('+120 XP')
  })

  it('PENDING: "{amount} XP", sin signo', () => {
    expect(completionXpAmountText({ quantity: 120, status: 'PENDING' })).toBe('120 XP')
  })

  it('FAILED: "{amount} XP", sin signo (no se finge una entrega)', () => {
    expect(completionXpAmountText({ quantity: 120, status: 'FAILED' })).toBe('120 XP')
  })
})

describe('completionCreditsAmountText — el monto siempre sale de reward.quantity', () => {
  it('plural: "{amount} créditos"', () => {
    expect(completionCreditsAmountText({ quantity: 50 })).toBe('50 créditos')
  })

  it('singular: "1 crédito"', () => {
    expect(completionCreditsAmountText({ quantity: 1 })).toBe('1 crédito')
  })
})

describe('completionLevelText — el nivel tal como lo publica Player/Inventory', () => {
  it('un nivel por debajo del tope', () => {
    expect(completionLevelText(PROGRESSION)).toBe('Nivel 3')
  })

  it('el nivel maximo se marca como tal', () => {
    expect(completionLevelText({ ...PROGRESSION, level: 8, maxLevel: 8 })).toBe('Nivel 8 · máximo')
  })
})

describe('completionCurrentXpText', () => {
  it('la XP acumulada, tal cual', () => {
    expect(completionCurrentXpText(PROGRESSION)).toBe('315 XP acumulada')
  })
})

describe('completionLevelsGainedText — null si no subio ninguno', () => {
  it('un nivel ganado', () => {
    expect(completionLevelsGainedText(PROGRESSION)).toBe('1 nivel ganado')
  })

  it('varios niveles ganados', () => {
    expect(completionLevelsGainedText({ ...PROGRESSION, levelsGained: 3 })).toBe(
      '3 niveles ganados',
    )
  })

  it('sin subida, no hay texto', () => {
    expect(completionLevelsGainedText({ ...PROGRESSION, levelsGained: 0 })).toBeNull()
  })
})
