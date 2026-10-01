import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { jsonResponse } from '@/test/commerce-fixtures'
import { renderWithProviders } from '@/test/render'
import { MarketplacePreviewPage } from './MarketplacePreviewPage'
import { MARKETPLACE_PREVIEW_PRODUCTS } from './marketplacePreviewFixtures'

/*
 * 9a pasada (STEP 7/13-I): Richard tenia que buscar entre las tarjetas o
 * hacer scroll para encontrar "Coraza del Centinela Dorado" (el fixture con
 * atributos ricos de la pasada anterior). Este test fija el atajo DEV de un
 * clic que abre el MISMO `ProductDetail` real con esa misma referencia -el
 * mismo mecanismo que usa `onOpenDetail` al pulsar una tarjeta real, nunca un
 * componente de detalle paralelo-.
 *
 * `ProductDetail` precarga la cache de TanStack Query (ver `useEffect` de
 * `MarketplacePreviewPage.tsx`), pero su propio `useQuery` igual dispara una
 * peticion de fondo (comportamiento normal de React Query, sin
 * `staleTime: Infinity`): se intercepta `fetch` con la misma fixture, igual
 * que hacen `Showcase.test.tsx`/`api.test.ts` para este mismo endpoint, en
 * vez de depender de que la cache baste por si sola.
 */
const RICH_PRODUCT = MARKETPLACE_PREVIEW_PRODUCTS.find(
  (product) => product.sku === 'preview-armadura-rica',
)!

describe('MarketplacePreviewPage — atajo DEV al detalle con atributos ricos', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('un clic en "Abrir detalle con atributos" abre el detalle real de la Coraza del Centinela Dorado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(RICH_PRODUCT))),
    )
    const user = userEvent.setup()
    renderWithProviders(<MarketplacePreviewPage />)

    await user.click(screen.getByRole('button', { name: 'Abrir detalle con atributos' }))

    const dialog = await screen.findByRole('dialog')
    const detail = within(dialog)
    expect(await detail.findByText('Coraza del Centinela Dorado')).toBeInTheDocument()
    // Confirma que de verdad trae atributos reales, no un detalle vacio.
    expect(await detail.findByText('Parte de armadura')).toBeInTheDocument()
    expect(detail.getByText('Compatibilidad')).toBeInTheDocument()
  })
})
