import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'

import { useSession } from '@/shared/session'
import { jsonResponse } from '@/test/missions-fixtures'
import { renderWithProviders } from '@/test/render'

import type { MissionReport as ExperienceReport } from './api'
import { ENROLLMENT_ID, lineOf, reportOf } from './fixtures'
import type { MissionReport } from './missionReportApi'
import { MissionReportPage } from './MissionReportPage'

const report: MissionReport = {
  schemaVersion: 1,
  enrollmentId: 'enr_primera',
  mission: { missionId: 'msn_uno', name: 'El templo', category: 'STORY', difficulty: 'NORMAL' },
  summary: {
    outcome: 'COMPLETED',
    outcomeReason: null,
    hero: { heroId: 'hero_uno', name: 'Heroína', subtype: null },
    startedAt: '2026-09-20T10:00:00Z',
    finishedAt: '2026-09-21T10:00:00Z',
    simulatedDuration: 'PT1H',
  },
  combatStats: {
    encountersCompleted: 2,
    encountersTotal: 2,
    totalTurns: 8,
    damageDealt: 80,
    damageTaken: null,
    criticalEffects: 0,
    skillsUsed: [],
  },
  enemies: {
    defeated: [{ enemyRef: 'sombra', name: 'Sombra', count: 2 }],
    boss: { enemyRef: 'jefe', name: 'Guardián', defeated: true },
    masters: [],
  },
  objectives: [{ id: 'obj_uno', text: 'Vencer al jefe', primary: true, met: true, bonus: null }],
  rewards: [
    {
      kind: 'CREDITS',
      reference: null,
      name: '50 créditos',
      rarity: null,
      quantity: 50,
      status: 'PENDING',
      source: 'HU-10',
    },
  ],
  generatedAt: '2026-09-21T10:00:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('reporte de misión', () => {
  it('muestra datos ausentes como tales y una recompensa pendiente sin fingir su entrega', async () => {
    useSession.setState({
      subject: 'sujeto-ana',
      accessToken: 'jwt-vigente',
      expiresAt: Date.now() + 900_000,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(200, report))),
    )

    renderWithProviders(
      <Routes>
        <Route path="/missions/reports/:enrollmentId" element={<MissionReportPage />} />
      </Routes>,
      { route: '/missions/reports/enr_primera' },
    )

    expect(await screen.findByRole('heading', { name: 'Reporte: El templo' })).toBeInTheDocument()
    expect(screen.getByText('Sin dato')).toBeInTheDocument()
    expect(
      screen.getByText(/Créditos: 50 créditos\s*·\s*Pendiente de entrega/u),
    ).toBeInTheDocument()
    expect(screen.queryByText(/50 créditos\s*·\s*Entregada/u)).not.toBeInTheDocument()
    // P-J10: la cantidad de un crédito o una experiencia no se escribe como «× N».
    expect(screen.queryByText(/× 50/u)).not.toBeInTheDocument()
  })
})

/**
 * La experiencia de HU-09 (Task HU-09.5) dentro del reporte de HU-74. La dirección
 * lleva SOLO la matrícula: el reporte es el del jugador del testimonio. `reportOf`
 * arma lo que lee el panel de experiencia; aquí se completa con las secciones de
 * HU-74 que el servicio siempre envía, porque esta pantalla las pinta todas.
 */
const REPORT_SECTIONS = {
  combatStats: {
    encountersCompleted: 5,
    encountersTotal: 5,
    totalTurns: 26,
    damageDealt: 39,
    damageTaken: 1,
    criticalEffects: 2,
    skillsUsed: [],
  },
  enemies: {
    defeated: [],
    boss: { enemyRef: 'guardian-eterno', name: 'El Guardián Eterno', defeated: true },
    masters: [],
  },
  objectives: [],
}

const renderPage = (path = `/missions/reports/${ENROLLMENT_ID}`): void => {
  renderWithProviders(
    <Routes>
      <Route path="/missions/reports/:enrollmentId" element={<MissionReportPage />} />
    </Routes>,
    { route: path },
  )
}

/** Una respuesta NUEVA por petición: el reporte se vuelve a pedir mientras falte experiencia. */
const stubFetch = (report: ExperienceReport, status = 200): ReturnType<typeof vi.fn> => {
  const body = status === 200 ? { ...report, ...REPORT_SECTIONS } : report
  const fetchImpl = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  )
  vi.stubGlobal('fetch', fetchImpl)

  return fetchImpl
}

describe('el reporte incluye la experiencia de sus derrotas (HU-09.5)', () => {
  it('pinta la misión con su dificultad y desenlace, y el panel de experiencia', async () => {
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
      await screen.findByRole('heading', { level: 1, name: 'Reporte: El Templo Olvidado' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Historia · Heroico')).toBeInTheDocument()
    expect(screen.getByText(/Completada · Héroe: Kael/u)).toBeInTheDocument()
    expect(screen.getByText('+54 XP')).toBeInTheDocument()
    expect(screen.getByText('Nivel 3')).toBeInTheDocument()
  })

  it('pide el reporte de ESA matrícula, y solo con el testimonio', async () => {
    const fetchImpl = stubFetch(reportOf())

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Reporte: El Templo Olvidado' })

    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/v1/missions/me/reports/${ENROLLMENT_ID}`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('un reporte sin bloque de experiencia lo dice, no lo rellena con ceros', async () => {
    stubFetch(reportOf())

    renderPage()

    expect(
      await screen.findByText('Este informe no incluye el resumen de experiencia.'),
    ).toBeInTheDocument()
  })

  it('una misión en curso muestra el mensaje del servicio tal cual, sin reinterpretarlo', async () => {
    stubFetch(
      {
        statusCode: 404,
        code: 'REPORT_NOT_AVAILABLE',
        message: 'La misión sigue en curso. El reporte estará listo cuando termine.',
      } as unknown as ExperienceReport,
      404,
    )

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La misión sigue en curso. El reporte estará listo cuando termine.',
    )
  })
})
