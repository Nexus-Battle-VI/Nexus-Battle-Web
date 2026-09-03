import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'

import { AccountPage } from './AccountPage'
import { accountSectionRoutes } from './routes'
import { createTestQueryClient } from '@/test/render'
import { ECOMMERCE_PATH } from '@/routes/routes'
import type { OwnAccount, OwnPersonalData } from './api'

const ACCOUNT: OwnAccount = {
  id: 'acc-1',
  email: 'ana@nexus.test',
  displayName: 'Ana Ramirez',
  firstNames: 'Ana',
  lastNames: 'Ramirez',
  status: 'ACTIVE',
  roles: ['PLAYER'],
}

const PERSONAL_DATA: OwnPersonalData = {
  email: 'ana.privacidad@nexus.test',
  displayName: 'Ana Privacidad',
  firstNames: 'Ana',
  lastNames: 'Privacidad',
  roles: ['PLAYER'],
  termsAccepted: true,
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const mockAccountBackend = (
  account: OwnAccount = ACCOUNT,
  personalData: OwnPersonalData = PERSONAL_DATA,
) => {
  const fetchImpl = vi.fn((input: RequestInfo | URL) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const body = url.endsWith('/accounts/me/privacy') ? personalData : account

    return Promise.resolve(json(200, body))
  })
  vi.stubGlobal('fetch', fetchImpl)

  return fetchImpl
}

const renderAt = (entry = '/account') => {
  const router = createMemoryRouter(
    [{ path: 'account', element: <AccountPage />, children: accountSectionRoutes }],
    { initialEntries: [entry] },
  )

  return {
    router,
    ...render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  }
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
    mockAccountBackend()
    renderAt()

    expect(await screen.findByText('Ana Ramirez')).toBeInTheDocument()
    // El correo aparece en el resumen y de nuevo (solo lectura) en Perfil.
    expect(screen.getAllByText('ana@nexus.test').length).toBeGreaterThan(0)

    const nav = screen.getByRole('navigation', { name: 'Secciones de Mi cuenta' })
    for (const label of [
      'Perfil',
      'Seguridad',
      'Preferencias',
      'Estadísticas y logros',
      'Suscripciones',
      'Metodos de pago',
      'Datos personales y exportación',
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

  it('la cabecera compartida ofrece un unico "Volver" (enlace) hacia la pantalla principal autenticada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ACCOUNT)))
    renderAt('/account')

    const back = await screen.findByRole('link', { name: 'Volver' })
    expect(back).toHaveAttribute('href', ECOMMERCE_PATH)
    // Navegacion = enlace, no boton.
    expect(screen.queryByRole('button', { name: /volver/iu })).not.toBeInTheDocument()
    // Una sola vez en el shell.
    expect(screen.getAllByRole('link', { name: 'Volver' })).toHaveLength(1)
  })

  it('el "Volver" del shell acompana a cualquier seccion hija (p. ej. Metodos de pago)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ACCOUNT)))
    renderAt('/account/payment-methods')

    // La seccion hija ya montada confirma que estamos fuera del estado de carga.
    expect(await screen.findByRole('heading', { name: 'Metodos de pago' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', ECOMMERCE_PATH)
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

  it('muestra privacidad solo para PLAYER y justo debajo de Metodos de pago', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ACCOUNT)))
    renderAt()

    const nav = await screen.findByRole('navigation', { name: 'Secciones de Mi cuenta' })
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)

    expect(labels).toEqual([
      'Perfil',
      'Seguridad',
      'Preferencias',
      'Estadísticas y logros',
      'Suscripciones',
      'Metodos de pago',
      'Datos personales y exportación',
    ])
  })

  it.each(['MODERATOR', 'ADMINISTRATOR', 'SUPER_ADMINISTRATOR'])(
    'oculta privacidad cuando el rol primario es %s',
    async (role) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(json(200, { ...ACCOUNT, roles: ['PLAYER', role] })),
      )
      renderAt()

      expect(await screen.findByText('Ana Ramirez')).toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'Datos personales y exportación' }),
      ).not.toBeInTheDocument()
    },
  )

  it('navega a Seguridad y Privacidad conservando el shell de Mi cuenta', async () => {
    const user = userEvent.setup()
    mockAccountBackend()
    const { router } = renderAt()

    await user.click(await screen.findByRole('link', { name: 'Seguridad' }))

    expect(router.state.location.pathname).toBe('/account/security')
    expect(screen.getByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument()
    expect(screen.getByText('Ana Ramirez')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Seguridad' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { name: 'Cambiar contraseña' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Datos personales y exportación' }))

    expect(router.state.location.pathname).toBe('/account/privacy')
    expect(screen.getByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument()
    expect(screen.getAllByText('Ana Ramirez').length).toBeGreaterThan(0)
    expect(
      await screen.findByText('Cuenta: Ana Privacidad (titular autenticado)'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Datos personales y exportación' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('heading', { name: 'Mis datos personales' })).toBeInTheDocument()
  })
})
