import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { NexusBrandHeader } from './NexusBrandHeader'

describe('NexusBrandHeader', () => {
  it('renderiza el logotipo real como imagen, con texto alternativo descriptivo', () => {
    renderWithProviders(<NexusBrandHeader />)

    const logo = screen.getByRole('img', {
      name: 'The Nexus Battles VI — Return of the Warriors',
    })

    expect(logo).toHaveAttribute('src', '/assets/logo.png')
  })

  it('cae de vuelta al lockup textual si el archivo de imagen falla', () => {
    renderWithProviders(<NexusBrandHeader />)

    fireEvent.error(screen.getByRole('img'))

    expect(screen.getByText('The Nexus Battles VI')).toBeInTheDocument()
    expect(screen.getByText('Return of the Warriors')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
