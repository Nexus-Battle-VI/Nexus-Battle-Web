import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AuctionLiveIndicator } from './AuctionLiveIndicator'

describe('AuctionLiveIndicator', () => {
  it('open: dice "En vivo" con tono de exito', () => {
    render(<AuctionLiveIndicator status={{ connection: 'open' }} />)

    const indicator = screen.getByTestId('auction-live-indicator')
    expect(indicator).toHaveTextContent('En vivo')
    expect(indicator).toHaveAttribute('data-tone', 'success')
    expect(indicator).toHaveAttribute('role', 'status')
  })

  it('reconnecting: avisa que lo que se ve puede estar desactualizado, nunca "En vivo"', () => {
    render(<AuctionLiveIndicator status={{ connection: 'reconnecting' }} />)

    const indicator = screen.getByTestId('auction-live-indicator')
    expect(indicator).toHaveTextContent(/Reconectando.*desactualizado/u)
    expect(indicator).not.toHaveTextContent('En vivo')
    expect(indicator).toHaveAttribute('data-tone', 'warning')
  })

  it('failed: avisa que se refresca cada 30 s', () => {
    render(<AuctionLiveIndicator status={{ connection: 'failed' }} />)

    const indicator = screen.getByTestId('auction-live-indicator')
    expect(indicator).toHaveTextContent(/30 s/u)
    expect(indicator).toHaveAttribute('data-tone', 'danger')
  })

  it.each(['connecting', 'disabled'] as const)('%s: no muestra nada', (connection) => {
    const { container } = render(<AuctionLiveIndicator status={{ connection }} />)

    expect(container).toBeEmptyDOMElement()
  })
})
