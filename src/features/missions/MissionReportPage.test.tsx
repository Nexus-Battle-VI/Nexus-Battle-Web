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
      name: 'Créditos de finalización',
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
      screen.getByText(/Créditos de finalización: 50 créditos\s*·\s*Pendiente de entrega/u),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Créditos de finalización: 50 créditos\s*·\s*Entregada/u),
    ).not.toBeInTheDocument()
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

/**
 * Recompensas de finalización de misión (HU-10.6, sobre la salida de HU-10.5). `source: 'HU-10'`
 * conviven en el MISMO reporte que HU-09 (derrotas), HU-72 (botín) y HU-73
 * (épica); ninguna reemplaza a la otra.
 */
describe('recompensas de finalización de misión (HU-10.5)', () => {
  const PROGRESSION = { level: 3, currentXp: 315, maxLevel: 8, levelsGained: 1 }

  it('1. XP HU-10 CREDITED es visible, con su signo', async () => {
    stubFetch(
      reportOf({
        rewards: [
          lineOf({
            kind: 'EXPERIENCE',
            source: 'HU-10',
            status: 'CREDITED',
            quantity: 120,
            name: 'Experiencia de finalización',
          }),
        ],
      }),
    )

    renderPage()

    expect(
      await screen.findByText(/Experiencia de finalización: \+120 XP\s*·\s*Entregada/u),
    ).toBeInTheDocument()
  })

  it('2. XP HU-10 PENDING se muestra como pendiente, sin signo ni entrega fingida', async () => {
    stubFetch(
      reportOf({
        rewards: [
          lineOf({
            kind: 'EXPERIENCE',
            source: 'HU-10',
            status: 'PENDING',
            quantity: 120,
            name: 'Experiencia de finalización',
          }),
        ],
      }),
    )

    renderPage()

    expect(
      await screen.findByText(/Experiencia de finalización: 120 XP\s*·\s*Pendiente de entrega/u),
    ).toBeInTheDocument()
  })

  it('3. XP HU-10 FAILED se muestra como fallida, no oculta ni pendiente', async () => {
    stubFetch(
      reportOf({
        rewards: [
          lineOf({
            kind: 'EXPERIENCE',
            source: 'HU-10',
            status: 'FAILED',
            quantity: 120,
            name: 'Experiencia de finalización',
          }),
        ],
      }),
    )

    renderPage()

    expect(
      await screen.findByText(/Experiencia de finalización: 120 XP\s*·\s*Entrega fallida/u),
    ).toBeInTheDocument()
  })

  it('4. créditos HU-10 CREDITED', async () => {
    stubFetch(
      reportOf({
        rewards: [
          lineOf({
            kind: 'CREDITS',
            source: 'HU-10',
            status: 'CREDITED',
            quantity: 50,
            name: 'Créditos de finalización',
          }),
        ],
      }),
    )

    renderPage()

    expect(
      await screen.findByText(/Créditos de finalización: 50 créditos\s*·\s*Entregada/u),
    ).toBeInTheDocument()
  })

  it('5. créditos HU-10 PENDING', async () => {
    stubFetch(
      reportOf({
        rewards: [
          lineOf({
            kind: 'CREDITS',
            source: 'HU-10',
            status: 'PENDING',
            quantity: 50,
            name: 'Créditos de finalización',
          }),
        ],
      }),
    )

    renderPage()

    expect(
      await screen.findByText(/Créditos de finalización: 50 créditos\s*·\s*Pendiente de entrega/u),
    ).toBeInTheDocument()
  })

  it('6. créditos HU-10 FAILED', async () => {
    stubFetch(
      reportOf({
        rewards: [
          lineOf({
            kind: 'CREDITS',
            source: 'HU-10',
            status: 'FAILED',
            quantity: 50,
            name: 'Créditos de finalización',
          }),
        ],
      }),
    )

    renderPage()

    expect(
      await screen.findByText(/Créditos de finalización: 50 créditos\s*·\s*Entrega fallida/u),
    ).toBeInTheDocument()
  })

  it('7. producto HU-10 con quantity = 1 no muestra el paréntesis de cantidad', async () => {
    stubFetch(
      reportOf({
        rewards: [
          lineOf({
            kind: 'PRODUCT',
            source: 'HU-10',
            status: 'CREDITED',
            quantity: 1,
            name: 'Sello de bronce',
          }),
        ],
      }),
    )

    renderPage()

    expect(await screen.findByText(/Objeto: Sello de bronce\s*·\s*Entregada/u)).toBeInTheDocument()
    expect(screen.queryByText(/Sello de bronce \(1\)/u)).not.toBeInTheDocument()
  })

  it('8. producto HU-10 con quantity > 1 muestra la cantidad', async () => {
    stubFetch(
      reportOf({
        rewards: [
          lineOf({
            kind: 'PRODUCT',
            source: 'HU-10',
            status: 'CREDITED',
            quantity: 3,
            name: 'Sello de bronce',
          }),
        ],
      }),
    )

    renderPage()

    expect(await screen.findByText(/Sello de bronce \(3\)/u)).toBeInTheDocument()
  })

  it('9 y 10. la XP HU-09 sigue en su panel; la XP HU-10 no cuenta como derrota HU-09', async () => {
    stubFetch(
      reportOf({
        experience: {
          defeats: 19,
          totalXp: 54,
          credited: 19,
          pending: 0,
          failed: 0,
          level: 2,
          currentXp: 512,
          maxLevel: 8,
          levelsGained: 1,
          leveledUp: true,
        },
        rewards: [
          lineOf({
            kind: 'EXPERIENCE',
            source: 'HU-10',
            status: 'CREDITED',
            quantity: 120,
            name: 'Experiencia de finalización',
          }),
        ],
      }),
    )

    renderPage()

    // HU-09: el panel de experiencia, con SU propio total.
    expect(await screen.findByText('+54 XP')).toBeInTheDocument()
    // HU-10: su propia linea, con SU propio importe -- ninguno se mezcla con el otro.
    expect(await screen.findByText(/Experiencia de finalización: \+120 XP/u)).toBeInTheDocument()
    expect(screen.queryByText('+174 XP')).not.toBeInTheDocument()
  })

  it('11. HU-09 y HU-10 coexisten sin que ninguna oculte a la otra', async () => {
    stubFetch(
      reportOf({
        experience: {
          defeats: 2,
          totalXp: 20,
          credited: 2,
          pending: 0,
          failed: 0,
          level: 1,
          currentXp: 20,
          maxLevel: 8,
          levelsGained: 0,
          leveledUp: false,
        },
        rewards: [
          lineOf({
            kind: 'CREDITS',
            source: 'HU-10',
            status: 'CREDITED',
            quantity: 50,
            name: 'Créditos de finalización',
          }),
        ],
      }),
    )

    renderPage()

    expect(await screen.findByText('+20 XP')).toBeInTheDocument()
    expect(
      await screen.findByText(/Créditos de finalización: 50 créditos\s*·\s*Entregada/u),
    ).toBeInTheDocument()
  })

  it('12. el botín de HU-72 sigue visible junto a las recompensas de HU-10', async () => {
    stubFetch(
      reportOf({
        rewards: [
          lineOf({
            kind: 'PRODUCT',
            source: 'HU-72',
            status: 'CREDITED',
            quantity: 2,
            name: 'Fragmento',
          }),
          lineOf({ kind: 'CREDITS', source: 'HU-10', status: 'CREDITED', quantity: 50 }),
        ],
      }),
    )

    renderPage()

    expect(await screen.findByText(/Objeto: Fragmento \(2\)/u)).toBeInTheDocument()
  })

  it('13. la épica de HU-73 sigue visible junto a las recompensas de HU-10', async () => {
    stubFetch(
      reportOf({
        rewards: [
          lineOf({
            kind: 'EPIC',
            source: 'HU-73',
            status: 'CREDITED',
            quantity: 1,
            name: 'Golpe de defensa',
          }),
          lineOf({
            kind: 'EXPERIENCE',
            source: 'HU-10',
            status: 'PENDING',
            quantity: 120,
            name: 'Experiencia de finalización',
          }),
        ],
      }),
    )

    renderPage()

    expect(await screen.findByText(/Épica: Golpe de defensa\s*·\s*Entregada/u)).toBeInTheDocument()
  })

  it('14. una misión FAILED puede traer XP HU-10 si el backend la manda', async () => {
    stubFetch(
      reportOf({
        outcome: 'FAILED',
        rewards: [
          lineOf({
            kind: 'EXPERIENCE',
            source: 'HU-10',
            status: 'CREDITED',
            quantity: 40,
            name: 'Experiencia de finalización',
          }),
        ],
      }),
    )

    renderPage()

    expect(await screen.findByText(/Fallida/u)).toBeInTheDocument()
    expect(await screen.findByText(/Experiencia de finalización: \+40 XP/u)).toBeInTheDocument()
  })

  it('15. un reporte sin lineas HU-10 mantiene la UI vieja (compatibilidad)', async () => {
    stubFetch(reportOf())

    renderPage()

    expect(await screen.findByText('No hay recompensas que entregar.')).toBeInTheDocument()
  })

  describe('progresión de la XP de finalización (HU-10.5, contrato §17)', () => {
    it('A. CREDITED con progresión: se muestra tal cual la publica Missions', async () => {
      stubFetch(
        reportOf({
          rewards: [
            lineOf({
              kind: 'EXPERIENCE',
              source: 'HU-10',
              status: 'CREDITED',
              quantity: 120,
              progression: PROGRESSION,
            }),
          ],
        }),
      )

      renderPage()

      expect(await screen.findByText('Nivel 3')).toBeInTheDocument()
      expect(await screen.findByText('315 XP acumulada')).toBeInTheDocument()
      expect(await screen.findByText('1 nivel ganado')).toBeInTheDocument()
    })

    it('B. CREDITED sin progresión: no revienta ni inventa valores', async () => {
      stubFetch(
        reportOf({
          rewards: [
            lineOf({
              kind: 'EXPERIENCE',
              source: 'HU-10',
              status: 'CREDITED',
              quantity: 120,
              name: 'Experiencia de finalización',
            }),
          ],
        }),
      )

      renderPage()

      expect(await screen.findByText(/Experiencia de finalización: \+120 XP/u)).toBeInTheDocument()
      expect(screen.queryByText(/Nivel \d/u)).not.toBeInTheDocument()
    })

    it('C. PENDING con una progresion inesperada en el cuerpo: no se presenta como acreditada', async () => {
      stubFetch(
        reportOf({
          rewards: [
            lineOf({
              kind: 'EXPERIENCE',
              source: 'HU-10',
              status: 'PENDING',
              quantity: 120,
              name: 'Experiencia de finalización',
              progression: PROGRESSION,
            }),
          ],
        }),
      )

      renderPage()

      expect(
        await screen.findByText(/Experiencia de finalización: 120 XP\s*·\s*Pendiente de entrega/u),
      ).toBeInTheDocument()
      expect(screen.queryByText('Nivel 3')).not.toBeInTheDocument()
    })

    it('D. una linea CREDITS con una progresion accidental no la usa', async () => {
      stubFetch(
        reportOf({
          rewards: [
            lineOf({
              kind: 'CREDITS',
              source: 'HU-10',
              status: 'CREDITED',
              quantity: 50,
              name: 'Créditos de finalización',
              progression: PROGRESSION,
            }),
          ],
        }),
      )

      renderPage()

      expect(
        await screen.findByText(/Créditos de finalización: 50 créditos\s*·\s*Entregada/u),
      ).toBeInTheDocument()
      expect(screen.queryByText('Nivel 3')).not.toBeInTheDocument()
    })
  })
})
