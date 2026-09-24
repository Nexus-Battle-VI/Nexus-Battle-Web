import { afterEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'

import { MissionReportPage } from './MissionReportPage'
import { ENROLLMENT_ID, lineOf, reportOf } from './fixtures'
import type { MissionReport } from './api'

/**
 * Pantalla del informe de mision (HU-74 + HU-09, Task HU-09.5).
 *
 * La direccion lleva SOLO la matricula: el informe es el del jugador del
 * testimonio, y esta pantalla no envia ningun identificador de jugador. El estado
 * de la consulta se delega en `QueryState`, asi que lo que se comprueba es que el
 * mensaje del servicio llega tal cual y que el panel recibe los datos derivados.
 */
const renderPage = (path = `/missions/reports/${ENROLLMENT_ID}`): void => {
  renderWithProviders(
    <Routes>
      <Route path="/missions/reports/:enrollmentId" element={<MissionReportPage />} />
    </Routes>,
    { route: path },
  )
}

const stubFetch = (report: MissionReport, status = 200): ReturnType<typeof vi.fn> => {
  const fetchImpl = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(report), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchImpl)

  return fetchImpl
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MissionReportPage — el informe y su experiencia (HU-09.5)', () => {
  it('pinta la mision con su dificultad y desenlace, y el panel de experiencia', async () => {
    stubFetch(
      reportOf({
        difficulty: 'HEROIC',
        experience: {
          defeats: 19,
          totalXp: 54,
          credited: 19,
          pending: 0,
          failed: 0,
          level: 3,
          currentXp: 657,
          maxLevel: 8,
          levelsGained: 1,
          leveledUp: true,
        },
        rewards: [lineOf({ status: 'CREDITED', quantity: 12 })],
      }),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Informe de misión' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('El Templo Olvidado · Heroica · Completada')).toBeInTheDocument()
    expect(screen.getByText('+54 XP')).toBeInTheDocument()
    expect(screen.getByText('Nivel 3')).toBeInTheDocument()
  })

  it('pide el informe de ESA matricula, y solo con el testimonio', async () => {
    const fetchImpl = stubFetch(reportOf())

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Informe de misión' })

    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/v1/missions/me/reports/${ENROLLMENT_ID}`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('un informe sin bloque de experiencia se dice, no se rellena con ceros', async () => {
    stubFetch(reportOf())

    renderPage()

    expect(
      await screen.findByText('Este informe no incluye el resumen de experiencia.'),
    ).toBeInTheDocument()
  })

  it('una mision en curso muestra el mensaje del servicio tal cual, sin reinterpretarlo', async () => {
    stubFetch(
      {
        statusCode: 404,
        code: 'REPORT_NOT_AVAILABLE',
        message: 'La misión sigue en curso. El reporte estará listo cuando termine.',
      } as unknown as MissionReport,
      404,
    )

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La misión sigue en curso. El reporte estará listo cuando termine.',
    )
  })
})
