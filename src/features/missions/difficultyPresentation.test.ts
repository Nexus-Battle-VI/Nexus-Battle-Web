import { describe, expect, it } from 'vitest'

import { difficultyName, enemyScalingText, rewardTierText } from './difficultyPresentation'

describe('presentacion de la dificultad (HU-75.3)', () => {
  it.each([
    ['NORMAL', 'Normal'],
    ['HEROIC', 'Heroico'],
    ['LEGENDARY', 'Legendario'],
    ['MYTHIC', 'Mítico'],
  ] as const)('%s se muestra como %s', (level, name) => {
    expect(difficultyName(level)).toBe(name)
  })

  it.each([
    [1, 'Enemigos con sus estadísticas base'],
    [1.5, 'Enemigos con 50 % más estadísticas'],
    [2, 'Enemigos con 100 % más estadísticas'],
  ] as const)('el factor %s que envia Missions se lee como "%s"', (factor, text) => {
    expect(enemyScalingText(factor)).toBe(text)
  })

  // Control: si Missions no publica factor (Mitico), la interfaz no inventa un
  // porcentaje; muestra lo unico que dice la HU de ese nivel.
  it('sin factor publicado no inventa un porcentaje', () => {
    expect(enemyScalingText(null)).toBe('Dificultad máxima')
    expect(enemyScalingText(null)).not.toContain('%')
  })

  it.each([
    ['STANDARD', 'Recompensas estándar'],
    ['IMPROVED', 'Mejores recompensas'],
    ['PREMIUM', 'Recompensas premium'],
    ['EXCLUSIVE', 'Recompensas únicas y exclusivas'],
  ] as const)('el nivel de recompensa %s se lee como "%s"', (tier, text) => {
    expect(rewardTierText(tier)).toBe(text)
  })
})
