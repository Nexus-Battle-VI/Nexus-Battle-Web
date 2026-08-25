import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'

import { renderWithProviders } from '@/test/render'
import { AppLayout } from './AppLayout'
import { NotFoundPage } from './NotFoundPage'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { QueryState } from '@/components/ui/QueryState'
import { HttpError } from '@/lib/http'
import { currentAccessToken, useSession } from '@/shared/session'
import { createQueryClient } from '@/shared/query-client'

describe('AppLayout', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      fetchMock.mockResolvedValue(
        new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('expone una entrada de navegacion por bounded context', () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<p>contenido</p>} />
        </Route>
      </Routes>,
    )

    const nav = screen.getByRole('navigation', { name: 'Principal' })

    for (const label of [
      'Catalogo',
      'Inventario',
      'Comunidad',
      'Pedidos',
      'Cuenta',
      'Notificaciones',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }

    expect(nav).toBeInTheDocument()
  })

  it('renderiza el contenido de la ruta activa', () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<p>contenido de prueba</p>} />
        </Route>
      </Routes>,
    )

    expect(screen.getByText('contenido de prueba')).toBeInTheDocument()
  })
})

describe('NotFoundPage', () => {
  it('informa de la ruta inexistente y ofrece volver', () => {
    renderWithProviders(<NotFoundPage />)

    expect(screen.getByText('Pagina no encontrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al catalogo' })).toHaveAttribute(
      'href',
      '/catalog',
    )
  })
})

describe('Button', () => {
  it('invoca el manejador al pulsarse', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    renderWithProviders(<Button onClick={onClick}>Confirmar</Button>)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('durante la carga se deshabilita y lo comunica a las tecnologias de apoyo', () => {
    renderWithProviders(<Button loading>Confirmar</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveTextContent('Procesando...')
  })

  it('no invoca el manejador cuando esta deshabilitado', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    renderWithProviders(
      <Button disabled onClick={onClick}>
        Confirmar
      </Button>,
    )
    await user.click(screen.getByRole('button'))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('admite las variantes declaradas', () => {
    const { rerender } = renderWithProviders(<Button variant="danger">Cancelar</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-danger')

    rerender(<Button variant="secondary">Volver</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-surface-raised')
  })
})

describe('Card', () => {
  it('muestra titulo, descripcion y contenido', () => {
    renderWithProviders(
      <Card title="Catalogo" description="Productos disponibles">
        <p>contenido</p>
      </Card>,
    )

    expect(screen.getByRole('heading', { name: 'Catalogo' })).toBeInTheDocument()
    expect(screen.getByText('Productos disponibles')).toBeInTheDocument()
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('funciona sin titulo ni descripcion', () => {
    renderWithProviders(
      <Card>
        <p>solo contenido</p>
      </Card>,
    )

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText('solo contenido')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('traduce el estado del dominio', () => {
    renderWithProviders(<StatusBadge status="PUBLISHED" />)

    expect(screen.getByText('Publicado')).toBeInTheDocument()
  })

  it('muestra el valor original ante un estado desconocido', () => {
    renderWithProviders(<StatusBadge status="ESTADO_NUEVO" />)

    expect(screen.getByText('ESTADO_NUEVO')).toBeInTheDocument()
  })
})

describe('QueryState', () => {
  it('muestra el estado de carga', () => {
    renderWithProviders(
      <QueryState isLoading error={null}>
        <p>contenido</p>
      </QueryState>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Cargando...')
  })

  it('describe un HttpError con su mensaje', () => {
    renderWithProviders(
      <QueryState isLoading={false} error={new HttpError(404, 'No existe el producto.', null)}>
        <p>contenido</p>
      </QueryState>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('No existe el producto.')
  })

  it('describe un Error generico', () => {
    renderWithProviders(
      <QueryState isLoading={false} error={new Error('fallo de red')}>
        <p>contenido</p>
      </QueryState>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('fallo de red')
  })

  it('describe un rechazo que no es Error', () => {
    renderWithProviders(
      <QueryState isLoading={false} error="roto">
        <p>contenido</p>
      </QueryState>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ocurrio un error inesperado al consultar el servicio.',
    )
  })

  it('distingue el estado vacio del error', () => {
    renderWithProviders(
      <QueryState isLoading={false} error={null} isEmpty emptyMessage="Sin resultados.">
        <p>contenido</p>
      </QueryState>,
    )

    expect(screen.getByText('Sin resultados.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra el contenido cuando no hay carga, error ni vacio', () => {
    renderWithProviders(
      <QueryState isLoading={false} error={null}>
        <p>contenido</p>
      </QueryState>,
    )

    expect(screen.getByText('contenido')).toBeInTheDocument()
  })
})

describe('useSession', () => {
  const tokens = {
    accessToken: 'token-de-acceso',
    idToken: 'token-de-identidad',
    refreshToken: null,
    expiresAt: Date.now() + 900_000,
  }

  const claims = {
    subject: 'sujeto-ana',
    email: 'ana@nexus.test',
    displayName: 'Ana Ramirez',
    roles: ['PLAYER'],
  }

  afterEach(() => {
    useSession.setState({
      subject: null,
      email: null,
      displayName: null,
      roles: [],
      accessToken: null,
      expiresAt: null,
    })
  })

  it('nace sin sesion', () => {
    expect(useSession.getState().subject).toBeNull()
    expect(useSession.getState().accessToken).toBeNull()
  })

  it('registra la identidad que el proveedor verifico', () => {
    useSession.getState().establish(tokens, claims)

    expect(useSession.getState()).toMatchObject({
      subject: 'sujeto-ana',
      email: 'ana@nexus.test',
      displayName: 'Ana Ramirez',
      roles: ['PLAYER'],
    })
  })

  it('entrega el testimonio vigente para las peticiones salientes', () => {
    useSession.getState().establish(tokens, claims)

    expect(currentAccessToken()).toBe('token-de-acceso')
  })

  /**
   * Enviar un token vencido produce un 401 que parece un fallo de permisos
   * cuando en realidad es una sesion que expiro. Es mejor no enviarlo.
   */
  it('no entrega un testimonio caducado', () => {
    useSession.getState().establish({ ...tokens, expiresAt: Date.now() - 1 }, claims)

    expect(currentAccessToken()).toBeNull()
  })

  /**
   * Sin proveedor configurado no hay sesion posible, y la interfaz debe poder
   * decirlo en lugar de ofrecer un boton que no funciona.
   */
  it('declara que no hay autenticacion disponible sin proveedor', () => {
    expect(useSession.getState().authenticationAvailable).toBe(false)
  })
})

describe('createQueryClient', () => {
  it('no reintenta los errores del cliente', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry

    expect(typeof retry).toBe('function')

    const shouldRetry = retry as (failureCount: number, error: Error) => boolean

    expect(shouldRetry(0, new HttpError(404, 'no existe', null))).toBe(false)
    expect(shouldRetry(0, new HttpError(400, 'invalido', null))).toBe(false)
  })

  it('reintenta un fallo del servicio hasta dos veces', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: Error,
    ) => boolean

    expect(retry(0, new HttpError(500, 'fallo', null))).toBe(true)
    expect(retry(1, new HttpError(500, 'fallo', null))).toBe(true)
    expect(retry(2, new HttpError(500, 'fallo', null))).toBe(false)
  })
})
