import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'

import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { useTheme } from '@/shared/theme'
import { ECOMMERCE_PATH, NAVIGATION } from '@/routes/routes'
import { AccountPage } from '../AccountPage'
import { accountSectionRoutes } from '../routes'
import { accountPreviewChildren } from '@/features/account/dev/previewRoutes'
import { StatisticsSection } from './StatisticsSection'
import { StatisticsDevPreview } from './StatisticsDevPreview'
import { StatisticsPanel } from './StatisticsPanel'
import type { StatisticsPanelState } from './types'

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

const READY: StatisticsPanelState = {
  status: 'ready',
  statistics: { gamesPlayed: 128, wins: 74, generalProgress: { kind: 'pending-definition' } },
  achievements: [
    { id: 'ach-1', name: 'Primera victoria', description: 'Ganaste tu primer combate.' },
    { id: 'ach-2', name: 'Veterano de la arena' },
  ],
}

/** Monta "Mi cuenta" con sus secciones reales, como en produccion. */
const renderAccountAt = (entry: string) => {
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

describe('StatisticsSection — produccion sin backend (HU-06.4)', () => {
  it('TEST 1: renderiza la seccion en estado "pendiente de servicio" sin datos ficticios', () => {
    renderWithProviders(<StatisticsSection />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Estadísticas y logros' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Partidas jugadas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Victorias' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Progreso general' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Logros y reconocimientos' }),
    ).toBeInTheDocument()

    // Disponibilidad pendiente declarada, no datos.
    expect(screen.getAllByText('Aún no disponible').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Definición funcional pendiente')).toBeInTheDocument()

    // Nada de ceros ni porcentajes presentados como hechos del jugador.
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+\s*%/u)).not.toBeInTheDocument()
  })

  it('TEST 2: no realiza ninguna peticion HTTP de estadisticas', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    renderWithProviders(<StatisticsSection />)

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('TEST 13/A11Y: dentro de "Mi cuenta" hay un unico H1 y la seccion usa H2 + H3', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ACCOUNT)))
    renderAccountAt('/account/statistics')

    await screen.findByRole('heading', { level: 2, name: 'Estadísticas y logros' })

    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('Mi cuenta')

    // El "Volver" global lo aporta el shell y es un enlace, no un boton.
    expect(screen.getByRole('link', { name: 'Volver' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /volver/iu })).not.toBeInTheDocument()
    // La seccion ya no trae su propio "Volver a Mi cuenta" (seria redundante).
    expect(screen.queryByRole('link', { name: /volver a mi cuenta/iu })).not.toBeInTheDocument()
  })
})

describe('StatisticsSection — navegacion (HU-06.4)', () => {
  it('TEST 5: aparece en la navegacion interna y navega a /account/statistics con aria-current', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ACCOUNT)))
    const { router } = renderAccountAt('/account')

    const link = await screen.findByRole('link', { name: 'Estadísticas y logros' })
    await user.click(link)

    expect(router.state.location.pathname).toBe('/account/statistics')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Estadísticas y logros' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Estadísticas y logros' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('TEST 6: el "Volver" del shell sale de Estadisticas hacia la pantalla principal autenticada', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ACCOUNT)))

    const router = createMemoryRouter(
      [
        { path: 'account', element: <AccountPage />, children: accountSectionRoutes },
        { path: 'ecommerce', element: <h1>E-commerce</h1> },
      ],
      { initialEntries: ['/account/statistics'] },
    )
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    const back = await screen.findByRole('link', { name: 'Volver' })
    expect(back).toHaveAttribute('href', ECOMMERCE_PATH)

    await user.click(back)
    expect(router.state.location.pathname).toBe(ECOMMERCE_PATH)
  })

  it('TEST 10: ante un 401 en /accounts/me se hereda el aviso del shell y el panel no monta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(401, { message: 'Falta el testimonio o no es valido' })),
    )
    renderAccountAt('/account/statistics')

    expect(await screen.findByRole('alert')).toHaveTextContent(/sesion ha caducado/u)
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Estadísticas y logros' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('128')).not.toBeInTheDocument()
  })
})

