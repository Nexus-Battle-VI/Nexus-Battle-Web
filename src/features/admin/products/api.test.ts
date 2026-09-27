import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  describeSearchFailure,
  describeUpdateDetailsFailure,
  searchAdministeredProducts,
  updateProductDetails,
} from './api'

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const PRODUCT_ID = '3f2a1e4c-6b7d-4a8e-9c1f-2d3e4f5a6b7c'

const SUMMARY = {
  productId: PRODUCT_ID,
  sku: 'SKU-001',
  name: 'Espada de fuego',
  imageUrl: 'https://cdn.nexus.test/espada.png',
  type: 'ARMA',
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 500,
  premium: false,
  realMoneyPrice: null,
  availableUnits: 10,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchAdministeredProducts', () => {
  it('llama a GET /v1/admin/products con la pagina, sin otros parametros por defecto', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { items: [SUMMARY], page: 1, pageSize: 20, total: 1 }))
    vi.stubGlobal('fetch', fetchImpl)

    const page = await searchAdministeredProducts({ page: 1 })

    const [url] = fetchImpl.mock.calls[0] as [string]
    expect(url).toBe('/api/v1/admin/products?page=1')
    expect(page.items).toEqual([SUMMARY])
    expect(page.total).toBe(1)
  })

  it('incluye query, type y lifecycleStatus cuando se proporcionan', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { items: [], page: 2, pageSize: 20, total: 0 }))
    vi.stubGlobal('fetch', fetchImpl)

    await searchAdministeredProducts({
      page: 2,
      query: 'espada',
      type: 'ARMA',
      lifecycleStatus: 'SUSPENDED',
    })

    const [url] = fetchImpl.mock.calls[0] as [string]
    const parsed = new URL(url, 'https://nexus.test')
    expect(parsed.searchParams.get('page')).toBe('2')
    expect(parsed.searchParams.get('query')).toBe('espada')
    expect(parsed.searchParams.get('type')).toBe('ARMA')
    expect(parsed.searchParams.get('lifecycleStatus')).toBe('SUSPENDED')
  })

  it('recorta el termino de busqueda y omite un termino en blanco', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { items: [], page: 1, pageSize: 20, total: 0 }))
    vi.stubGlobal('fetch', fetchImpl)

    await searchAdministeredProducts({ page: 1, query: '   ' })

    const [url] = fetchImpl.mock.calls[0] as [string]
    expect(url).toBe('/api/v1/admin/products?page=1')
  })
})

describe('describeSearchFailure', () => {
  it('describe un error de red', () => {
    expect(describeSearchFailure(new Error('offline'))).toMatch(/conexion|conexión/iu)
  })

  it('describe 401 y 403 con sus mensajes propios', async () => {
    const fetchImpl401 = vi.fn().mockResolvedValue(jsonResponse(401, { message: 'no' }))
    vi.stubGlobal('fetch', fetchImpl401)
    await expect(searchAdministeredProducts({ page: 1 })).rejects.toMatchObject({ status: 401 })

    const fetchImpl403 = vi.fn().mockResolvedValue(jsonResponse(403, { message: 'no' }))
    vi.stubGlobal('fetch', fetchImpl403)

    try {
      await searchAdministeredProducts({ page: 1 })
    } catch (error) {
      expect(describeSearchFailure(error)).toMatch(/permisos/iu)
    }
  })
})

describe('updateProductDetails', () => {
  it('llama a PATCH /v1/admin/products/:id/details con el subconjunto enviado', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        productId: PRODUCT_ID,
        name: 'Espada de hielo',
        type: 'ARMA',
        printRun: 10,
        printRunMode: 'LIMITED',
        availableUnits: 10,
        lifecycleStatus: 'ACTIVE',
        creditsPrice: 500,
        premium: false,
      }),
    )
    vi.stubGlobal('fetch', fetchImpl)

    const updated = await updateProductDetails(PRODUCT_ID, { name: 'Espada de hielo' })

    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/v1/admin/products/${PRODUCT_ID}/details`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Espada de hielo' }),
      }),
    )
    expect(updated.name).toBe('Espada de hielo')
  })
})

describe('describeUpdateDetailsFailure', () => {
  const failureCase = async (status: number): Promise<unknown> => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(status, { message: 'detalle' }))
    vi.stubGlobal('fetch', fetchImpl)

    try {
      await updateProductDetails(PRODUCT_ID, { name: 'x' })
      throw new Error('se esperaba que la peticion fallara')
    } catch (error) {
      return error
    }
  }

  it('404 dice que el producto ya no existe', async () => {
    const error = await failureCase(404)
    expect(describeUpdateDetailsFailure(error)).toMatch(/no existe/iu)
  })

  it('409 dice que otra modificacion concurrente ocurrio', async () => {
    const error = await failureCase(409)
    expect(describeUpdateDetailsFailure(error)).toMatch(/otro ajuste|otra/iu)
  })

  it('503 dice que no se pudo comprobar el segundo factor', async () => {
    const error = await failureCase(503)
    expect(describeUpdateDetailsFailure(error)).toMatch(/segundo factor/iu)
  })

  it('un error que no es HttpError describe un fallo de red', () => {
    expect(describeUpdateDetailsFailure(new Error('offline'))).toMatch(/conexion|conexión/iu)
  })
})
