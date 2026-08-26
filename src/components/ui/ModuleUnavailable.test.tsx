import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { ModuleUnavailable } from './ModuleUnavailable'

describe('ModuleUnavailable', () => {
  it('declara el modulo como no disponible sin simular su funcionamiento', () => {
    renderWithProviders(<ModuleUnavailable title="Torneo" />)

    expect(screen.getByRole('heading', { name: 'Torneo' })).toBeInTheDocument()
    expect(screen.getByText('Módulo no disponible.')).toBeInTheDocument()
    expect(screen.getByText(/todavía no está disponible en este incremento/u)).toBeInTheDocument()
  })
})
