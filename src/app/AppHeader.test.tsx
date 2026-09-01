import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import { AppHeader } from './AppHeader'
import { useSession } from '@/shared/session'
import { initTheme, useTheme } from '@/shared/theme'

const renderHeader = (variant: 'authenticated' | 'public', route = '/ecommerce') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AppHeader variant={variant} />
    </MemoryRouter>,
  )

afterEach(() => {
  useSession.setState({
    subject: null,
    roles: [],
    authenticationAvailable: false,
  })
})

describe('AppHeader', () => {
  it('la marca tiene nombre accesible y, en el shell autenticado, enlaza a /ecommerce', () => {
    renderHeader('authenticated')

    const brand = screen.getByRole('link', { name: 'Nexus Battles VI' })
    expect(brand).toHaveAttribute('href', '/ecommerce')
    expect(screen.getByRole('img', { name: 'Nexus Battles VI' })).toBeInTheDocument()
  })

  it('incluye la navegacion principal y el conmutador de tema', () => {
    renderHeader('authenticated')

    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Tema de la interfaz' })).toBeInTheDocument()
  })

  it('en la variante autenticada monta el control de sesion', () => {
    useSession.setState({
      authenticationAvailable: true,
      subject: 'sujeto-ana',
      displayName: 'Ana',
      accessToken: 'token',
    })
    renderHeader('authenticated')

    expect(screen.getByTestId('user-menu-trigger')).toBeInTheDocument()
  })

  it('en la variante publica no monta el control de sesion, pero si el tema', () => {
    renderHeader('public', '/')

    expect(screen.queryByTestId('user-menu-trigger')).not.toBeInTheDocument()
    expect(screen.queryByTestId('auth-unavailable')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Tema de la interfaz' })).toBeInTheDocument()
  })

  describe('conmutador de tema en el area "Mi cuenta" (HU-05.4)', () => {
    const themeGroup = () => screen.queryByRole('group', { name: 'Tema de la interfaz' })

    it('muestra el conmutador fuera de /account (/ecommerce)', () => {
      renderHeader('authenticated', '/ecommerce')
      expect(themeGroup()).toBeInTheDocument()
    })

    it('muestra el conmutador fuera de /account (/inventory)', () => {
      renderHeader('authenticated', '/inventory')
      expect(themeGroup()).toBeInTheDocument()
    })

    it('oculta el conmutador en /account', () => {
      renderHeader('authenticated', '/account')
      expect(themeGroup()).not.toBeInTheDocument()
    })

    it('oculta el conmutador en un descendiente de /account (p. ej. /account/preferences)', () => {
      renderHeader('authenticated', '/account/preferences')
      expect(themeGroup()).not.toBeInTheDocument()
    })

    it('ocultar el control NO desmonta el sistema de tema: el store y la preferencia siguen intactos', () => {
      initTheme()
      useTheme.getState().setTheme('dark')

      renderHeader('authenticated', '/account')

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
