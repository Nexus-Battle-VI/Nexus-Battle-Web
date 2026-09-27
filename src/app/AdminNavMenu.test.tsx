import { afterEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AdminNavMenu } from './AdminNavMenu'
import { useSession } from '@/shared/session'
import { renderWithProviders } from '@/test/render'

const renderMenu = (route = '/ecommerce') => renderWithProviders(<AdminNavMenu />, { route })

afterEach(() => {
  useSession.setState({ roles: [] })
})

describe('AdminNavMenu', () => {
  it('no renderiza nada si el rol primario no califica para ningun acceso administrativo', () => {
    useSession.setState({ roles: ['PLAYER'] })
    const { container } = renderMenu()

    expect(container).toBeEmptyDOMElement()
  })

  it('sin sesion (sin roles) tampoco renderiza nada', () => {
    const { container } = renderMenu()

    expect(container).toBeEmptyDOMElement()
  })

  it('con ADMINISTRATOR muestra la entrada agrupadora y, al abrirla, los cinco accesos que habilita', async () => {
    const user = userEvent.setup()
    useSession.setState({ roles: ['ADMINISTRATOR'] })
    renderMenu()

    const trigger = screen.getByTestId('admin-nav-trigger')
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const menu = screen.getByRole('menu')
    expect(menu).toBeInTheDocument()

    // Un Administrador ve todo lo que exige ADMINISTRATOR o un rango menor
    // (MODERATOR): mismo criterio de jerarquia que ya regia la navegacion
    // plana (HU-41.10), ahora expresado por `adminNavigationForPrimaryRole`.
    for (const label of [
      'Editar misiones',
      'Gestionar productos',
      'Gestionar banner',
      'Moderación de comentarios',
    ]) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument()
    }

    // Solo SUPER_ADMINISTRATOR NO aparece para un Administrador.
    expect(screen.queryByRole('menuitem', { name: 'Gestionar roles' })).not.toBeInTheDocument()
  })

  it('con SUPER_ADMINISTRATOR incluye ademas "Gestionar roles"', async () => {
    const user = userEvent.setup()
    useSession.setState({ roles: ['SUPER_ADMINISTRATOR'] })
    renderMenu()

    await user.click(screen.getByTestId('admin-nav-trigger'))

    expect(screen.getByRole('menuitem', { name: 'Gestionar roles' })).toBeInTheDocument()
  })

  it('con MODERATOR solo muestra "Moderación de comentarios"', async () => {
    const user = userEvent.setup()
    useSession.setState({ roles: ['MODERATOR'] })
    renderMenu()

    await user.click(screen.getByTestId('admin-nav-trigger'))

    expect(screen.getByRole('menuitem', { name: 'Moderación de comentarios' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Editar misiones' })).not.toBeInTheDocument()
  })

  it('cierra el menu al pulsar Escape y devuelve el foco al disparador', async () => {
    const user = userEvent.setup()
    useSession.setState({ roles: ['SUPER_ADMINISTRATOR'] })
    renderMenu()

    const trigger = screen.getByTestId('admin-nav-trigger')
    await user.click(trigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('cierra el menu al hacer clic fuera', async () => {
    const user = userEvent.setup()
    useSession.setState({ roles: ['SUPER_ADMINISTRATOR'] })
    renderMenu()

    await user.click(screen.getByTestId('admin-nav-trigger'))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(document.body)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('cierra el menu al elegir un acceso', async () => {
    const user = userEvent.setup()
    useSession.setState({ roles: ['SUPER_ADMINISTRATOR'] })
    renderMenu()

    await user.click(screen.getByTestId('admin-nav-trigger'))
    await user.click(screen.getByRole('menuitem', { name: 'Gestionar roles' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('marca el disparador como activo cuando la ruta actual es un acceso administrativo', () => {
    useSession.setState({ roles: ['SUPER_ADMINISTRATOR'] })
    renderMenu('/admin/roles')

    expect(screen.getByTestId('admin-nav-trigger')).toHaveClass('text-brand-ink')
  })
})
