import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RequireAdministrator } from '@/app/RequireAdministrator'
import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'

import { fetchModelVersions, startModelTraining } from './api'
import { ModelAdminPage } from './ModelAdminPage'

vi.mock('./api', () => ({
  fetchModelVersions: vi.fn(),
  startModelTraining: vi.fn(),
}))

const versions = [
  {
    versionId: 'activa',
    state: 'ACTIVE' as const,
    inExperiment: false,
    accuracy: 0.86,
    macroF1: 0.8,
    useful: 2,
    notUseful: 1,
    precision: 2 / 3,
    perIntentF1: [
      { label: 'es:regla', score: 0.5 },
      { label: 'es:turno', score: 1 },
    ],
    confusion: [
      { actual: 'es:regla', predicted: 'es:turno', count: 1 },
      { actual: 'es:turno', predicted: 'es:turno', count: 2 },
    ],
  },
  {
    versionId: 'candidata',
    state: 'CANDIDATE' as const,
    inExperiment: false,
    accuracy: 0.4,
    macroF1: 0.3,
    useful: 0,
    notUseful: 0,
    precision: null,
    perIntentF1: [],
    confusion: [],
  },
]

describe('ModelAdminPage', () => {
  beforeEach(() => {
    useSession.setState({ roles: ['ADMINISTRATOR'] })
    vi.mocked(fetchModelVersions).mockReset()
    vi.mocked(startModelTraining).mockReset()
  })

  it('muestra la activa, la candidata y la precisión', async () => {
    vi.mocked(fetchModelVersions).mockResolvedValue(versions)
    renderWithProviders(<ModelAdminPage />)

    expect(await screen.findByRole('heading', { name: 'Versión activa' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Versión candidata' })).toBeInTheDocument()
    expect(screen.getByText(/66\.7%/)).toBeInTheDocument()
    expect(screen.getByText(/es:turno 100%/)).toBeInTheDocument()
    expect(screen.getByText(/es:regla se leyó como es:turno \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Ninguna candidata está en prueba/)).toBeInTheDocument()
  })

  it('lanza el reentrenamiento y muestra el rechazo de la validación', async () => {
    vi.mocked(fetchModelVersions).mockResolvedValue(versions)
    vi.mocked(startModelTraining).mockResolvedValue({
      started: true,
      promoted: false,
      versionId: 'candidata',
      accuracy: 0.4,
      macroF1: 0.3,
      singleExampleLabels: ['es:rara'],
    })
    const user = userEvent.setup()
    renderWithProviders(<ModelAdminPage />)
    expect(await screen.findByRole('heading', { name: 'Versión activa' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reentrenar' }))

    expect(startModelTraining).toHaveBeenCalledOnce()
    expect(await screen.findByText(/La validación no autorizó la promoción/)).toBeInTheDocument()
    expect(screen.getByText(/Clases con un solo ejemplo: es:rara/)).toBeInTheDocument()
    expect(screen.getByText(/Útiles 2/)).toBeInTheDocument()
  })

  it('un jugador no entra al panel', () => {
    useSession.setState({ roles: ['PLAYER'] })
    renderWithProviders(
      <RequireAdministrator>
        <ModelAdminPage />
      </RequireAdministrator>,
    )

    expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
  })
})
