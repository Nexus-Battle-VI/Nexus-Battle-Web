import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { httpClient } from '@/lib/http'
import { useSession } from '@/shared/session'
import { PendingClaimsBadge } from './PendingClaimsBadge'

beforeEach(() => {
  useSession.setState({
    subject: 'sujeto-ana',
    accessToken: 'token',
    expiresAt: Date.now() + 900_000,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('PendingClaimsBadge', () => {
  it('muestra el conteo de pendientes y enlaza a la pantalla de reclamo', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue([
      { auctionId: 'a1', claimStatus: 'PENDING' },
      { auctionId: 'a2', claimStatus: 'PENDING' },
      { auctionId: 'a3', claimStatus: 'CLAIMED' },
    ])

    renderWithProviders(<PendingClaimsBadge />)

    const link = await screen.findByRole('link', { name: 'Pendientes de recoger: 2' })
    expect(link).toHaveAttribute('href', '/auction/pending-claims')
    expect(link).toHaveTextContent('2')
  })

  it('se oculta cuando el conteo es 0', async () => {
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue([])

    renderWithProviders(<PendingClaimsBadge />)

    await waitFor(() => {
      expect(get).toHaveBeenCalled()
    })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('si la consulta falla, se oculta sin alertas', async () => {
    const get = vi.spyOn(httpClient, 'get').mockRejectedValue(new Error('down'))

    renderWithProviders(<PendingClaimsBadge />)

    await waitFor(() => {
      expect(get).toHaveBeenCalled()
    })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sin sesion no consulta ni pinta nada', () => {
    useSession.setState({ subject: null, accessToken: null, expiresAt: null })
    const get = vi.spyOn(httpClient, 'get')

    const { container } = renderWithProviders(<PendingClaimsBadge />)

    expect(container).toBeEmptyDOMElement()
    expect(get).not.toHaveBeenCalled()
  })
})
