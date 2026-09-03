import { afterEach, describe, expect, it, vi } from 'vitest'

import { httpClient, HttpError } from '@/lib/http'

import { describeSelectionFailure, fetchHeroSelection, selectHero } from './heroSelectionApi'

describe('Cliente de selección de héroe (HU-07)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * El caso que da sentido a este módulo: 404 significa «todavía no has
   * elegido», que es un estado normal de la primera visita. Tratarlo como error
   * enseñaría un mensaje rojo a quien simplemente acaba de entrar.
   */
  it('un 404 al consultar la selección devuelve null, no un error', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValue(new HttpError(404, 'No hay', null))

    await expect(fetchHeroSelection()).resolves.toBeNull()
  })

  /** CONTROL del caso anterior: cualquier otro fallo sí se propaga. */
  it('un 503 al consultar la selección se propaga', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValue(new HttpError(503, 'Catalog caído', null))

    await expect(fetchHeroSelection()).rejects.toBeInstanceOf(HttpError)
  })

  it('preparar un héroe envía solo la referencia, nunca el jugador', async () => {
    const request = vi.spyOn(httpClient, 'request').mockResolvedValue(undefined)

    await selectHero('guerrero-tanque')

    expect(request).toHaveBeenCalledWith('/inventories/me/heroes/selection', {
      method: 'PUT',
      body: { heroReference: 'guerrero-tanque' },
    })
  })

  describe('cada fallo significa una cosa distinta', () => {
    it('404 es que el héroe salió del inventario', () => {
      expect(describeSelectionFailure(new HttpError(404, 'x', null))).toMatch(
        /ya no está en tu inventario/i,
      )
    })

    it('409 conserva el motivo del servicio', () => {
      expect(
        describeSelectionFailure(new HttpError(409, 'No está en el catálogo vigente.', null)),
      ).toBe('No está en el catálogo vigente.')
    })

    it('503 no se confunde con un problema del héroe', () => {
      expect(describeSelectionFailure(new HttpError(503, 'x', null))).toMatch(
        /catálogo no está disponible/i,
      )
    })

    it('un fallo desconocido no inventa una causa', () => {
      expect(describeSelectionFailure(new Error('boom'))).toMatch(/No se pudo preparar el héroe/i)
    })
  })
})
