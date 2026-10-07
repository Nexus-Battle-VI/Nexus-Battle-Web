import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { renderWithProviders } from '@/test/render'

import { ProductManagementPage } from './ProductManagementPage'
import type {
  AdminProductPage,
  AdminProductSearchParams,
  AdminProductSummary,
  AdministeredProduct,
  UpdateProductDetailsRequest,
} from './api'

type SearchFn = (
  params: AdminProductSearchParams,
  signal?: AbortSignal,
) => Promise<AdminProductPage>

type StatusFn = (
  productId: string,
  status: 'ACTIVE' | 'SUSPENDED',
  reason: string,
) => Promise<AdministeredProduct>

type DetailsFn = (
  productId: string,
  request: UpdateProductDetailsRequest,
) => Promise<AdministeredProduct>

const summary = (overrides: Partial<AdminProductSummary> = {}): AdminProductSummary => ({
  productId: '5f2a1c9d-7b3e-4a11-9c5d-2e8f0a6b4c37',
  sku: 'SKU-001',
  name: 'Espada de Fuego',
  imageUrl: 'https://cdn.nexus.test/espada.png',
  type: 'ARMA',
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 500,
  premium: false,
  realMoneyPrice: null,
  availableUnits: 10,
  attributes: { values: { dropChanceBasisPoints: 200 } },
  ...overrides,
})

const administered = (
  base: AdminProductSummary,
  overrides: Partial<AdministeredProduct> = {},
): AdministeredProduct => ({
  productId: base.productId,
  name: base.name,
  type: base.type,
  printRun: 150,
  printRunMode: 'LIMITED',
  availableUnits: base.availableUnits,
  lifecycleStatus: base.lifecycleStatus,
  creditsPrice: base.creditsPrice,
  premium: base.premium,
  ...overrides,
})

const page = (
  items: readonly AdminProductSummary[],
  overrides: Partial<AdminProductPage> = {},
): AdminProductPage => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  ...overrides,
})

