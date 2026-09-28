import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { HeroProgression } from '../heroSelectionApi'
import { HeroProgressionBar } from './HeroProgressionBar'

const progression = (overrides: Partial<HeroProgression> = {}): HeroProgression => ({
  level: 1,
  currentXp: 0,
  floorForCurrentLevel: 0,
  nextLevel: { status: 'AVAILABLE', forNextLevel: 2, amount: 200 },
  maxLevel: 8,
  ...overrides,
})

describe('HeroProgressionBar', () => {
  it('muestra el nivel y la experiencia acumulada REALES, tal como los publica el backend', () => {
    render(
      <HeroProgressionBar
        progression={progression({ level: 2, currentXp: 315, floorForCurrentLevel: 200 })}
      />,
    )

    expect(screen.getByText('Nivel 2')).toBeInTheDocument()
    expect(screen.getByText('315 XP acumulada')).toBeInTheDocument()
  })

  it('la barra usa los valores recibidos, sin tabla de umbrales en el cliente', () => {
    render(
      <HeroProgressionBar
        progression={progression({
          level: 2,
          currentXp: 315,
          floorForCurrentLevel: 200,
          nextLevel: { status: 'AVAILABLE', forNextLevel: 3, amount: 400 },
        })}
      />,
    )

    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar).toHaveAttribute('aria-valuenow', '58')
    // El texto visible no depende solo del color/ancho de la barra.
    expect(screen.getByText('115 / 200 XP hacia nivel 3')).toBeInTheDocument()
  })

  it('en nivel máximo lo indica claramente y no inventa un nivel 9', () => {
    render(
      <HeroProgressionBar
        progression={progression({
          level: 8,
          currentXp: 13500,
          floorForCurrentLevel: 12800,
          nextLevel: { status: 'MAX_LEVEL', currentLevel: 8, forNextLevel: null, amount: null },
        })}
      />,
    )

    expect(screen.getByText('Nivel 8')).toBeInTheDocument()
    expect(screen.getByText('Nivel máximo')).toBeInTheDocument()
    expect(screen.queryByText(/nivel 9/iu)).toBeNull()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('13.500 XP acumulada')).toBeInTheDocument()
  })
})
