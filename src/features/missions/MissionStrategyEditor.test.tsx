import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { AvailableHero } from '@/features/player-inventory/heroSelectionApi'
import { useSession } from '@/shared/session'
import { jsonResponse, MISSION_ID } from '@/test/missions-fixtures'
import { renderWithProviders } from '@/test/render'

import { MissionStrategyEditor } from './MissionStrategyEditor'

const HERO_ID = '7f3c2a9e-2d4b-4c1a-9e7f-1b2c3d4e5f60'
const ABILITY_ID = '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d'

const hero: AvailableHero = {
  heroId: HERO_ID,
  reference: 'hero-uno',
  subtype: 'MAGO_FUEGO',
  name: 'Heroína',
  imageUrl: '',
  lifecycleStatus: 'ACTIVE',
  baseStats: { power: 1, health: 30, defense: 4, attack: null, damage: null, healing: null },
  abilities: [{ reference: 'golpe-sku', name: 'Golpe especial' }],
  selected: false,
}

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('editor de rotaciones (HU-71.3)', () => {
  it('resuelve la habilidad de Catalog a productId y guarda la primera versión', async () => {
    useSession.setState({
      subject: 'sujeto-ana',
      accessToken: 'jwt-vigente',
      expiresAt: Date.now() + 900_000,
    })
    const onVersionChange = vi.fn()
    const savedBodies: unknown[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (url.includes('/strategies/') && init?.method === 'GET') {
          return Promise.resolve(
            jsonResponse(404, { code: 'STRATEGY_NOT_FOUND', message: 'Sin estrategia' }),
          )
        }
        if (url.endsWith('/catalog/products/golpe-sku')) {
          return Promise.resolve(
            jsonResponse(200, { productId: ABILITY_ID, type: 'HABILIDAD', name: 'Golpe especial' }),
          )
        }
        if (url.includes('/strategies/') && init?.method === 'PUT') {
          const body: unknown = JSON.parse(init.body as string)
          savedBodies.push(body)
          return Promise.resolve(
            jsonResponse(201, {
              missionId: MISSION_ID,
              heroId: HERO_ID,
              version: 1,
              rotations: (body as { rotations: unknown }).rotations,
              updatedAt: '2026-09-23T23:00:00Z',
            }),
          )
        }
        throw new Error(`Ruta inesperada: ${url}`)
      }),
    )
    const user = userEvent.setup()

    renderWithProviders(
      <MissionStrategyEditor
        missionId={MISSION_ID}
        hero={hero}
        onVersionChange={onVersionChange}
      />,
    )

    expect(
      await screen.findByText('Sin estrategia guardada: la IA usará ataque básico.'),
    ).toBeInTheDocument()
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Acción 1' }), ABILITY_ID)
    await user.click(screen.getByRole('button', { name: 'Guardar estrategia' }))

    await waitFor(() => {
      expect(savedBodies).toEqual([
        {
          expectedVersion: null,
          rotations: [{ priority: 'HIGH', steps: [{ kind: 'ABILITY', abilityId: ABILITY_ID }] }],
        },
      ])
      expect(onVersionChange).toHaveBeenCalledWith(1, true)
    })
  })
})
