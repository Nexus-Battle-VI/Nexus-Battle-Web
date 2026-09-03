import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { HttpError } from '@/lib/http'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { AdminUsersSection } from './AdminUsersSection'
import type { AdminAccountsResponse } from './api'

const ADMIN_RESPONSE: AdminAccountsResponse = {
  items: [
    {
      id: 'acc-panel-admin',
      email: 'panel.admin@nexus.test',
      displayName: 'Capitana Panel',
      firstNames: 'Ana Maria',
      lastNames: 'Vega',
      status: 'ACTIVE',
      roles: ['PLAYER', 'ADMINISTRATOR'],
      registeredAt: '2026-08-01T10:00:00.000Z',
    },
    {
      id: 'acc-panel-suspended',
      email: 'panel.suspended@nexus.test',
      displayName: 'Moderadora Panel',
      firstNames: 'Bruno',
      lastNames: 'Rojas',
      status: 'SUSPENDED',
      roles: ['PLAYER', 'MODERATOR'],
      registeredAt: '2026-07-01T10:00:00.000Z',
    },
  ],
  statusCounts: { pendingVerification: 0, active: 1, suspended: 1 },
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const renderPanel = (
  response: Response | Promise<Response> = jsonResponse(200, ADMIN_RESPONSE),
) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
  useSession.setState({ roles: ['PLAYER', 'ADMINISTRATOR'] })

  return renderWithProviders(<AdminUsersSection />)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  useSession.setState({ roles: [], accessToken: null, expiresAt: null })
})