describe('ProductManagementPage (Gestion de productos)', () => {
  it('busca sin filtros por defecto y muestra el listado, excluyendo HABILIDAD', async () => {
    const onSearch = vi.fn<SearchFn>(() => Promise.resolve(page([summary()])))

    renderWithProviders(<ProductManagementPage onSearch={onSearch} />)

    expect(await screen.findByText('Espada de Fuego')).toBeInTheDocument()
    const list = screen.getByTestId('product-management-list')
    expect(within(list).getByText(/SKU-001/)).toBeInTheDocument()
    expect(within(list).getByText('Activo')).toBeInTheDocument()
    expect(onSearch.mock.calls[0]?.[0]).toEqual({ page: 1, excludeType: 'HABILIDAD' })
  })

  it('no hay productos para estos filtros', async () => {
    const onSearch = vi.fn<SearchFn>(() => Promise.resolve(page([])))

    renderWithProviders(<ProductManagementPage onSearch={onSearch} />)

    expect(await screen.findByText('No hay productos para estos filtros.')).toBeInTheDocument()
  })

  it('describe el fallo cuando el servicio responde 403 (sin segundo factor)', async () => {
    const onSearch = vi.fn<SearchFn>(() =>
      Promise.reject(new HttpError(403, 'Forbidden', { message: 'Forbidden' })),
    )

    renderWithProviders(<ProductManagementPage onSearch={onSearch} />)

    expect(await screen.findByText(/segundo factor verificado/i)).toBeInTheDocument()
  })

  it('envia el termino de busqueda tras el retraso de 300 ms', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn<SearchFn>(() => Promise.resolve(page([summary()])))

    renderWithProviders(<ProductManagementPage onSearch={onSearch} />)
    await screen.findByText('Espada de Fuego')

    await user.type(screen.getByLabelText('Buscar por nombre'), 'fuego')

    await waitFor(
      () => {
        expect(onSearch.mock.calls.some((call) => call[0].query === 'fuego')).toBe(true)
      },
      { timeout: 2_000 },
    )
  })

  it('el filtro de tipo se envia al servicio', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn<SearchFn>(() => Promise.resolve(page([summary()])))

    renderWithProviders(<ProductManagementPage onSearch={onSearch} />)
    await screen.findByText('Espada de Fuego')

    await user.selectOptions(screen.getByLabelText('Tipo de producto'), 'ARMA')

    await waitFor(() => {
      expect(onSearch.mock.calls.some((call) => call[0].type === 'ARMA')).toBe(true)
    })
  })

  it('el filtro de estado se envia al servicio', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn<SearchFn>(() => Promise.resolve(page([summary()])))

    renderWithProviders(<ProductManagementPage onSearch={onSearch} />)
    await screen.findByText('Espada de Fuego')

    await user.selectOptions(screen.getByLabelText('Estado'), 'SUSPENDED')

    await waitFor(() => {
      expect(onSearch.mock.calls.some((call) => call[0].lifecycleStatus === 'SUSPENDED')).toBe(true)
    })
  })

  it('Editar abre el formulario, guarda con onUpdateDetails y refresca la lista', async () => {
    const user = userEvent.setup()
    const active = summary()
    const onSearch = vi.fn<SearchFn>(() => Promise.resolve(page([active])))
    const onUpdateDetails = vi.fn<DetailsFn>(() =>
      Promise.resolve(administered(active, { name: 'Espada de Hielo' })),
    )

    renderWithProviders(
      <ProductManagementPage onSearch={onSearch} onUpdateDetails={onUpdateDetails} />,
    )
    await screen.findByText('Espada de Fuego')

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const nameField = screen.getByLabelText('Nombre del producto')
    await user.clear(nameField)
    await user.type(nameField, 'Espada de Hielo')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onUpdateDetails).toHaveBeenCalledWith(active.productId, { name: 'Espada de Hielo' })
    expect(await screen.findByText(/actualizado/i)).toBeInTheDocument()
  })

  it('Eliminar exige un motivo de al menos 10 caracteres', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn<SearchFn>(() => Promise.resolve(page([summary()])))
    const onUpdateStatus = vi.fn<StatusFn>()

    renderWithProviders(
      <ProductManagementPage onSearch={onSearch} onUpdateStatus={onUpdateStatus} />,
    )
    await screen.findByText('Espada de Fuego')

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await user.type(screen.getByLabelText(/motivo/i), 'corto')
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))

    expect(
      await screen.findByText('El motivo es obligatorio, mínimo 10 caracteres.'),
    ).toBeInTheDocument()
    expect(onUpdateStatus).not.toHaveBeenCalled()
  })

  it('Eliminar con motivo valido suspende el producto (borrado logico)', async () => {
    const user = userEvent.setup()
    const active = summary()
    const onSearch = vi.fn<SearchFn>(() => Promise.resolve(page([active])))
    const onUpdateStatus = vi.fn<StatusFn>(() =>
      Promise.resolve(administered(active, { lifecycleStatus: 'SUSPENDED' })),
    )

    renderWithProviders(
      <ProductManagementPage onSearch={onSearch} onUpdateStatus={onUpdateStatus} />,
    )
    await screen.findByText('Espada de Fuego')

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await user.type(screen.getByLabelText(/motivo/i), 'Producto descontinuado por el fabricante.')
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))

    await waitFor(() => {
      expect(onUpdateStatus).toHaveBeenCalledWith(
        active.productId,
        'SUSPENDED',
        'Producto descontinuado por el fabricante.',
      )
    })
    expect(await screen.findByText('Estado actualizado.')).toBeInTheDocument()
  })

  it('Restaurar un producto suspendido llama a onUpdateStatus con ACTIVE', async () => {
    const user = userEvent.setup()
    const suspended = summary({ lifecycleStatus: 'SUSPENDED' })
    const onSearch = vi.fn<SearchFn>(() => Promise.resolve(page([suspended])))
    const onUpdateStatus = vi.fn<StatusFn>(() =>
      Promise.resolve(administered(suspended, { lifecycleStatus: 'ACTIVE' })),
    )

    renderWithProviders(
      <ProductManagementPage onSearch={onSearch} onUpdateStatus={onUpdateStatus} />,
    )
    await screen.findByText('Espada de Fuego')
    expect(
      within(screen.getByTestId('product-management-list')).getByText('Suspendido'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restaurar' }))
    await user.type(screen.getByLabelText(/motivo/i), 'El fabricante volvio a producirlo.')
    await user.click(screen.getByRole('button', { name: 'Confirmar restauración' }))

    await waitFor(() => {
      expect(onUpdateStatus).toHaveBeenCalledWith(
        suspended.productId,
        'ACTIVE',
        'El fabricante volvio a producirlo.',
      )
    })
  })

  it('enlaza a "Crear producto" y a "Tiraje" sin duplicar esas rutas', async () => {
    const active = summary()
    const onSearch = vi.fn<SearchFn>(() => Promise.resolve(page([active])))

    renderWithProviders(<ProductManagementPage onSearch={onSearch} />)
    await screen.findByText('Espada de Fuego')

    expect(screen.getByRole('link', { name: 'Crear producto' })).toHaveAttribute(
      'href',
      '/admin/products/new',
    )
    expect(screen.getByRole('link', { name: 'Tiraje' })).toHaveAttribute(
      'href',
      `/admin/products/${active.productId}/inventory`,
    )
  })

  it('pagina siguiente pide la pagina 2 al servicio', async () => {
    const user = userEvent.setup()
    const items = Array.from({ length: 20 }, (_unused, index) =>
      summary({ productId: `producto-${String(index)}`, name: `Producto ${String(index)}` }),
    )
    const onSearch = vi.fn<SearchFn>(() => Promise.resolve(page(items, { total: 25 })))

    renderWithProviders(<ProductManagementPage onSearch={onSearch} />)
    await screen.findByText('Producto 0')

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await waitFor(() => {
      expect(onSearch.mock.calls.some((call) => call[0].page === 2)).toBe(true)
    })
  })
})
