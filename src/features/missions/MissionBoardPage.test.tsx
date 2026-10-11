import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSession } from '@/shared/session'
import { jsonResponse } from '@/test/missions-fixtures'
import { renderWithProviders } from '@/test/render'

import type { MissionCard } from './missionApi'
import { MissionBoardPage } from './MissionBoardPage'

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

const card = (overrides: Partial<MissionCard>): MissionCard => ({
  missionId: 'msn_templo_olvidado',
  name: 'El Templo Olvidado',
  category: 'STORY',
  summary: 'Un templo corrompido.',
  imageRef: 'mision-templo-olvidado',
  estimatedDuration: 'PT12H',
  recommendedPower: 40,
  highlightedRewards: [{ label: 'Experiencia' }],
  playerStatus: 'AVAILABLE',
  canEnroll: true,
  lockReason: null,
  activeEnrollmentId: null,
  ...overrides,
})

const BOARD = [
  card({}),
  card({
    missionId: 'msn_camara_sellada',
    name: 'La Cámara Sellada',
    playerStatus: 'LOCKED',
    canEnroll: false,
    lockReason: 'Completa «El Templo Olvidado».',
  }),
  card({
    missionId: 'msn_arena_caidos',
    name: 'La Arena de los Caídos',
    category: 'CHALLENGE',
    playerStatus: 'IN_PROGRESS',
    activeEnrollmentId: 'enr_1',
  }),
]

describe('tablón de misiones (remaster EN-031)', () => {
  let urls: string[]

  beforeEach(() => {
    useSession.setState({
      subject: 'sujeto-ana',
      accessToken: 'jwt-vigente',
      expiresAt: Date.now() + 900_000,
    })
    urls = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input)
        urls.push(url)
        if (url.includes('/v1/missions/me/active')) {
          return Promise.resolve(jsonResponse(200, { serverTime: '', items: [] }))
        }
        return Promise.resolve(jsonResponse(200, { items: BOARD }))
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    useSession.setState({ subject: null, accessToken: null, expiresAt: null })
  })

  it('muestra cada misión como tarjeta con su estado, su motivo de bloqueo y sus accesos', async () => {
    renderWithProviders(<MissionBoardPage />)

    const templo = await screen.findByRole('article', { name: 'El Templo Olvidado' })
    expect(within(templo).getByText('Disponible')).toBeInTheDocument()
    expect(
      within(templo).getByRole('link', { name: 'Ver detalle de El Templo Olvidado' }),
    ).toHaveAttribute('href', '/missions/msn_templo_olvidado')

    const camara = screen.getByRole('article', { name: 'La Cámara Sellada' })
    expect(within(camara).getByText('Completa «El Templo Olvidado».')).toBeInTheDocument()

    const arena = screen.getByRole('article', { name: 'La Arena de los Caídos' })
    expect(within(arena).getByRole('link', { name: 'Seguir la misión en curso' })).toHaveAttribute(
      'href',
      '/missions/progress/enr_1',
    )
  })

  it('las pestañas de categoría filtran con el mismo parámetro que el servicio ya admite', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MissionBoardPage />)
    await screen.findByRole('article', { name: 'El Templo Olvidado' })

    const tabs = screen.getByRole('group', { name: 'Categoría' })
    expect(within(tabs).getByRole('button', { name: 'Todas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(within(tabs).getByRole('button', { name: 'Desafío' }))

    expect(within(tabs).getByRole('button', { name: 'Desafío' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() => {
      expect(urls.some((url) => url.includes('/v1/missions?category=CHALLENGE'))).toBe(true)
    })
  })
})
