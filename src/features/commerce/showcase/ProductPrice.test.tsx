import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { showcaseProduct } from '@/test/commerce-fixtures'
import { ProductPrice } from './ProductPrice'

/**
 * Los creditos se formatean con el formateador i18n-aware del resto de la
 * app (`@/app/creditsFormat`), no con un `toLocaleString('es-CO')` fijo: asi
 * cambia con el idioma activo igual que el resto de cifras, en vez de quedar
 * la unica excepcion codificada a mano.
 */
describe('Precio del producto', () => {
  it('formatea los creditos con separador de miles', () => {
    renderWithProviders(<ProductPrice product={showcaseProduct({ creditsPrice: 1_234_567 })} />)

    expect(screen.getByText('1.234.567 créditos')).toBeInTheDocument()
  })

  it('muestra el precio en dinero real cuando existe', () => {
    renderWithProviders(
      <ProductPrice
        product={showcaseProduct({ realMoneyPrice: { amount: 15_000, currency: 'COP' } })}
      />,
    )

    expect(screen.getByText(/COP/u)).toBeInTheDocument()
  })

  it('no muestra precio en dinero real cuando es null', () => {
    renderWithProviders(<ProductPrice product={showcaseProduct({ realMoneyPrice: null })} />)

    expect(screen.queryByText(/COP|USD|EUR/u)).not.toBeInTheDocument()
  })
})
