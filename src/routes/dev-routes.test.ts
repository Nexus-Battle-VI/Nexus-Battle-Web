import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NAVIGATION } from './routes'
import { devRoutes } from './dev-routes'

describe('devRoutes', () => {
  it('declara unicamente los harnesses de heroes (EN-026.3) y productos (EN-026.4), fuera de NAVIGATION', () => {
    expect(devRoutes).toHaveLength(2)
    expect(devRoutes.map((route) => route.path)).toEqual([
      '__dev/visual-library/heroes',
      '__dev/visual-library/products',
    ])
    expect(NAVIGATION.some((item) => item.path.includes('__dev'))).toBe(false)
  })

  it('el harness perezoso de heroes resuelve y muestra los 8/8 heroes con nombre visible', async () => {
    const route = devRoutes[0]
    if (!route) {
      throw new Error('se esperaba que devRoutes declarara el harness de heroes en modo test (DEV)')
    }

    render(route.element)

    expect(
      await screen.findByText(/vista previa de héroes 3d \(8\/8\)/iu, {}, { timeout: 10000 }),
    ).toBeInTheDocument()

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

  it('el harness perezoso de productos resuelve y muestra los 72/72 productos agrupados por familia', async () => {
    const route = devRoutes[1]
    if (!route) {
      throw new Error(
        'se esperaba que devRoutes declarara el harness de productos en modo test (DEV)',
      )
    }

    render(route.element)

    expect(
      await screen.findByText(
        /recursos visuales de productos \(72\/72\)/iu,
        {},
        { timeout: 10000 },
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/armas \(16\/16\)/iu)).toBeInTheDocument()
    expect(screen.getByText(/armaduras \(16\/16\)/iu)).toBeInTheDocument()
    expect(screen.getByText(/ítems \(8\/8\)/iu)).toBeInTheDocument()
    expect(screen.getByText(/acciones \(24\/24\)/iu)).toBeInTheDocument()
    expect(screen.getByText(/épicas \(8\/8\)/iu)).toBeInTheDocument()

    expect(screen.getByRole('img', { name: 'Espada de una mano' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Reanimador 3000' })).toBeInTheDocument()
  })
})
