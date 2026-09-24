import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { jsonResponse } from '@/test/missions-fixtures'

import {
  describeSaveFailure,
  fetchCatalogProduct,
  searchCatalogProducts,
} from './missionContentApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('API del editor de misiones', () => {
  it('explica al administrador por qué no se guardó', () => {
    expect(describeSaveFailure(new HttpError(401, 'Vencida.', null))).toMatch(/sesión venció/u)
    expect(describeSaveFailure(new HttpError(403, 'Sin permiso.', null))).toMatch(/segundo factor/u)
    expect(
      describeSaveFailure(
        new HttpError(400, 'El contenido de la mision no es valido: name.', null),
      ),
    ).toBe('El contenido de la mision no es valido: name.')
    expect(describeSaveFailure(new HttpError(503, 'Missions no responde.', null))).toBe(
      'Missions no responde.',
    )
    expect(describeSaveFailure('raro')).toBe('No se pudo guardar la misión.')
  })

  it('un producto que Catalog ya no conoce es null; otro fallo se propaga', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(404, { message: 'No existe.' }))
        .mockResolvedValueOnce(jsonResponse(500, { message: 'Catalog caído.' })),
    )

    await expect(fetchCatalogProduct('5b0c2c5e')).resolves.toBeNull()
    await expect(fetchCatalogProduct('5b0c2c5e')).rejects.toThrow('Catalog caído.')
  })

  it('la búsqueda pide la primera página del tipo y tolera una respuesta sin productos', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchCatalogProducts('reli', 'ITEM')).resolves.toEqual([])
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/catalog/products?page=1&query=reli&type=ITEM',
    )
  })
})
