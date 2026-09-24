import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { difficultiesWithoutProgress, jsonResponse, MISSION_ID } from '@/test/missions-fixtures'
import { renderWithProviders } from '@/test/render'

import type { DifficultyLevel } from './api'
import { MissionDifficultyPicker } from './MissionDifficultyPicker'

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

/** Quien monte el selector (la matricula de HU-70.3) guarda el nivel elegido. */
const Harness = (): React.JSX.Element => {
  const [value, setValue] = useState<DifficultyLevel | null>(null)

  return (
    <>
      <MissionDifficultyPicker missionId={MISSION_ID} value={value} onChange={setValue} />
      <p>{`Elegido: ${value ?? 'ninguno'}`}</p>
    </>
  )
}

describe('MissionDifficultyPicker (HU-75.3)', () => {
  it('cargando: lo anuncia mientras Missions responde', async () => {
    signIn()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    )

    renderWithProviders(<Harness />)

    expect(await screen.findByRole('status')).toHaveTextContent('Cargando...')
  })

  it('contenido: presenta lo que responde Missions y permite elegir un nivel libre', async () => {
    signIn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, difficultiesWithoutProgress())),
    )
    const user = userEvent.setup()

    renderWithProviders(<Harness />)
    await user.click(await screen.findByRole('radio', { name: 'Normal' }))

    expect(screen.getByRole('radio', { name: 'Normal' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Elegido: NORMAL')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Heroico' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('error: muestra el mensaje del servicio y ningun nivel', async () => {
    signIn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(503, {
          statusCode: 503,
          code: 'DEPENDENCY_UNAVAILABLE',
          message: 'No se pudo consultar el progreso de dificultad. Intenta de nuevo.',
        }),
      ),
    )

    renderWithProviders(<Harness />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo consultar el progreso de dificultad. Intenta de nuevo.',
    )
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('vacio: se distingue del error', async () => {
    signIn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { missionId: MISSION_ID, items: [] })),
    )

    renderWithProviders(<Harness />)

    expect(await screen.findByText('Esta misión no ofrece niveles de dificultad.')).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('sin sesion no consulta a Missions y lo dice', async () => {
    const fetchImpl = vi.fn()
    vi.stubGlobal('fetch', fetchImpl)

    renderWithProviders(<Harness />)

    expect(
      screen.getByText('Inicia sesión para ver y elegir la dificultad de la misión.'),
    ).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('guarda la respuesta bajo una clave propia de la identidad y la mision', async () => {
    signIn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, difficultiesWithoutProgress())),
    )

    const { queryClient } = renderWithProviders(<Harness />)
    const key = queryKeys.missions.difficulties('sujeto-ana', MISSION_ID)

    expect(key).toEqual(['missions', 'difficulties', 'sujeto-ana', MISSION_ID])
    await waitFor(() => {
      expect(queryClient.getQueryData(key)).toEqual(difficultiesWithoutProgress())
    })
  })
})
