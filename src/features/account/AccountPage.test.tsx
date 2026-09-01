import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'

import { AccountPage } from './AccountPage'
import { accountSectionRoutes } from './routes'
import { createTestQueryClient } from '@/test/render'

const ACCOUNT = {
  id: 'acc-1',
  email: 'ana@nexus.test',
  displayName: 'Ana Ramirez',
  firstNames: 'Ana',
  lastNames: 'Ramirez',
  status: 'ACTIVE',
  roles: ['PLAYER'],
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const renderAt = (entry = '/account') => {
  const router = createMemoryRouter(
    [{ path: 'account', element: <AccountPage />, children: accountSectionRoutes }],
    { initialEntries: [entry] },
  )

  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AccountPage', () => {
  it('muestra el estado de carga mientras resuelve GET /accounts/me', () => {
    // Promesa que nunca se resuelve: la consulta se queda en `isLoading`.
    const pending = new Promise<Response>((resolve) => {
      setTimeout(resolve, 1_000_000)
    })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending))
    renderAt()

    expect(screen.getByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu cuenta...')
  })

  it('con la cuenta cargada muestra el resumen y la navegacion interna', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ACCOUNT)))
    renderAt()

    expect(await screen.findByText('Ana Ramirez')).toBeInTheDocument()
    // El correo aparece en el resumen y de nuevo (solo lectura) en Perfil.
    expect(screen.getAllByText('ana@nexus.test').length).toBeGreaterThan(0)

    const nav = screen.getByRole('navigation', { name: 'Secciones de Mi cuenta' })
    for (const label of [
      'Perfil',
      'Seguridad',
      'Preferencias',
      'Suscripciones',
      'Metodos de pago',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(nav).toBeInTheDocument()
    // "Perfil" (ruta indice) queda marcada como actual en /account.
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page')
  })

  it('ante un 401 explica que la sesion caduco, sin volcar el error tecnico', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(401, { message: 'Falta el testimonio o no es valido' })),
    )
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent(/sesion ha caducado/u)
  })

  it('ante otro error muestra el mensaje del servicio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(500, { message: 'Fallo del servicio de cuenta.' })),
    )
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Fallo del servicio de cuenta.')
  })

  it('navega a otra seccion por teclado y actualiza aria-current', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ACCOUNT)))
    renderAt()

    const preferences = await screen.findByRole('link', { name: 'Preferencias' })
    preferences.focus()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { name: 'Tema de la interfaz' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Preferencias' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})
