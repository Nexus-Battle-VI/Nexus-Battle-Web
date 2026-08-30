import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { EcommercePage } from './EcommercePage'

describe('EcommercePage', () => {
  /**
   * HU-02 no implementa catalogo funcional: el estado vacio honesto es el
   * unico contenido esperado hasta que exista integracion real con productos.
   */
  it('declara honestamente que no hay productos, sin inventar catalogo', () => {
    renderWithProviders(<EcommercePage />)

    expect(screen.getByRole('heading', { name: 'E-commerce' })).toBeInTheDocument()
    expect(screen.getByText('No hay productos disponibles por el momento.')).toBeInTheDocument()
  })
})
