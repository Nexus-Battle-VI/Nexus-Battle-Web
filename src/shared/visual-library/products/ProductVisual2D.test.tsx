import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProductVisual2D } from './ProductVisual2D'

describe('ProductVisual2D', () => {
  it('identifica el contenedor con el nombre oficial de un producto conocido, de forma accesible', () => {
    render(
      <ProductVisual2D resourceId="guerrero-tanque--arma--espada-de-una-mano" category="weapon" />,
    )

    expect(screen.getByRole('img', { name: 'Espada de una mano' })).toBeInTheDocument()
    expect(screen.getByText('Espada de una mano')).toBeInTheDocument()
  })

  it('renderiza el glifo SVG como decorativo (aria-hidden) para no duplicar el nombre accesible', () => {
    render(<ProductVisual2D resourceId="medico--epica--reanimador-3000" category="epic" />)

    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('resuelve un id desconocido a un fallback seguro, sin lanzar, y lo comunica', () => {
    render(<ProductVisual2D resourceId="producto-inexistente" category="item" />)

    expect(screen.getByRole('img', { name: 'producto-inexistente' })).toBeInTheDocument()
    expect(
      screen.getByText(/vista previa no disponible para "producto-inexistente"/iu),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).toBeNull()
  })

  it('resuelve un id existente bajo una categoria incorrecta al mismo fallback seguro', () => {
    render(
      <ProductVisual2D resourceId="guerrero-tanque--arma--espada-de-una-mano" category="item" />,
    )

    expect(document.querySelector('svg')).toBeNull()
  })

  it('se puede consumir dos veces (dos "pantallas" distintas) para el mismo producto sin lanzar', () => {
    render(
      <>
        <ProductVisual2D resourceId="chaman--item--pluma-sanadora" category="item" />
        <ProductVisual2D resourceId="chaman--item--pluma-sanadora" category="item" />
      </>,
    )

    expect(screen.getAllByRole('img', { name: 'Pluma sanadora' })).toHaveLength(2)
  })
})
