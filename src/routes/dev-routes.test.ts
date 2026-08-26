import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NAVIGATION } from './routes'
import { devRoutes } from './dev-routes'

describe('devRoutes', () => {
  it('declara unicamente el harness de heroes de EN-026.3, fuera de NAVIGATION', () => {
    expect(devRoutes).toHaveLength(1)
    expect(devRoutes[0]?.path).toBe('__dev/visual-library/heroes')
    expect(NAVIGATION.some((item) => item.path.includes('__dev'))).toBe(false)
  })

  it('el harness perezoso resuelve y muestra los 8/8 heroes con nombre visible', async () => {
    const route = devRoutes[0]
    if (!route) {
      throw new Error('se esperaba que devRoutes declarara el harness en modo test (DEV)')
    }

    render(route.element)

    expect(await screen.findByText(/vista previa de héroes 3d \(8\/8\)/iu)).toBeInTheDocument()

    const officialNames = [
      'Guerrero Tanque',
      'Guerrero Armas',
      'Mago Fuego',
      'Mago Hielo',
      'Pícaro Veneno',
      'Pícaro Machete',
      'Chamán',
      'Médico',
    ]
    for (const name of officialNames) {
      expect(screen.getByRole('img', { name })).toBeInTheDocument()
    }
  })
})
