import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'

import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { ECOMMERCE_PATH, NAVIGATION, routes } from './routes'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useSession } from '@/shared/session'
import { AccountPage } from '@/features/account/AccountPage'
import { PlayerInventoryPage } from '@/features/player-inventory/PlayerInventoryPage'
import { CommunityPage } from '@/features/community/CommunityPage'
import { CommercePage } from '@/features/commerce/CommercePage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'

describe('NAVIGATION', () => {
  /**
   * HU-02 fija esta lista: son los accesos de producto que el cliente
   * confirmo (Task #91, seccion 6), no los nombres tecnicos de los bounded
   * contexts que la navegacion mostraba antes.
   */
  it('declara los accesos de producto confirmados por HU-02, sin duplicados', () => {
    const paths = NAVIGATION.map((item) => item.path)

    expect(paths).toEqual([
      '/ecommerce',
      '/play',
      '/missions',
      '/tournament',
      '/inventory',
      '/auction',
      '/account',
    ])
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('no nombra bounded contexts como acceso de navegacion', () => {
    const labels = NAVIGATION.map((item) => item.label)

    for (const technicalName of ['Catalog', 'Community', 'Commerce', 'Notifications', 'Catalogo']) {
      expect(labels).not.toContain(technicalName)
    }
  })
})

const renderRoute = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  return {
    router,
    ...render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  }
}

const AUTHENTICATED_STATE = {
  subject: 'sujeto-ana',
  email: 'ana@nexus.test',
  displayName: 'Ana',
  roles: ['PLAYER'],
  accessToken: 'token',
  expiresAt: Date.now() + 900_000,
  viaProvider: false,
  authenticationAvailable: true,
}

const ANONYMOUS_STATE = {
  subject: null,
  email: null,
  displayName: null,
  roles: [],
  accessToken: null,
  expiresAt: null,
  viaProvider: false,
  authenticationAvailable: false,
}

describe('Proteccion visual de rutas (HU-02)', () => {
  afterEach(() => {
    useSession.setState(ANONYMOUS_STATE)
  })

  it('sin sesion, la raiz muestra el menu publico, no el formulario de login', async () => {
    useSession.setState(ANONYMOUS_STATE)
    renderRoute('/')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bienvenido al universo Nexus' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Iniciar sesión' }),
    ).not.toBeInTheDocument()
  })

  it('desde el menu publico se puede ir a iniciar sesion o a crear cuenta', async () => {
    useSession.setState(ANONYMOUS_STATE)
    renderRoute('/')

    await screen.findByRole('heading', { level: 1, name: 'Bienvenido al universo Nexus' })

    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register')
  })

  /**
   * El fallo estuvo en el CABLEADO, no en ninguna guarda: `/register` quedo
   * montado sin proteccion y la landing enlazaba directo ahi. Alguien sin
   * identidad rellenaba nombres, apellidos, apodo, contrasena, avatar y cuatro
   * preguntas de seguridad para recibir al final "Falta el testimonio de
   * identidad", porque `POST /api/accounts` responde 401 sin testimonio.
   *
   * Por eso la prueba es de ruta y no del componente: la guarda por si sola ya
   * pasaba sus propias pruebas mientras la ruta seguia desprotegida.
   */
  it('sin identidad, /register no muestra el formulario que no podria enviarse', async () => {
    // Con proveedor DISPONIBLE: lo que se comprueba es la falta de identidad,
    // no la falta de configuracion, que tiene su propia pantalla.
    useSession.setState({ ...ANONYMOUS_STATE, authenticationAvailable: true })
    const { router } = renderRoute('/register')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Primero, tu identidad' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Apodo')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/register')
  })

  it('con identidad, /register SI muestra el formulario', async () => {
    useSession.setState(AUTHENTICATED_STATE)
    renderRoute('/register')

    expect(await screen.findByLabelText('Apodo')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Primero, tu identidad' }),
    ).not.toBeInTheDocument()
  })

  it('sin sesion, una ruta autenticada muestra el aviso "Para continuar" en el mismo sitio, sin redirigir a /login', async () => {
    useSession.setState(ANONYMOUS_STATE)
    const { router } = renderRoute('/ecommerce')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Para continuar' }),
    ).toBeInTheDocument()
    // No hubo redireccion: la URL sigue siendo la que la persona pidio.
    expect(router.state.location.pathname).toBe('/ecommerce')
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register')
  })

  it('con sesion, la raiz lleva a E-commerce y no a una pantalla distinta', async () => {
    useSession.setState(AUTHENTICATED_STATE)
    const { router } = renderRoute('/')

    expect(await screen.findByRole('heading', { name: 'E-commerce' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(ECOMMERCE_PATH)
  })

  it('con sesion, /login redirige a E-commerce en lugar de mostrar el formulario', async () => {
    useSession.setState(AUTHENTICATED_STATE)
    renderRoute('/login')

    expect(await screen.findByRole('heading', { name: 'E-commerce' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Iniciar sesión' }),
    ).not.toBeInTheDocument()
  })

  it('los modulos aun no implementados se muestran deshabilitados, no simulados', async () => {
    useSession.setState(AUTHENTICATED_STATE)
    renderRoute('/tournament')

    expect(await screen.findByRole('heading', { name: 'Torneo' })).toBeInTheDocument()
    expect(screen.getByText('Módulo no disponible.')).toBeInTheDocument()
  })

  it('un visitante que intenta Mi Inventario sin sesion recibe el gate, no el inventario', async () => {
    useSession.setState(ANONYMOUS_STATE)
    const { router } = renderRoute('/inventory')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Para continuar' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/inventory')
    expect(screen.queryByRole('heading', { name: 'Inventario' })).not.toBeInTheDocument()
  })

  it('un visitante que intenta Misiones sin sesion recibe el gate, no el aviso de modulo no disponible', async () => {
    useSession.setState(ANONYMOUS_STATE)
    renderRoute('/missions')

    // El gate de sesion tiene prioridad: sin sesion no hay forma de saber si
    // el modulo estaria disponible, asi que no se llega a mostrar ese estado.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Para continuar' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Módulo no disponible.')).not.toBeInTheDocument()
  })

  it('con sesion, E-commerce se renderiza dentro del shell autenticado (misma nav, sesion visible)', async () => {
    useSession.setState(AUTHENTICATED_STATE)
    renderRoute('/ecommerce')

    expect(await screen.findByRole('heading', { name: 'E-commerce' })).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: 'Principal' })

    for (const label of [
      'E-commerce',
      'Jugar Online',
      'Misiones',
      'Torneo',
      'Mi Inventario',
      'Subasta',
      'Mi Cuenta',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }

    expect(nav).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cerrar sesion/iu })).toBeInTheDocument()
  })

  it('cerrar sesion elimina la sesion y vuelve al estado publico esperado', async () => {
    useSession.setState(AUTHENTICATED_STATE)
    const user = userEvent.setup()
    const { router } = renderRoute('/ecommerce')

    await screen.findByRole('heading', { name: 'E-commerce' })
    await user.click(screen.getByRole('button', { name: /cerrar sesion/iu }))

    expect(useSession.getState().subject).toBeNull()

    // La sesion de esta prueba es de credenciales (`viaProvider: false`), asi
    // que cerrarla no redirige al proveedor: se queda en la misma app y la
    // ruta protegida pasa a mostrar el gate publico esperado.
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Para continuar' })).toBeInTheDocument()
    })
    expect(router.state.location.pathname).toBe('/ecommerce')
  })
})

