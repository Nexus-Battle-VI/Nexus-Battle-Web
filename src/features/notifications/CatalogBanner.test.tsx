import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { CatalogBanner } from './CatalogBanner'

afterEach(() => {
  vi.unstubAllGlobals()
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const banner = (overrides: Record<string, unknown> = {}) => ({
  id: 'b1',
  title: 'Aviso',
  content: 'Contenido del aviso.',
  publishAt: '2026-09-06T00:00:00.000Z',
  expiresAt: '2026-09-10T00:00:00.000Z',
  ...overrides,
})

describe('CatalogBanner (HU-38, Task #185)', () => {
  it('sin banners vigentes no renderiza nada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [] })))

    const { container } = renderWithProviders(<CatalogBanner />)

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })

  it('con un solo banner muestra titulo y contenido sin controles de navegacion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [banner()] })))

    renderWithProviders(<CatalogBanner />)

    expect(await screen.findByRole('heading', { name: 'Aviso' })).toBeInTheDocument()
    expect(screen.getByText('Contenido del aviso.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Banner siguiente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Banner anterior' })).not.toBeInTheDocument()
  })

  it('con multiples banners permite navegar manualmente, con wrap circular, sin autoplay', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            banner({ id: 'b1', title: 'Primero' }),
            banner({ id: 'b2', title: 'Segundo' }),
            banner({ id: 'b3', title: 'Tercero' }),
          ],
        }),
      ),
    )

    const user = userEvent.setup()
    renderWithProviders(<CatalogBanner />)

    expect(await screen.findByRole('heading', { name: 'Primero' })).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Banner siguiente' }))
    expect(screen.getByRole('heading', { name: 'Segundo' })).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Banner anterior' }))
    expect(screen.getByRole('heading', { name: 'Primero' })).toBeInTheDocument()

    // Wrap circular: anterior desde el primero lleva al ultimo.
    await user.click(screen.getByRole('button', { name: 'Banner anterior' }))
    expect(screen.getByRole('heading', { name: 'Tercero' })).toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()

    // Wrap circular: siguiente desde el ultimo vuelve al primero.
    await user.click(screen.getByRole('button', { name: 'Banner siguiente' }))
    expect(screen.getByRole('heading', { name: 'Primero' })).toBeInTheDocument()
  })

  it('no filtra por fecha en el frontend: presenta exactamente lo que devuelve el backend', async () => {
    const vencido = banner({
      id: 'b-vencido',
      title: 'Deberia estar filtrado por backend, no por Web',
      publishAt: '2000-01-01T00:00:00.000Z',
      expiresAt: '2000-01-02T00:00:00.000Z',
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [vencido] })))

    renderWithProviders(<CatalogBanner />)

    // Web confia en el backend: si el backend lo devuelve, Web lo presenta.
    expect(
      await screen.findByRole('heading', {
        name: 'Deberia estar filtrado por backend, no por Web',
      }),
    ).toBeInTheDocument()
  })

  it('un fallo al consultar banners muestra un error discreto', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Error' }, 500)))

    renderWithProviders(<CatalogBanner />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el aviso')
  })
})
