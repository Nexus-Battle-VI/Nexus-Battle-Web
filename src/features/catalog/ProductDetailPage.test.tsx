import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import * as productReviewsApi from '@/features/product-reviews/api'
import { ProductDetailPage } from './ProductDetailPage'
import * as api from './api'

const PRODUCT_ID = '3f2a1e4c-6b7d-4a8e-9c1f-2d3e4f5a6b7c'

const producto = (patch: Partial<api.CanonicalProduct> = {}): api.CanonicalProduct => ({
  productId: PRODUCT_ID,
  sku: 'espada-de-fuego',
  name: 'Espada de Fuego',
  description: 'Espada con efecto de fuego.',
  imageUrl: 'https://assets.example.test/espada.png',
  type: 'ARMA',
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 500,
  premium: false,
  realMoneyPrice: null,
  averageRating: null,
  reviewCount: 0,
  ...patch,
})

const montar = (): void => {
  renderWithProviders(
    <Routes>
      <Route path="/catalog/:productId" element={<ProductDetailPage />} />
    </Routes>,
    { route: `/catalog/${PRODUCT_ID}` },
  )
}

describe('ProductDetailPage (HU-40)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // La lista de comentarios (HU-40 + HU-46) es una consulta aparte de la
    // ficha del producto: sin este doble, cada prueba de aqui haria una
    // peticion real no controlada.
    vi.spyOn(productReviewsApi, 'fetchProductComments').mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    })
  })

  it('muestra el producto canónico y el bloque de comentarios y calificación', async () => {
    vi.spyOn(api, 'fetchCanonicalProduct').mockResolvedValue(producto())

    montar()

    expect(await screen.findByRole('heading', { name: 'Espada de Fuego' })).toBeInTheDocument()
    expect(screen.getByText('Sin calificaciones todavía')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Comentarios y calificación' })).toBeInTheDocument()
  })

  it('muestra el promedio y el conteo tal como los entrega el backend, sin recalcularlos', async () => {
    vi.spyOn(api, 'fetchCanonicalProduct').mockResolvedValue(
      producto({ averageRating: 4.5, reviewCount: 2 }),
    )

    montar()

    expect(await screen.findByText('4.5 (2 calificaciones)')).toBeInTheDocument()
  })

  it('muestra el estado de carga antes de que responda el servicio', () => {
    vi.spyOn(api, 'fetchCanonicalProduct').mockReturnValue(new Promise(() => undefined))

    montar()

    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
  })

  it('HU-46: un comentario existente ofrece la accion de reportarlo, y el formulario de HU-40 sigue disponible', async () => {
    vi.spyOn(api, 'fetchCanonicalProduct').mockResolvedValue(producto())
    vi.spyOn(productReviewsApi, 'fetchProductComments').mockResolvedValue({
      items: [
        {
          id: 'comment-1',
          productId: PRODUCT_ID,
          authorId: 'acc-1',
          content: 'Muy buen producto.',
          images: [],
          createdAt: '2026-09-03T10:00:00.000Z',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    })

    montar()

    expect(await screen.findByText('Muy buen producto.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reportar' })).toBeInTheDocument()
    // HU-40 no se rompe por introducir HU-46: el formulario sigue ahi.
    expect(screen.getByRole('textbox', { name: 'Comentario' })).toBeInTheDocument()
  })

  it('un producto inexistente muestra el error, no una pantalla en blanco', async () => {
    const { HttpError } = await import('@/lib/http')
    vi.spyOn(api, 'fetchCanonicalProduct').mockRejectedValue(
      new HttpError(404, 'El producto no existe', null),
    )

    montar()

    expect(await screen.findByRole('alert')).toHaveTextContent('El producto no existe')
  })
})
