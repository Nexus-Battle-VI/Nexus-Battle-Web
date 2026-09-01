import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

import { PrimaryNav } from './PrimaryNav'
import { useSession } from '@/shared/session'

const CENTRAL_MODULES = [
  'E-commerce',
  'Jugar Online',
  'Misiones',
  'Torneo',
  'Mi Inventario',
  'Subasta',
] as const

const renderNav = (route = '/ecommerce') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <PrimaryNav />
    </MemoryRouter>,
  )

afterEach(() => {
  useSession.setState({ roles: [] })
})

describe('PrimaryNav', () => {
  it('muestra exactamente los seis modulos centrales y NO "Mi Cuenta"', () => {
    renderNav()

    for (const label of CENTRAL_MODULES) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }

    expect(screen.queryByRole('link', { name: 'Mi Cuenta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mi cuenta' })).not.toBeInTheDocument()
  })

  it('marca el modulo activo con aria-current="page" y un unico indicador', () => {
    renderNav('/inventory')

    const active = screen.getByRole('link', { name: 'Mi Inventario' })
    expect(active).toHaveAttribute('aria-current', 'page')

    const currentLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(currentLinks).toHaveLength(1)

    expect(screen.getAllByTestId('primary-nav-indicator')).toHaveLength(1)
  })

  it('el indicador no lleva transicion inline: la anima CSS y prefers-reduced-motion la neutraliza', () => {
    renderNav('/ecommerce')

    const indicator = screen.getByTestId('primary-nav-indicator')
    expect(indicator).toHaveClass('nb-nav-pill')
    expect(indicator.style.transition).toBe('')
    expect(indicator).toHaveAttribute('aria-hidden', 'true')
  })

  it('mantiene li como unicos hijos directos de la lista y deja el indicador fuera del ul', () => {
    renderNav('/ecommerce')

    const navigation = screen.getByRole('navigation', { name: 'Principal' })
    const list = navigation.querySelector('ul')
    const indicator = screen.getByTestId('primary-nav-indicator')

    expect(list).not.toBeNull()
    expect(Array.from(list?.children ?? []).every((child) => child.tagName === 'LI')).toBe(true)
    expect(list).not.toContainElement(indicator)
    expect(navigation).toContainElement(indicator)
  })

  it('desplaza lista e indicador dentro del mismo contenedor responsive', () => {
    renderNav('/ecommerce')

    const navigation = screen.getByRole('navigation', { name: 'Principal' })
    const list = navigation.querySelector('ul')
    const indicator = screen.getByTestId('primary-nav-indicator')
    const scrollContainer = list?.parentElement

    expect(scrollContainer).not.toBeNull()
    expect(scrollContainer).toHaveClass('relative')
    expect(scrollContainer).toHaveClass('overflow-x-auto')
    expect(scrollContainer).toContainElement(list)
    expect(scrollContainer).toContainElement(indicator)
    expect(list).not.toHaveClass('overflow-x-auto')
  })

  it('reparte los modulos en un carril tipo rejilla (segmentos equivalentes, sin anchos en px)', () => {
    renderNav('/ecommerce')

    const list = screen.getByRole('navigation', { name: 'Principal' }).querySelector('ul')
    expect(list).toHaveClass('nb-nav-rail')
    // grid-flow-col reparte los seis modulos por todo el ancho disponible.
    expect(list?.className).toContain('grid')
    expect(list?.className).toContain('grid-flow-col')
  })

  it('la identidad "raices Nexus" es pura decoracion CSS: no anade nodos ni semantica', () => {
    const { container } = renderNav('/ecommerce')

    // El efecto vive en pseudo-elementos (`::before`/`::after` de `.nb-nav-seg`):
    // la unica decoracion `aria-hidden` del arbol sigue siendo el indicador.
    const hidden = container.querySelectorAll('[aria-hidden="true"]')
    expect(hidden).toHaveLength(1)
    expect(hidden[0]).toHaveAttribute('data-testid', 'primary-nav-indicator')

    // Los segmentos siguen siendo enlaces reales con la clase de estilo.
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveClass('nb-nav-seg')
    }
    expect(screen.getByRole('link', { name: 'E-commerce' })).toHaveAttribute('aria-current', 'page')
  })

  it('es operable por teclado: los modulos son enlaces enfocables', async () => {
    const user = userEvent.setup()
    renderNav('/ecommerce')

    await user.tab()
    expect(screen.getByRole('link', { name: 'E-commerce' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Jugar Online' })).toHaveFocus()
  })

  it('incluye "Gestionar roles" solo para el rol primario SUPER_ADMINISTRATOR', () => {
    renderNav()
    expect(screen.queryByRole('link', { name: 'Gestionar roles' })).not.toBeInTheDocument()

    useSession.setState({ roles: ['SUPER_ADMINISTRATOR'] })
    renderNav()
    expect(screen.getAllByRole('link', { name: 'Gestionar roles' }).length).toBeGreaterThan(0)
  })
})
