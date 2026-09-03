import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { equipItemOnHero, fetchHeroEquipment } from './api'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const EQUIPMENT = {
  hero: {
    heroId: 'p',
    reference: 'guerrero-tanque',
    subtype: 'GUERRERO_TANQUE',
    name: 'GT',
    imageUrl: 'x',
  },
  equipment: { weapons: [], armor: {}, items: [] },
  baseStats: { power: 1, health: 1, defense: 1, attack: 1, damage: null, healing: null },
  effectiveStats: { power: 1, health: 1, defense: 1, attack: 1, damage: null, healing: null },
  deltas: [],
  activeEffects: [],
}

describe('equipment api', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(jsonResponse(EQUIPMENT))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('consulta el equipamiento del héroe escapando la referencia', async () => {
    await fetchHeroEquipment('guerrero tanque')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/inventories/me/heroes/guerrero%20tanque/equipment',
      expect.anything(),
    )
  })

  it('equipa con PUT y el cuerpo lleva solo la referencia del producto', async () => {
    await equipItemOnHero({
      heroReference: 'guerrero-tanque',
      slot: 'WEAPON_1',
      productReference: 'espada-de-fuego',
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; body: string }]
    expect(url).toBe('/api/inventories/me/heroes/guerrero-tanque/equipment/WEAPON_1')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ productReference: 'espada-de-fuego' })
  })
})
