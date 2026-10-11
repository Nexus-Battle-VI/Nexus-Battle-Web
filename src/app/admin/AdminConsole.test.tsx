import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'

import { httpClient } from '@/lib/http'
import { useSession } from '@/shared/session'
import { renderWithProviders } from '@/test/render'

import { AdminHomePage } from './AdminHomePage'
import { AdminLayout } from './AdminLayout'

/**
 * Consola del Consejo (EN-031): la barra lateral y el panel de inicio solo
 * muestran lo que el rol permite, y las insignias solo consultan lo que el
 * rol puede ver -nunca provocan un 403-.
 */
const renderConsole = (route = '/admin') =>
  renderWithProviders(
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="admin" element={<AdminHomePage />} />
        <Route path="admin/roles" element={<p>Pagina de roles</p>} />
      </Route>
    </Routes>,
    { route },
  )

const answer = (moderationTotal: number, tickets: number) =>
  vi.spyOn(httpClient, 'get').mockImplementation((path: string) => {
    if (path.startsWith('/comments/moderation-queue')) {
      return Promise.resolve({ items: [], total: moderationTotal, limit: 20, offset: 0 })
    }
    if (path === '/v1/chatbot/admin/tickets') {
      return Promise.resolve(
        Array.from({ length: tickets }, (_, index) => ({
          id: `t-${String(index)}`,
          actor: 'a',
          question: 'q',
          view: null,
          createdAt: '2026-10-11T12:00:00.000Z',
        })),
      )
    }
    return Promise.reject(new Error(`ruta inesperada ${path}`))
  })

afterEach(() => {
  vi.restoreAllMocks()
  useSession.setState({ subject: null, roles: [] })
})

describe('Consola del Consejo (EN-031)', () => {
  it('un Super administrador ve todas las secciones agrupadas y los pendientes', async () => {
    useSession.setState({ subject: 'ana', roles: ['SUPER_ADMINISTRATOR'] })
    answer(3, 2)
    renderConsole()

    const sidebar = screen.getByRole('navigation', { name: 'Secciones de administración' })
    for (const label of [
      'Consola de mando',
      'Editar misiones',
      'Gestionar productos',
      'Moderación de comentarios',
      'Modelo del chatbot',
      'Gestionar roles',
    ]) {
      expect(
        within(sidebar).getByRole('link', { name: new RegExp(label, 'u') }),
      ).toBeInTheDocument()
    }
    expect(within(sidebar).getByRole('link', { name: /Consola de mando/u })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(await within(sidebar).findByRole('img', { name: 'Pendientes: 3' })).toBeInTheDocument()
    expect(await within(sidebar).findByRole('img', { name: 'Pendientes: 2' })).toBeInTheDocument()

    expect(screen.getByRole('heading', { level: 1, name: 'Salón del Consejo' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Pendientes' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Seguridad' })).toBeInTheDocument()
  })

  it('un Moderador solo ve moderacion y solo consulta la cola de moderacion', async () => {
    useSession.setState({ subject: 'ana', roles: ['MODERATOR'] })
    const get = answer(5, 9)
    renderConsole()

    const sidebar = screen.getByRole('navigation', { name: 'Secciones de administración' })
    expect(
      within(sidebar).getByRole('link', { name: /Moderación de comentarios/u }),
    ).toBeInTheDocument()
    expect(
      within(sidebar).queryByRole('link', { name: /Editar misiones/u }),
    ).not.toBeInTheDocument()
    expect(
      within(sidebar).queryByRole('link', { name: /Gestionar roles/u }),
    ).not.toBeInTheDocument()
    expect(await within(sidebar).findByRole('img', { name: 'Pendientes: 5' })).toBeInTheDocument()

    // Nunca pide los tickets: el Moderador no puede verlos (seria un 403).
    await waitFor(() => {
      expect(get).toHaveBeenCalled()
    })
    expect(get.mock.calls.map(([path]) => path)).not.toContain('/v1/chatbot/admin/tickets')
    expect(screen.queryByRole('region', { name: 'Seguridad' })).not.toBeInTheDocument()
  })

  it('un Administrador no ve "Gestionar roles"', () => {
    useSession.setState({ subject: 'ana', roles: ['ADMINISTRATOR'] })
    answer(0, 0)
    renderConsole()

    const sidebar = screen.getByRole('navigation', { name: 'Secciones de administración' })
    expect(
      within(sidebar).queryByRole('link', { name: /Gestionar roles/u }),
    ).not.toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: /Métricas de subasta/u })).toBeInTheDocument()
  })

  it('un Jugador no provoca ninguna consulta y no ve secciones', () => {
    useSession.setState({ subject: 'ana', roles: ['PLAYER'] })
    const get = answer(0, 0)
    renderConsole('/admin/roles')

    const sidebar = screen.getByRole('navigation', { name: 'Secciones de administración' })
    expect(within(sidebar).getAllByRole('link')).toHaveLength(1)
    expect(get).not.toHaveBeenCalled()
    // El layout no autoriza nada: la pagina (con su propia guarda) se pinta igual.
    expect(screen.getByText('Pagina de roles')).toBeInTheDocument()
  })

  it('un Game Master ve la publicacion de subastas oficiales', () => {
    useSession.setState({ subject: 'ana', roles: ['PLAYER', 'GAME_MASTER'] })
    answer(0, 0)
    renderConsole()

    const sidebar = screen.getByRole('navigation', { name: 'Secciones de administración' })
    expect(
      within(sidebar).getByRole('link', { name: /Publicar subasta oficial/u }),
    ).toHaveAttribute('href', '/auction/publish-official')
  })

  it('si una consulta de pendientes falla, la consola sigue en pie sin insignia', async () => {
    useSession.setState({ subject: 'ana', roles: ['SUPER_ADMINISTRATOR'] })
    const get = vi.spyOn(httpClient, 'get').mockRejectedValue(new Error('caido'))
    renderConsole()

    await waitFor(() => {
      expect(get).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Salón del Consejo' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Pendientes/u })).not.toBeInTheDocument()
  })

  it('por debajo de lg la barra se pliega tras "Secciones", que la controla', async () => {
    const user = userEvent.setup()
    useSession.setState({ subject: 'ana', roles: ['ADMINISTRATOR'] })
    answer(0, 0)
    renderConsole()

    const toggle = screen.getByRole('button', { name: /Secciones/u })
    const sidebar = screen.getByRole('navigation', { name: 'Secciones de administración' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', sidebar.id)
    expect(sidebar).toHaveClass('max-lg:hidden')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(sidebar).not.toHaveClass('max-lg:hidden')
  })
})
