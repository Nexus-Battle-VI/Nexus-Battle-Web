import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useSession } from '@/shared/session'
import { jsonResponse } from '@/test/missions-fixtures'
import { renderWithProviders } from '@/test/render'

import { MissionHistoryPage } from './MissionHistoryPage'

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('historial de misiones', () => {
  it('usa el cursor opaco para cargar otra página y distingue una misión anulada sin reporte', async () => {
    useSession.setState({
      subject: 'sujeto-ana',
      accessToken: 'jwt-vigente',
      expiresAt: Date.now() + 900_000,
    })
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        urls.push(url)
        if (url.endsWith('/history/summary')) {
          return Promise.resolve(
            jsonResponse(200, {
              byCategory: [],
              bestTimes: [],
              epicCollection: [],
              lootCollection: [],
              narrativeProgress: [],
            }),
          )
        }
        if (url.includes('?cursor=')) {
          return Promise.resolve(
            jsonResponse(200, {
              items: [
                {
                  enrollmentId: 'enr_anulada',
                  missionId: 'msn_dos',
                  name: 'Misión anulada',
                  category: 'STORY',
                  difficulty: 'NORMAL',
                  outcome: 'VOIDED',
                  finishedAt: '2026-09-20T10:00:00Z',
                  simulatedDuration: null,
                  reportAvailable: false,
                },
              ],
              nextCursor: null,
            }),
          )
        }
        return Promise.resolve(
          jsonResponse(200, {
            items: [
              {
                enrollmentId: 'enr_primera',
                missionId: 'msn_uno',
                name: 'Misión completada',
                category: 'STORY',
                difficulty: 'NORMAL',
                outcome: 'COMPLETED',
                finishedAt: '2026-09-21T10:00:00Z',
                simulatedDuration: 'PT1H2M',
                reportAvailable: true,
              },
            ],
            nextCursor: 'Y3Vyc29yLXVubw',
          }),
        )
      }),
    )
    const user = userEvent.setup()

    renderWithProviders(<MissionHistoryPage />)

    expect(await screen.findByText('Misión completada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver reporte de Misión completada' })).toHaveAttribute(
      'href',
      '/missions/reports/enr_primera',
    )
    await user.click(screen.getByRole('button', { name: 'Cargar más' }))

    expect(await screen.findByText('Misión anulada')).toBeInTheDocument()
    expect(screen.getByText('Sin reporte')).toBeInTheDocument()
    await waitFor(() => {
      expect(urls).toContain('/api/v1/missions/me/history?cursor=Y3Vyc29yLXVubw')
    })
  })
})
