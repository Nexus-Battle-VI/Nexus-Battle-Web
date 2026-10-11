import { afterEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useSession } from '@/shared/session'
import { renderWithProviders } from '@/test/render'

import { MobileNavDrawer } from './MobileNavDrawer'

afterEach(() => {
  useSession.setState({ subject: null, roles: [] })
})

const openDrawer = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
  await user.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
  return screen.getByRole('dialog', { name: 'Menú de navegación' })
}

describe('MobileNavDrawer (EN-031)', () => {
  it('cerrado no monta ningun enlace: no duplica la navegacion principal', () => {
    renderWithProviders(<MobileNavDrawer />, { route: '/ecommerce' })

    const trigger = screen.getByRole('button', { name: 'Abrir menú de navegación' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('abierto es un dialogo modal con su propia navegacion y marca el modulo actual', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MobileNavDrawer />, { route: '/missions' })

    const dialog = await openDrawer(user)

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Abrir menú de navegación' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    const nav = within(dialog).getByRole('navigation', { name: 'Módulos' })
    expect(within(nav).getAllByRole('link')).toHaveLength(6)
    expect(within(nav).getByRole('link', { name: 'Misiones' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
    // El foco entra en el cajon.
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })

  it('Escape cierra y devuelve el foco a la hamburguesa', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MobileNavDrawer />, { route: '/ecommerce' })
    await openDrawer(user)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir menú de navegación' })).toHaveFocus()
  })

  it('el boton de cerrar y el velo tambien cierran', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MobileNavDrawer />, { route: '/ecommerce' })

    await openDrawer(user)
    await user.click(screen.getByRole('button', { name: 'Cerrar menú de navegación' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await openDrawer(user)
    await user.click(screen.getByTestId('nav-drawer-scrim'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('el foco queda atrapado: Tab desde el ultimo enlace vuelve al primero', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MobileNavDrawer />, { route: '/ecommerce' })
    const dialog = await openDrawer(user)
    const focusable = dialog.querySelectorAll<HTMLElement>('a[href], button')
    const last = focusable[focusable.length - 1]
    last?.focus()

    await user.tab()

    expect(focusable[0]).toHaveFocus()

    await user.tab({ shift: true })

    expect(last).toHaveFocus()
  })

  it('al navegar desde el cajon, se cierra solo', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MobileNavDrawer />, { route: '/ecommerce' })
    const dialog = await openDrawer(user)

    await user.click(within(dialog).getByRole('link', { name: 'Subasta' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('solo con rol administrativo muestra el grupo de administracion', async () => {
    const user = userEvent.setup()
    useSession.setState({ subject: 'sujeto-ana', roles: ['ADMINISTRATOR'] })
    renderWithProviders(<MobileNavDrawer />, { route: '/ecommerce' })

    const dialog = await openDrawer(user)

    expect(within(dialog).getByRole('heading', { name: 'Administrador' })).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Editar misiones' })).toHaveAttribute(
      'href',
      '/admin/missions',
    )
  })

  it('un jugador no ve el grupo de administracion', async () => {
    const user = userEvent.setup()
    useSession.setState({ subject: 'sujeto-ana', roles: ['PLAYER'] })
    renderWithProviders(<MobileNavDrawer />, { route: '/ecommerce' })

    const dialog = await openDrawer(user)

    expect(within(dialog).queryByRole('heading', { name: 'Administrador' })).not.toBeInTheDocument()
  })
})