describe('AdminUsersSection', () => {
  it('muestra loading accesible y el rol real de la sesion', () => {
    const pending = new Promise<Response>((resolve) => {
      setTimeout(resolve, 1_000_000)
    })
    renderPanel(pending)

    expect(
      screen.getByRole('heading', { name: 'Panel administrativo de usuarios' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Rol: Administrador')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando usuarios...')
  })

  it('renderiza estadisticas reales, resultados autorizados y gaps honestos', async () => {
    renderPanel()

    expect(await screen.findByText('Capitana Panel')).toBeInTheDocument()
    expect(screen.getByText('1', { selector: '[data-stat="active"]' })).toBeInTheDocument()
    expect(screen.getByText('1', { selector: '[data-stat="suspended"]' })).toBeInTheDocument()
    expect(
      screen.getByText('No disponible', { selector: '[data-stat="banned"]' }),
    ).toBeInTheDocument()

    const results = screen.getByLabelText('Resultados administrativos')
    for (const value of [
      'acc-panel-admin',
      'panel.admin@nexus.test',
      'Administrador',
      'Activa',
      'Moderadora Panel',
      'Suspendida',
    ]) {
      expect(within(results).getByText(value, { exact: false })).toBeInTheDocument()
    }

    expect(screen.getByLabelText('Fecha de registro')).toBeDisabled()
    expect(screen.getByLabelText('Con sanciones')).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Todos los campos (no disponible)' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByText(/paginación estará disponible/iu)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/PhoenixArrow|LunaEcho|ZenithByte|DrakoFenix/u)
  })

  it('separa draft de applied y consulta solo al pulsar Buscar con params soportados', async () => {
    const user = userEvent.setup()
    const fetchImpl = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse(200, ADMIN_RESPONSE)))
    vi.stubGlobal('fetch', fetchImpl)
    useSession.setState({ roles: ['PLAYER', 'ADMINISTRATOR'] })
    renderWithProviders(<AdminUsersSection />)

    await screen.findByText('Capitana Panel')
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await user.type(screen.getByLabelText('Buscar'), 'persona+admin@nexus.test')
    await user.selectOptions(screen.getByLabelText('Campo de búsqueda'), 'email')
    await user.selectOptions(screen.getByLabelText('Rol'), 'ADMINISTRATOR')
    await user.selectOptions(screen.getByLabelText('Estado de cuenta'), 'SUSPENDED')

    expect(fetchImpl).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Buscar usuarios' }))

    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledTimes(2)
    })
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      '/api/accounts?email=persona%2Badmin%40nexus.test&role=ADMINISTRATOR&status=SUSPENDED',
    )
  })

  it('mapea Nombre solo a firstNames sin inventar una busqueda de nombre completo', async () => {
    const user = userEvent.setup()
    const load = vi.fn().mockResolvedValue(ADMIN_RESPONSE)
    useSession.setState({ roles: ['PLAYER', 'ADMINISTRATOR'] })
    renderWithProviders(<AdminUsersSection loadAccounts={load} />)

    await screen.findByText('Capitana Panel')
    await user.selectOptions(screen.getByLabelText('Campo de búsqueda'), 'firstNames')
    await user.type(screen.getByLabelText('Buscar'), 'Ana Maria')
    await user.click(screen.getByRole('button', { name: 'Buscar usuarios' }))

    await waitFor(() => {
      expect(load).toHaveBeenLastCalledWith({ firstNames: 'Ana Maria' }, expect.any(AbortSignal))
    })
    expect(load).not.toHaveBeenCalledWith(
      expect.objectContaining({ lastNames: expect.anything() }),
      expect.anything(),
    )
  })

  it('distingue cero resultados de un error', async () => {
    renderPanel(
      jsonResponse(200, {
        items: [],
        statusCounts: { pendingVerification: 0, active: 0, suspended: 0 },
      }),
    )

    expect(
      await screen.findByText('No se encontraron usuarios con los criterios aplicados.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([
    [401, /sesión ha caducado/iu],
    [403, /no tienes autorización/iu],
  ])('muestra un error seguro para %s sin datos administrativos', async (status, message) => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(queryKeys.account.adminUsers(''), ADMIN_RESPONSE)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(status, {
          message: 'StackTrace SQL subject token AWS Cognito internal.local',
        }),
      ),
    )
    useSession.setState({ roles: ['PLAYER', 'ADMINISTRATOR'] })

    renderWithProviders(<AdminUsersSection />, { queryClient })

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByText('Capitana Panel')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(
      /StackTrace|SQL|subject|token|AWS|Cognito|internal\.local/u,
    )
  })

  it('oculta detalles tecnicos de errores no autorizativos', async () => {
    const load = vi.fn().mockRejectedValue(new HttpError(500, 'StackTrace SQL subject token', null))
    useSession.setState({ roles: ['PLAYER', 'SUPER_ADMINISTRATOR'] })

    renderWithProviders(<AdminUsersSection loadAccounts={load} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar el panel administrativo. Intenta de nuevo más tarde.',
    )
    expect(screen.getByText('Rol: Super Administrador')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/StackTrace|SQL|subject|token/u)
  })

  it('exporta con exactamente los criterios aplicados y anuncia el resultado', async () => {
    const user = userEvent.setup()
    const load = vi.fn().mockResolvedValue(ADMIN_RESPONSE)
    const exportAccounts = vi.fn().mockResolvedValue({
      content: new Blob(['[]'], { type: 'application/json' }),
      filename: 'nexus-battles-users.json',
      mediaType: 'application/json; charset=utf-8',
    })
    const saveExport = vi.fn()
    useSession.setState({ roles: ['PLAYER', 'ADMINISTRATOR'] })
    renderWithProviders(
      <AdminUsersSection
        loadAccounts={load}
        exportAccounts={exportAccounts}
        saveExport={saveExport}
      />,
    )

    await screen.findByText('Capitana Panel')
    await user.selectOptions(screen.getByLabelText('Rol'), 'ADMINISTRATOR')
    await user.selectOptions(screen.getByLabelText('Estado de cuenta'), 'ACTIVE')
    await user.click(screen.getByRole('button', { name: 'Buscar usuarios' }))
    await waitFor(() => {
      expect(load).toHaveBeenLastCalledWith(
        { role: 'ADMINISTRATOR', status: 'ACTIVE' },
        expect.any(AbortSignal),
      )
    })

    await user.click(screen.getByRole('button', { name: 'Exportar resultados' }))

    await waitFor(() => {
      expect(exportAccounts).toHaveBeenCalledWith({ role: 'ADMINISTRATOR', status: 'ACTIVE' })
    })
    expect(saveExport).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent('Exportación preparada.')
  })

  it('informa un fallo de exportación sin exponer detalles técnicos', async () => {
    const user = userEvent.setup()
    const exportAccounts = vi
      .fn()
      .mockRejectedValue(new HttpError(500, 'StackTrace SQL subject token', null))
    useSession.setState({ roles: ['PLAYER', 'ADMINISTRATOR'] })
    renderWithProviders(
      <AdminUsersSection
        loadAccounts={vi.fn().mockResolvedValue(ADMIN_RESPONSE)}
        exportAccounts={exportAccounts}
      />,
    )

    await screen.findByText('Capitana Panel')
    await user.click(screen.getByRole('button', { name: 'Exportar resultados' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo exportar el resultado. Intenta de nuevo más tarde.',
    )
    expect(document.body.textContent).not.toMatch(/StackTrace|SQL|subject|token/u)
  })
})