describe('Pantallas todavia no implementadas', () => {
  /**
   * Estas pantallas son marcadores de posicion. La prueba verifica justamente
   * eso: que **declaran** no estar implementadas y nombran el servicio
   * responsable, en lugar de mostrar datos inventados que las harian
   * indistinguibles de una pantalla terminada.
   */
  it.each([
    ['Cuenta', 'Nexus-Battle-Account', <AccountPage key="account" />],
    ['Inventario', 'Nexus-Battle-Player-Inventory', <PlayerInventoryPage key="inventory" />],
    ['Comunidad', 'Nexus-Battle-Community', <CommunityPage key="community" />],
    ['Pedidos', 'Nexus-Battle-Commerce', <CommercePage key="commerce" />],
    ['Notificaciones', 'Nexus-Battle-Notifications', <NotificationsPage key="notifications" />],
  ])('%s declara su estado y nombra el servicio %s', (title, service, element) => {
    renderWithProviders(element)

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText(/todavia no esta implementada/u)).toBeInTheDocument()
    expect(screen.getByText(service)).toBeInTheDocument()
  })
})

describe('useDebouncedValue', () => {
  it('devuelve el valor inicial de inmediato', () => {
    const { result } = renderHook(() => useDebouncedValue('inicial', 50))

    expect(result.current).toBe('inicial')
  })

  it('propaga el valor solo despues del retraso', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 50), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'b' })
    expect(result.current).toBe('a')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    expect(result.current).toBe('b')
  })

  it('descarta los valores intermedios y conserva solo el ultimo', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 50), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'b' })
    rerender({ value: 'c' })
    rerender({ value: 'd' })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    expect(result.current).toBe('d')
  })
})
