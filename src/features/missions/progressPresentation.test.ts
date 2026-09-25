import { describe, expect, it } from 'vitest'

import type { ProgressEntry } from './missionPlayApi'
import { progressLine } from './progressPresentation'

const entry = (fields: Partial<ProgressEntry> & Pick<ProgressEntry, 'kind'>): ProgressEntry => ({
  seq: 1,
  turn: 0,
  ...fields,
})

describe('la bitácora en palabras del jugador (P-J6)', () => {
  it('cuenta los encuentros y distingue al jefe final', () => {
    expect(progressLine(entry({ kind: 'ENCOUNTER_STARTED', encounter: 2 }))).toEqual({
      text: 'Comienza el encuentro 2.',
      tone: 'info',
    })
    expect(progressLine(entry({ kind: 'ENCOUNTER_STARTED', encounter: 5, boss: true }))).toEqual({
      text: 'Encuentro 5: ¡el jefe final!',
      tone: 'bad',
    })
  })

  it('un Máster se anuncia distinto de un enemigo', () => {
    expect(
      progressLine(entry({ kind: 'ENEMY_APPEARED', enemy: 'Sombras', role: 'ENEMY' }))?.text,
    ).toBe('Aparece Sombras.')
    expect(
      progressLine(entry({ kind: 'ENEMY_APPEARED', enemy: 'Sombra del Olvido', role: 'MASTER' })),
    ).toEqual({ text: '¡Aparece un Máster: Sombra del Olvido!', tone: 'bad' })
  })

  it('las acciones del héroe dicen qué usó, a quién y cuánto daño hizo', () => {
    expect(
      progressLine(
        entry({ kind: 'HERO_ACTION', enemy: 'Sombras', ability: null, hit: true, damage: 3 }),
      )?.text,
    ).toBe('Tu héroe ataca a Sombras: 3 de daño.')
    expect(
      progressLine(
        entry({
          kind: 'HERO_ACTION',
          enemy: 'Guardián',
          ability: 'Golpe de tormenta',
          hit: true,
          damage: 7,
          critical: true,
        }),
      )?.text,
    ).toBe('Tu héroe usa Golpe de tormenta contra Guardián: 7 de daño. ¡Golpe crítico!')
    expect(
      progressLine(entry({ kind: 'HERO_ACTION', enemy: 'Sombras', ability: null, hit: false }))
        ?.text,
    ).toBe('Tu héroe ataca a Sombras y falla.')
  })

  it('los efectos de una habilidad sin ataque se leen en palabras (P-J4)', () => {
    expect(
      progressLine(
        entry({
          kind: 'HERO_ACTION',
          ability: 'Grito de guerra',
          attacked: false,
          effects: [
            { kind: 'BUFF', statistic: 'DAMAGE', amount: 2, turns: 2 },
            { kind: 'HEAL', amount: 4, turns: 1 },
            { kind: 'REFLECT', basisPoints: 5000, turns: 1 },
            { kind: 'DESCONOCIDO' },
          ],
        }),
      )?.text,
    ).toBe(
      'Tu héroe usa Grito de guerra (+2 de daño durante 2 turnos, recupera 4 de vida, devuelve el 50 % del daño).',
    )
  })

  it('los golpes del enemigo dicen el daño, la furia y lo que se evitó', () => {
    expect(
      progressLine(
        entry({
          kind: 'ENEMY_ACTION',
          enemy: 'El Guardián Eterno',
          hit: true,
          damage: 2,
          enraged: true,
          prevented: 1,
        }),
      ),
    ).toEqual({
      text: 'El Guardián Eterno golpea: 2 de daño a tu héroe. Tu héroe evita 1. ¡Está furioso!',
      tone: 'enemy',
    })
    expect(progressLine(entry({ kind: 'ENEMY_ACTION', enemy: 'Sombras', hit: false }))?.text).toBe(
      'Sombras ataca y falla.',
    )
  })

  it('las bajas, el descanso y el final', () => {
    expect(progressLine(entry({ kind: 'DEFEATED', enemy: 'Sombras', role: 'ENEMY' }))?.text).toBe(
      'Sombras cae derrotado.',
    )
    expect(progressLine(entry({ kind: 'DEFEATED', enemy: 'Garra', role: 'BOSS' }))?.text).toBe(
      '¡Derrotaste a Garra!',
    )
    expect(progressLine(entry({ kind: 'HERO_RECOVERED', heroHealth: 30 }))?.text).toBe(
      'Tu héroe descansa y queda con 30 de vida.',
    )
    expect(progressLine(entry({ kind: 'MISSION_FINISHED', victory: true }))).toEqual({
      text: '¡Misión cumplida!',
      tone: 'good',
    })
    expect(progressLine(entry({ kind: 'MISSION_FINISHED', victory: false }))?.tone).toBe('bad')
  })
})
