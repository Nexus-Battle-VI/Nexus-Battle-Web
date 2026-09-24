import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'

import { useSession } from '@/shared/session'
import { jsonResponse } from '@/test/missions-fixtures'
import { renderWithProviders } from '@/test/render'

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
    expect(screen.getByText(/50 créditos × 50 · Pendiente de entrega/u)).toBeInTheDocument()
    expect(screen.queryByText(/50 créditos × 50 · Entregada/u)).not.toBeInTheDocument()
  })
})
