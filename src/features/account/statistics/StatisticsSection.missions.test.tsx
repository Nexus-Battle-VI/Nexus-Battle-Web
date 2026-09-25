import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { useSession } from '@/shared/session'
import { jsonResponse } from '@/test/missions-fixtures'
import { renderWithProviders } from '@/test/render'

import { StatisticsSection } from './StatisticsSection'

const signIn = (): void => {
  useSession.setState({
    subject: 'sujeto-ana',
    accessToken: 'jwt-vigente',
    expiresAt: Date.now() + 900_000,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('logros de Missions en Mi cuenta (HU-76.3)', () => {
  it('muestra solo logros obtenidos y distingue el reconocimiento cosmético pendiente', async () => {
    signIn()
    const fetchSpy = vi.fn(() =>
      Promise.resolve(
        jsonResponse(200, {
          items: [
            {
              achievementId: 'ach_cazador',
              name: 'Cazador de sombras',
              criterion: 'ALL_MASTERS_DEFEATED',
              status: 'UNLOCKED',
              progress: { current: 2, target: 2 },
              unlockedAt: '2026-09-21T10:00:00Z',
              recognition: {
                kind: 'COSMETIC_PRODUCT',
                name: 'Capa de sombras',
                status: 'PENDING',
              },
            },
            {
              achievementId: 'ach_coleccionista',
              name: 'Coleccionista',
              criterion: 'ALL_MASTER_EPICS',
              status: 'IN_PROGRESS',
              progress: { current: 1, target: 3 },
              unlockedAt: null,
              recognition: { kind: 'BADGE', name: 'Insignia', status: null },
            },
          ],
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchSpy)

    renderWithProviders(<StatisticsSection />)

    expect(await screen.findByText('Cazador de sombras')).toBeInTheDocument()
    expect(screen.queryByText('Coleccionista')).not.toBeInTheDocument()
    expect(screen.getByText(/Capa de sombras · Entrega pendiente/u)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Partidas jugadas' })).toBeInTheDocument()
    expect(screen.getAllByText('Aún no disponible')).toHaveLength(2)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/missions/me/achievements',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer jwt-vigente' }),
      }),
    )
  })

  it('un fallo de Missions afecta solo al bloque de logros', async () => {
    signIn()
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(jsonResponse(503, { message: 'No se pudieron consultar los logros.' })),
      ),
    )

    renderWithProviders(<StatisticsSection />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron consultar los logros.',
    )
    expect(screen.getByRole('heading', { name: 'Victorias' })).toBeInTheDocument()
    expect(screen.getAllByText('Aún no disponible')).toHaveLength(2)
  })
})
