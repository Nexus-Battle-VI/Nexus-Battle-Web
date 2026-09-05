import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'

import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { jsonResponse, showcaseProduct } from '@/test/commerce-fixtures'
import { ECOMMERCE_PATH, NAVIGATION, navigationForPrimaryRole, routes } from './routes'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useSession } from '@/shared/session'
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
  it('declara los accesos de producto confirmados (HU-02, HU-05.4), sin "Mi Cuenta" y sin duplicados', () => {
    const paths = NAVIGATION.map((item) => item.path)

    // HU-05.4: "Mi Cuenta" deja de vivir en la navegacion central (el acceso a
    // la cuenta es SessionControl). La ruta /account sigue existiendo.
    expect(paths).toEqual([
      '/ecommerce',
      '/play',
      '/missions',
      '/tournament',
      '/inventory',
      // HU-07: preparar al heroe es un paso previo a jugar y no cuelga de
      // ningun otro flujo. Sin acceso propio solo se llegaria escribiendo la
      // URL.
      '/heroes',
      '/auction',
      // HU-33: catalogo administrativo. Solo lo ven los roles administrativos;
      // el filtro se comprueba mas abajo.
      '/admin/products/new',
      '/admin/roles',
      // HU-41.10: acceso visible a la cola de moderacion de comentarios para
      // Moderador, Administrador y Super Administrador.
      '/admin/comments/moderation',
    ])
    expect(paths).not.toContain('/account')
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('no nombra bounded contexts como acceso de navegacion', () => {
    const labels = NAVIGATION.map((item) => item.label)

    for (const technicalName of ['Catalog', 'Community', 'Commerce', 'Notifications', 'Catalogo']) {
      expect(labels).not.toContain(technicalName)
    }
  })

  it('filtra la gestion de roles para el rol primario SUPER_ADMINISTRATOR', () => {
    expect(navigationForPrimaryRole('PLAYER').some((item) => item.path === '/admin/roles')).toBe(
      false,
    )
    expect(
      navigationForPrimaryRole('SUPER_ADMINISTRATOR').some((item) => item.path === '/admin/roles'),
    ).toBe(true)
  })

  /**
   * La jerarquia va en UN solo sentido y hay que comprobar las dos caras. Un
   * Super Administrador ve lo que se exige a un Administrador; un Administrador
   * NO ve la gestion de roles. Sin el segundo caso, «hay jerarquia» podria
   * cumplirse dandoselo todo a cualquier rol administrativo.
   */
  it('un Administrador ve el catalogo administrativo pero no la gestion de roles', () => {
    const paths = navigationForPrimaryRole('ADMINISTRATOR').map((item) => item.path)

    expect(paths).toContain('/admin/products/new')
    expect(paths).not.toContain('/admin/roles')
  })

  it('un Super Administrador ve tambien lo que se exige a un Administrador', () => {
    const paths = navigationForPrimaryRole('SUPER_ADMINISTRATOR').map((item) => item.path)

    expect(paths).toContain('/admin/products/new')
    expect(paths).toContain('/admin/roles')
  })

  it('un jugador no ve ningun acceso administrativo', () => {
    const paths = navigationForPrimaryRole('PLAYER').map((item) => item.path)

    expect(paths.some((path) => path.startsWith('/admin/'))).toBe(false)
  })

  /**
   * HU-41.10 (Management#312): Moderador, Administrador y Super Administrador
   * deben ver el acceso a la cola de moderacion; Jugador nunca.
   */
  it.each(['MODERATOR', 'ADMINISTRATOR', 'SUPER_ADMINISTRATOR'])(
    'el rol %s ve el acceso a la cola de moderacion de comentarios',
    (role) => {
      const paths = navigationForPrimaryRole(role).map((item) => item.path)

      expect(paths).toContain('/admin/comments/moderation')
    },
  )

  it('un jugador no ve el acceso a la cola de moderacion de comentarios', () => {
    const paths = navigationForPrimaryRole('PLAYER').map((item) => item.path)

    expect(paths).not.toContain('/admin/comments/moderation')
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
   * Con el alta server-side (ADR-004) `POST /api/accounts` ya NO exige
   * testimonio: es Account quien crea la identidad a partir del formulario. Por
   * eso `/register` es PUBLICA y muestra el formulario aunque no haya sesion;
   * exigir identidad antes rechazaria justo a quien todavia no tiene cuenta, que
   * es el fallo que introdujo la puerta al hosted UI ya retirada.
   */
  it('sin sesion, /recover muestra el primer paso de recuperacion', async () => {
    useSession.setState(ANONYMOUS_STATE)
    renderRoute('/recover')

    expect(await screen.findByRole('heading', { name: 'Recuperar contraseña' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
  })

  it('sin sesion, /register muestra el formulario directamente', async () => {
    useSession.setState(ANONYMOUS_STATE)
    const { router } = renderRoute('/register')

    expect(await screen.findByLabelText('Apodo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    // No hay puerta previa ni redireccion: la URL sigue siendo /register.
    expect(router.state.location.pathname).toBe('/register')
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

  it('/orders conserva el acceso mediante una redireccion SPA a /ecommerce', async () => {
    useSession.setState(AUTHENTICATED_STATE)
    const { router } = renderRoute('/orders')
    expect(await screen.findByRole('heading', { name: 'E-commerce' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecommerce')
    expect(useSession.getState().subject).toBe(AUTHENTICATED_STATE.subject)
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
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }

    // HU-05.4: "Mi Cuenta" ya no esta en la navegacion central.
    expect(screen.queryByRole('link', { name: 'Mi Cuenta' })).not.toBeInTheDocument()

    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /menú de cuenta/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gestionar roles' })).not.toBeInTheDocument()
  })

  it('/account monta "Mi cuenta" (HU-05.4) dentro del shell autenticado', async () => {
    useSession.setState(AUTHENTICATED_STATE)
    const { router } = renderRoute('/account')

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/account')
  })

  it('una URL manual de roles muestra 403 visual a quien no es Super Administrador', async () => {
    useSession.setState(AUTHENTICATED_STATE)
    renderRoute('/admin/roles')

    expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/403/)
  })

  it('el Super Administrador ve el acceso y abre la pantalla de roles', async () => {
    useSession.setState({
      ...AUTHENTICATED_STATE,
      roles: ['PLAYER', 'SUPER_ADMINISTRATOR'],
    })
    renderRoute('/admin/roles')

    expect(await screen.findByRole('heading', { name: 'Gestion de roles' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gestionar roles' })).toBeInTheDocument()
  })

  it('cerrar sesion elimina la sesion y vuelve al estado publico esperado', async () => {
    useSession.setState(AUTHENTICATED_STATE)
    const user = userEvent.setup()
    const { router } = renderRoute('/ecommerce')

    await screen.findByRole('heading', { name: 'E-commerce' })
    await user.click(screen.getByRole('button', { name: /menú de cuenta/i }))
    await user.click(screen.getByRole('menuitem', { name: /cerrar sesión/i }))

    expect(useSession.getState().subject).toBeNull()

    // HU-03 (CA-04): Cierre de sesion redirige a la pantalla de inicio de sesion (/login)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    })
    expect(router.state.location.pathname).toBe('/login')
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
    ['Comunidad', 'Nexus-Battle-Community', <CommunityPage key="community" />],
    ['Notificaciones', 'Nexus-Battle-Notifications', <NotificationsPage key="notifications" />],
  ])('%s declara su estado y nombra el servicio %s', (title, service, element) => {
    renderWithProviders(element)

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText(/todavia no esta implementada/u)).toBeInTheDocument()
    expect(screen.getByText(service)).toBeInTheDocument()
  })

  /**
   * "Mi Inventario" salio de esta lista con HU-27: ya no es un marcador de
   * posicion, sino la consulta paginada real del inventario (HU-27.3). La
   * cobertura de contenido vive en `player-inventory/PlayerInventoryPage.test.tsx`;
   * aqui basta comprobar que la pantalla ya no se declara pendiente.
   */
  it('Mi Inventario ya no es un marcador de posicion', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ items: [], page: 1, pageSize: 16, totalItems: 0, totalPages: 0 }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        ),
    )

    renderWithProviders(<PlayerInventoryPage />)

    expect(await screen.findByRole('heading', { name: 'Mi Inventario' })).toBeInTheDocument()
    expect(screen.queryByText(/todavia no esta implementada/u)).not.toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  /**
   * Commerce salio de esta lista con HU-58 (carrito) y HU-57 (vitrina). Lo que
   * sigue declarandose pendiente no es una pantalla, sino los campos que
   * Catalog todavia no publica.
   */
  it('Commerce presenta carrito y vitrina desde el contrato canonico', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.includes('/v1/catalog/products?')
            ? jsonResponse({ items: [showcaseProduct()], page: 1, pageSize: 16, total: 1 })
            : url.includes('/wishlist/')
              ? jsonResponse({
                  productId: showcaseProduct().productId,
                  sku: showcaseProduct().sku,
                  enDeseos: false,
                  adquirido: false,
                })
              : jsonResponse({ message: 'No hay carrito.' }, 404),
        ),
      ),
    )
    try {
      renderWithProviders(<CommercePage />)
      expect(screen.getByRole('heading', { name: 'Vitrina' })).toBeInTheDocument()
      expect(screen.queryByText('Tu carrito esta vacio.')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Carrito, 0 productos' }))
      expect(await screen.findByText('Tu carrito esta vacio.')).toBeInTheDocument()
      expect(await screen.findByText('Espada de hierro')).toBeInTheDocument()
      expect(
        screen.queryByText('No hay productos disponibles por el momento.'),
      ).not.toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
    }
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
