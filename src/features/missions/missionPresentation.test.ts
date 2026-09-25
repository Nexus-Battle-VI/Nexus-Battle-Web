import { describe, expect, it } from 'vitest'

import { compositionTexts } from './difficultyPresentation'
import {
  heroTypeLabel,
  masterChanceLabel,
  masterStatusLabel,
  rewardKindLabel,
  sentence,
  skipReasonLabel,
  statLabel,
} from './missionPresentation'

describe('el vocabulario del dominio en palabras del jugador (P-J10)', () => {
  it('los tipos de héroe se leen sin guiones bajos, también los nuevos', () => {
    expect(heroTypeLabel('PICARO_VENENO')).toBe('Pícaro Veneno')
    expect(heroTypeLabel('CHAMAN')).toBe('Chamán')
    expect(heroTypeLabel('ARQUERO_ELFICO')).toBe('Arquero Elfico')
  })

  it('las estadísticas, los estados del Máster y los tipos de recompensa', () => {
    expect(statLabel('health')).toBe('Vida')
    expect(statLabel('otra')).toBe('otra')
    expect(masterStatusLabel('APPEARED_DEFEATED')).toBe('apareció y lo derrotaste')
    expect(masterStatusLabel('APPEARED_HERO_DEFEATED')).toBe('apareció y derrotó a tu héroe')
    expect(masterStatusLabel('ALGO_NUEVO')).toBe('apareció')
    expect(rewardKindLabel('EPIC')).toBe('Épica')
    expect(skipReasonLabel('UNSUPPORTED_EFFECT')).toBe('no funciona en misiones')
    expect(sentence('la habilidad no declara efectos.')).toBe('La habilidad no declara efectos.')
  })

  it('la probabilidad de un Máster dice cuánto sube para su tipo de héroe', () => {
    expect(masterChanceLabel({ '*': 0.05, GUERRERO_TANQUE: 0.15 })).toMatch(
      /^5\s?% de aparecer; 15\s?% si tu héroe es Guerrero Tanque$/u,
    )
    expect(masterChanceLabel({ '*': 0.15 })).toMatch(/^15\s?% de aparecer$/u)
  })
})

describe('lo que cambia cada dificultad (P-J8)', () => {
  const base = {
    unlocked: true,
    lockReason: null,
    enemyStatMultiplier: 2,
    rewardTier: 'PREMIUM',
  } as const

  it('más enemigos, jefe furioso y mejor botín, con las cifras de Missions', () => {
    expect(
      compositionTexts({
        ...base,
        difficulty: 'LEGENDARY',
        extraEnemiesPerEncounter: 1,
        bossEnrageBonus: 2,
        lootBonusPercent: 50,
      }),
    ).toEqual([
      '+1 enemigo en cada encuentro',
      'Jefe furioso: +2 de ataque',
      'Botín del jefe: +50 % de probabilidad',
    ])
    expect(
      compositionTexts({ ...base, difficulty: 'MYTHIC', extraEnemiesPerEncounter: 2 }),
    ).toEqual(['+2 enemigos en cada encuentro'])
  })

  it('Normal, o un Missions que no envía los campos, no añade nada', () => {
    expect(
      compositionTexts({
        ...base,
        difficulty: 'NORMAL',
        extraEnemiesPerEncounter: 0,
        bossEnrageBonus: 0,
        lootBonusPercent: 0,
      }),
    ).toEqual([])
    expect(compositionTexts({ ...base, difficulty: 'HEROIC' })).toEqual([])
  })
})
