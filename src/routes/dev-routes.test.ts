import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NAVIGATION } from './routes'
import { devRoutes, publicDevRoutes } from './dev-routes'

describe('devRoutes', () => {
  it('declara unicamente los harnesses de heroes (EN-026.3) y productos (EN-026.4), fuera de NAVIGATION', () => {
    expect(devRoutes).toHaveLength(2)
    expect(devRoutes.map((route) => route.path)).toEqual([
      '__dev/visual-library/heroes',
      '__dev/visual-library/products',
    ])
    expect(NAVIGATION.some((item) => item.path.includes('__dev'))).toBe(false)
  })

  it('la vista previa de "Mi cuenta" (HU-05.4) es una ruta publica de solo desarrollo, fuera de NAVIGATION', () => {
    // En modo test `import.meta.env.DEV` es verdadero: la ruta existe aqui.
    expect(publicDevRoutes.map((route) => route.path)).toEqual(['__dev/account'])
    expect(NAVIGATION.some((item) => item.path.includes('__dev/account'))).toBe(false)

    // La unica forma de que exista es la guarda `import.meta.env.DEV`: en una
    // compilacion de produccion (`DEV === false`) el arreglo queda vacio.
    expect(import.meta.env.DEV).toBe(true)
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
