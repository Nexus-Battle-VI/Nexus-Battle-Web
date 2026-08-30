import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { LandingPage } from './LandingPage'
import { NAVIGATION } from '@/routes/routes'

describe('LandingPage', () => {
  it('presenta la identidad del producto y las dos acciones principales', () => {
    renderWithProviders(<LandingPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bienvenido al universo Nexus' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register')
  })

  it('muestra el logotipo real del producto, no un lockup de texto', () => {
    renderWithProviders(<LandingPage />)

    expect(
      screen.getByRole('img', { name: 'The Nexus Battles VI — Return of the Warriors' }),
    ).toBeInTheDocument()
  })

  it('no incluye ningun formulario de credenciales', () => {
    renderWithProviders(<LandingPage />)

    expect(screen.queryByLabelText(/contraseña/iu)).not.toBeInTheDocument()
  })

  /**
   * Los accesos reutilizan `NAVIGATION`: la misma lista que ve quien ya
   * inicio sesion, no una copia mantenida a mano en esta pantalla.
   */
  it('ofrece la navegacion principal del producto, visible antes de iniciar sesion', () => {
    renderWithProviders(<LandingPage />)

    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()

    for (const item of NAVIGATION) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.path)
    }
  })
})