describe('StatisticsPanel — estados visuales (HU-06.4)', () => {
  it('TEST 3: con datos DEV muestra exactamente los valores recibidos, sin derivar metricas', () => {
    renderWithProviders(<StatisticsSection state={READY} />)

    expect(screen.getByText('128')).toBeInTheDocument()
    expect(screen.getByText('74')).toBeInTheDocument()
    // No se calcula win rate ni ninguna proporcion.
    expect(screen.queryByText(/%/u)).not.toBeInTheDocument()
    expect(screen.queryByText(/57|58|winrate|win rate/iu)).not.toBeInTheDocument()
  })

  it('TEST 4: el progreso general nunca inventa porcentaje, nivel ni XP', () => {
    renderWithProviders(<StatisticsSection state={READY} />)

    expect(screen.getByText('Definición funcional pendiente')).toBeInTheDocument()
    expect(screen.queryByText(/nivel|experiencia|\bxp\b/iu)).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+\s*%/u)).not.toBeInTheDocument()
  })

  it('TEST 7: "sin logros" muestra un mensaje neutro y NO es role="alert"', () => {
    render(
      <StatisticsPanel
        state={{
          status: 'ready',
          statistics: { gamesPlayed: 3, wins: 1, generalProgress: { kind: 'pending-definition' } },
          achievements: [],
        }}
      />,
    )

    expect(screen.getByText('Aún no tienes logros registrados.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('TEST 8: el estado de error usa role="alert" y se distingue del estado vacio', () => {
    render(<StatisticsPanel state={{ status: 'error' }} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Aún no tienes logros registrados.')).not.toBeInTheDocument()
  })

  it('TEST 9: el estado de carga usa role="status" y destaca el texto (semibold + subrayado), sin barra ni spinner', () => {
    render(<StatisticsPanel state={{ status: 'loading' }} />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(/cargando tus estad/iu)

    // Mayor jerarquia visual: el texto vive en un <strong> subrayado.
    const emphasised = screen.getByText(/cargando tus estad/iu)
    expect(emphasised.tagName).toBe('STRONG')
    expect(emphasised).toHaveClass('underline')

    // Sin barra de progreso ni spinner con role.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('TEST 15: las tarjetas y los logros son informacion, no controles (sin boton, foco ni navegacion falsa)', () => {
    const { container } = render(<StatisticsPanel state={READY} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0)
    expect(container.querySelectorAll('[onclick]')).toHaveLength(0)

    // La superficie de cada metrica es un <div> plano; el logro, un <li> plano.
    const metric = screen
      .getByRole('heading', { level: 3, name: 'Partidas jugadas' })
      .closest('div')
    expect(metric?.getAttribute('role')).toBeNull()
  })

  it('TEST 14: con datos DEV no aparece ninguna metrica no aprobada por RF-06', () => {
    renderWithProviders(<StatisticsSection state={READY} />)

    for (const forbidden of [
      /derrotas/iu,
      /win\s*rate/iu,
      /ranking/iu,
      /rareza/iu,
      /puntos/iu,
      /bloquead/iu,
      /desbloque/iu,
      /\bxp\b/iu,
      /nivel/iu,
    ]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
    }
  })
})

describe('StatisticsSection — tema global (HU-06.4)', () => {
  it('TEST 12: renderiza bajo light y dark reutilizando el tema global, sin estado local', () => {
    const initial = useTheme.getState().theme

    useTheme.setState({ theme: 'dark' })
    const dark = renderWithProviders(<StatisticsSection state={READY} />)
    expect(
      dark.getByRole('heading', { level: 2, name: 'Estadísticas y logros' }),
    ).toBeInTheDocument()
    dark.unmount()

    useTheme.setState({ theme: 'light' })
    const light = renderWithProviders(<StatisticsSection state={READY} />)
    expect(
      light.getByRole('heading', { level: 2, name: 'Estadísticas y logros' }),
    ).toBeInTheDocument()

    // El componente no toca el store del tema al renderizar.
    expect(useTheme.getState().theme).toBe('light')
    useTheme.setState({ theme: initial })
  })
})

describe('Harness DEV de estadisticas (HU-06.4)', () => {
  it('TEST 11: /__dev/account/statistics existe como hija de la preview, con fixture y sin fetch', () => {
    const child = accountPreviewChildren.find((route) => route.path === 'statistics')
    expect(child?.element).toBeDefined()

    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    renderWithProviders(<StatisticsDevPreview />, { route: '/__dev/account/statistics' })

    expect(
      screen.getByRole('heading', { level: 2, name: 'Estadísticas y logros' }),
    ).toBeInTheDocument()
    // El fixture DEV se pinta poblado...
    expect(screen.getByText('128')).toBeInTheDocument()
    // ...sin ninguna peticion de red.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('TEST 11b: la ruta productiva de estadisticas no vive en NAVIGATION', () => {
    const paths = NAVIGATION.map((item) => item.path)
    expect(paths).not.toContain('/account/statistics')
    expect(paths.some((path) => path.includes('__dev'))).toBe(false)
  })
})
