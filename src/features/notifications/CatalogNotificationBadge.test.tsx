import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CatalogNotificationBadge } from './CatalogNotificationBadge'

describe('CatalogNotificationBadge', () => {
  it('mantiene las etiquetas y tonos ya existentes de catalogo (no-regresion)', () => {
    render(<CatalogNotificationBadge changeType="PRODUCT_CREATED" />)
    expect(screen.getByText('Nuevo')).toHaveClass('bg-success/15', 'text-success')

    render(<CatalogNotificationBadge changeType="AUCTION_CLOSING_SOON" />)
    expect(screen.getByText('Cierre próximo')).toHaveClass('bg-warning/15', 'text-warning')
  })

  /**
   * Estos siete tipos ya llegan de Notifications (HU-63.5, HU-64.5, HU-65,
   * HU-67) pero antes de este caso no tenian etiqueta ni tono propios: se
   * mostraban con el codigo crudo (p.ej. "AUCTION_BID_OUTBID") en vez de un
   * texto legible.
   */
  it.each([
    ['AUCTION_BID_OUTBID', 'Puja superada'],
    ['AUCTION_CLOSED_BY_BUY_NOW', 'Compra inmediata'],
    ['AUCTION_AUTO_BID_LIMIT_REACHED', 'Límite de puja alcanzado'],
    ['AUCTION_SETTLED_SELLER', 'Subasta vendida'],
    ['AUCTION_SETTLED_WINNER', 'Ganaste la subasta'],
    ['AUCTION_SETTLED_LOSER', 'Subasta finalizada'],
    ['AUCTION_SETTLED_WITHOUT_BIDS', 'Subasta sin pujas'],
  ])('traduce %s a un texto legible, no el codigo crudo', (changeType, label) => {
    render(<CatalogNotificationBadge changeType={changeType} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.queryByText(changeType)).not.toBeInTheDocument()
  })

  it('un changeType desconocido cae al tono neutro y muestra el codigo crudo', () => {
    render(<CatalogNotificationBadge changeType="ALGO_NUEVO" />)
    expect(screen.getByText('ALGO_NUEVO')).toHaveClass('bg-border', 'text-muted')
  })
})
