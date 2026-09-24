import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { HeroEquipment } from './api'
import { HeroStatsPanel } from './HeroStatsPanel'

const equipment = (overrides: Partial<HeroEquipment> = {}): HeroEquipment => ({
  hero: {
    heroId: 'hero-1',
    reference: 'guerrero-tanque',
    subtype: 'GUERRERO_TANQUE',
    name: 'Guerrero Tanque',
    imageUrl: 'https://assets.example.test/heroe.png',
  },
  equipment: { weapons: [], armor: {}, items: [] },
  baseStats: {
    power: 5,
    health: 40,
    defense: 8,
    attack: 10,
    damage: { mode: 'DICE', count: 1, sides: 4 },
    healing: null,
  },
  effectiveStats: {
    power: 5,
    health: 40,
    defense: 8,
    attack: 12,
    damage: { mode: 'DICE', count: 1, sides: 4 },
    healing: null,
  },
  deltas: [{ statistic: 'ATTACK', base: 10, effective: 12, delta: 2 }],
  activeEffects: [
    {
      sourceSlot: 'WEAPON_1',
      sourceProductId: 'pid-espada',
      sourceProductReference: 'espada',
      kind: 'STAT_MODIFIER',
      target: 'SELF',
      statistic: 'ATTACK',
      operation: 'INCREASE',
      magnitude: { mode: 'FIXED', amount: 2 },
      hasActivationCondition: false,
      appliedToStats: true,
    },
    {
      sourceSlot: 'WEAPON_2',
      sourceProductId: 'pid-daga',
      sourceProductReference: 'daga',
      kind: 'DAMAGE',
      target: 'OPPONENT',
      operation: 'INCREASE',
      magnitude: { mode: 'DICE', count: 1, sides: 4 },
      hasActivationCondition: false,
      appliedToStats: false,
    },
  ],
  ...overrides,
})

describe('HeroStatsPanel — daño comprensible sin inventar un resultado', () => {
  it('mantiene la magnitud tecnica (1d4) y la traduce: 1 dado de 4 caras, rango base 1–4', () => {
    render(<HeroStatsPanel equipment={equipment()} />)

    expect(screen.getByText('1d4')).toBeInTheDocument()
    expect(screen.getByText('1 dado de 4 caras · Rango base: 1–4 por golpe')).toBeInTheDocument()
    expect(screen.getByText(/El daño final se decide en combate/u)).toBeInTheDocument()
  })

  it('nunca presenta un "daño final" numerico en el inventario', () => {
    render(<HeroStatsPanel equipment={equipment()} />)

    expect(screen.queryByText(/daño final: \d/iu)).not.toBeInTheDocument()
  })

  it('los efectos se leen en palabras y conservan si ya estan en las estadisticas o se aplican en combate', () => {
    render(<HeroStatsPanel equipment={equipment()} />)

    expect(screen.getByText('+2 Ataque')).toBeInTheDocument()
    expect(screen.getByText('Daño +1d4 al rival')).toBeInTheDocument()
    expect(screen.getByText('aplicado a stats')).toBeInTheDocument()
    expect(screen.getByText('en combate')).toBeInTheDocument()
    expect(screen.queryByText(/STAT_MODIFIER|OPPONENT/u)).not.toBeInTheDocument()
  })

  it('un daño fijo se explica como base por golpe', () => {
    render(
      <HeroStatsPanel
        equipment={equipment({
          effectiveStats: {
            power: 5,
            health: 40,
            defense: 8,
            attack: 12,
            damage: { mode: 'FIXED', amount: 3 },
            healing: null,
          },
        })}
      />,
    )

    expect(screen.getByText('Base: 3 por golpe')).toBeInTheDocument()
  })
})
