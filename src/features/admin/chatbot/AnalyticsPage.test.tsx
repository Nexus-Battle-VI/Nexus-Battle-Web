import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'

import { fetchAnalytics } from './api'
import { AnalyticsPage } from './AnalyticsPage'

vi.mock('./api', () => ({
  fetchAnalytics: vi.fn(),
}))

const report = {
  conversationsStarted: 2,
  frequentQuestions: [{ text: 'cuanto dura un turno', count: 2 }],
  topics: [{ intent: 'regla_turno', count: 2 }],
  resolutionRate: 0.5,
  averageResponseMs: 30,
  satisfaction: 1,
  escalations: 1,
  keywords: [{ text: 'turno', count: 2 }],
  trend: [{ date: '2026-10-06', queries: 2, resolved: 1 }],
}

describe('AnalyticsPage', () => {
  beforeEach(() => {
    useSession.setState({ roles: ['ADMINISTRATOR'] })
    vi.mocked(fetchAnalytics).mockReset()
  })

  it('muestra las nueve medidas del periodo', async () => {
    vi.mocked(fetchAnalytics).mockResolvedValue(report)
    renderWithProviders(<AnalyticsPage />)

    expect(await screen.findByText('cuanto dura un turno 2')).toBeInTheDocument()
    expect(screen.getByText('regla_turno 2')).toBeInTheDocument()
    expect(screen.getByText('turno 2')).toBeInTheDocument()
    expect(screen.getByText(/Conversaciones iniciadas 2/)).toBeInTheDocument()
    expect(screen.getByText(/Tasa de resolución 50%/)).toBeInTheDocument()
    expect(screen.getByText(/Tiempo promedio de respuesta 30 ms/)).toBeInTheDocument()
    expect(screen.getByText(/Satisfacción 100%/)).toBeInTheDocument()
    expect(screen.getByText(/Escalamientos 1/)).toBeInTheDocument()
    expect(screen.getByText('2026-10-06 2 / 1')).toBeInTheDocument()
  })
})
