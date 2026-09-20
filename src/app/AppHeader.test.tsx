import { afterEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { AppHeader } from './AppHeader'
import { useSession } from '@/shared/session'
import { initTheme, useTheme } from '@/shared/theme'
import { renderWithProviders } from '@/test/render'

/**
 * Desde HU-15.3, `SessionControl` consulta `useOwnAccount` (React Query) para
 * el avatar real: renderizar `AppHeader` exige un `QueryClientProvider`, igual
 * que cualquier otra pantalla que use consultas del servidor.
 */
const renderHeader = (route = '/ecommerce') => renderWithProviders(<AppHeader />, { route })

afterEach(() => {
  useSession.setState({
    subject: null,
    roles: [],
    authenticationAvailable: false,
  })
})

describe('AppHeader', () => {
  it('la marca tiene nombre accesible y enlaza a /ecommerce', () => {
    renderHeader()

    const brand = screen.getByRole('link', { name: 'Nexus Battles VI' })
    expect(brand).toHaveAttribute('href', '/ecommerce')
    expect(screen.getByRole('img', { name: 'Nexus Battles VI' })).toBeInTheDocument()
  })

  it('el logo conserva alt, dimensiones y fallback, y suma el halo de marca sin cambiarlos', () => {
    renderHeader()

    const logo = screen.getByRole('img', { name: 'Nexus Battles VI' })
    expect(logo).toHaveAttribute('src', '/assets/logo.png')
    expect(logo).toHaveAttribute('width', '1600')
    expect(logo).toHaveAttribute('height', '600')
    expect(logo).toHaveClass('nb-logo-glow')
  })

  it('incluye la navegacion principal y el conmutador de tema', () => {
    renderHeader()

    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Tema de la interfaz' })).toBeInTheDocument()
  })

  it('con sesion monta el control de cuenta', () => {
    useSession.setState({
      authenticationAvailable: true,
      subject: 'sujeto-ana',
      displayName: 'Ana',
      accessToken: 'token',
    })
    renderHeader()

    expect(screen.getByTestId('user-menu-trigger')).toBeInTheDocument()
  })

  it('sin sesion pero con proveedor configurado, invita a iniciar sesion o crear cuenta', () => {
    useSession.setState({ authenticationAvailable: true })
    renderHeader('/')

    expect(screen.getByTestId('sign-in')).toBeInTheDocument()
    expect(screen.getByTestId('sign-up')).toBeInTheDocument()
  })

  it('sin proveedor de identidad no monta ningun control de sesion, pero si el tema', () => {
    renderHeader('/')

    expect(screen.queryByTestId('user-menu-trigger')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sign-in')).not.toBeInTheDocument()
    expect(screen.queryByTestId('auth-unavailable')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Tema de la interfaz' })).toBeInTheDocument()
  })

  describe('conmutador de tema en el area "Mi cuenta" (HU-05.4)', () => {
    const themeGroup = () => screen.queryByRole('group', { name: 'Tema de la interfaz' })

    it('muestra el conmutador fuera de /account (/ecommerce)', () => {
      renderHeader('/ecommerce')
      expect(themeGroup()).toBeInTheDocument()
    })

    it('muestra el conmutador fuera de /account (/inventory)', () => {
      renderHeader('/inventory')
      expect(themeGroup()).toBeInTheDocument()
    })

    it('oculta el conmutador en /account', () => {
      renderHeader('/account')
      expect(themeGroup()).not.toBeInTheDocument()
    })

    it('oculta el conmutador en un descendiente de /account (p. ej. /account/preferences)', () => {
      renderHeader('/account/preferences')
      expect(themeGroup()).not.toBeInTheDocument()
    })

    it('ocultar el control NO desmonta el sistema de tema: el store y la preferencia siguen intactos', () => {
      initTheme()
      useTheme.getState().setTheme('dark')

      renderHeader('/account')

      // El control no esta en el DOM...
      expect(themeGroup()).not.toBeInTheDocument()
      // ...pero el store sigue vivo y aplicado, y `setTheme` sigue funcionando.
      expect(useTheme.getState().theme).toBe('dark')
      expect(document.documentElement.dataset.theme).toBe('dark')
      useTheme.getState().setTheme('light')
      expect(document.documentElement.dataset.theme).toBe('light')

      globalThis.localStorage.clear()
      initTheme()
    })
  })
})
