import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { CatalogPage } from './CatalogPage'

const product = (sku: string, category: string, amount: number) => ({
  sku,
  name: sku.replace(/-/gu, ' '),
  category,
  price: { amount, currency: 'COP' },
  status: 'PUBLISHED',
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

describe('CatalogPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra el estado de carga y despues los productos', async () => {
    fetchMock.mockResolvedValue(jsonResponse([product('espada-de-hierro', 'armas', 1_500_000)]))

    renderWithProviders(<CatalogPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando...')

    expect(await screen.findByText('espada de hierro')).toBeInTheDocument()
    expect(screen.getByText(/espada-de-hierro · armas/u)).toBeInTheDocument()
    expect(screen.getByText('Publicado')).toBeInTheDocument()
  })

  it('formatea el importe convirtiendo la unidad minima', async () => {
    fetchMock.mockResolvedValue(jsonResponse([product('pocion', 'consumibles', 200_000)]))

    renderWithProviders(<CatalogPage />)

    expect(await screen.findByText(/2\.000,00/u)).toBeInTheDocument()
  })

  it('distingue el estado vacio de un error', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))

    renderWithProviders(<CatalogPage />)

    expect(
      await screen.findByText('No hay productos publicados para ese filtro.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra el mensaje del servicio cuando la consulta falla', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'La categoria debe estar en kebab-case.' }, 400),
    )

    renderWithProviders(<CatalogPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('La categoria debe estar en kebab-case.')
  })

  it('filtra por categoria normalizando el valor escrito', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(jsonResponse([]))

    renderWithProviders(<CatalogPage />)
    await screen.findByText('No hay productos publicados para ese filtro.')

    await user.type(screen.getByLabelText('Filtrar por categoria'), '  ARMAS ')

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledWith('/api/products?category=armas', expect.anything())
      },
      { timeout: 2_000 },
    )
  })

  it('no lanza una consulta por cada pulsacion', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(jsonResponse([]))

    renderWithProviders(<CatalogPage />)
    await screen.findByText('No hay productos publicados para ese filtro.')

    const callsAfterFirstLoad = fetchMock.mock.calls.length
    await user.type(screen.getByLabelText('Filtrar por categoria'), 'armas')

    // Cinco pulsaciones no deben producir cinco peticiones: el valor se
    // propaga con retraso y solo el ultimo sobrevive.
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirstLoad)
  })
})
