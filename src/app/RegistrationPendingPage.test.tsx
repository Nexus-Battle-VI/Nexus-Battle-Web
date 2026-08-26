import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { RegistrationPendingPage } from './RegistrationPendingPage'

describe('RegistrationPendingPage', () => {
  it('declara que el registro (HU-01) aun no esta integrado en esta rama', () => {
    renderWithProviders(<RegistrationPendingPage />)

    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument()
    expect(screen.getByText(/HU-01/u)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    )
  })
})
