import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'

import { useSession } from '@/shared/session'
import { difficultiesWithoutProgress, jsonResponse, MISSION_ID } from '@/test/missions-fixtures'
import { renderWithProviders } from '@/test/render'

import type { MissionDetail } from './missionApi'
import { MissionDetailPage } from './MissionDetailPage'

const HERO_ID = '7f3c2a9e-2d4b-4c1a-9e7f-1b2c3d4e5f60'

const detail: MissionDetail = {
  missionId: MISSION_ID,
  name: 'El Templo Olvidado',
  category: 'STORY',
  narrative: 'Explora el templo.',
  objectives: [{ id: 'jefe', text: 'Derrotar al guardián.', primary: true }],
  estimatedDuration: 'PT12H',
  recommendedPower: 15,
  prerequisites: [],
  enemies: [{ name: 'Sombra', count: 2, description: null }],
  finalBoss: { name: 'Guardián', heroType: null, description: null, stats: {} },
  masterEncounter: { probability: 0, candidates: [] },
  rewards: {
    guaranteed: [{ label: '50 créditos' }],
    potential: [],
    objectiveBonuses: [],
    firstTime: [],
  },
  playerStatus: 'AVAILABLE',
  canEnroll: true,
  lockReason: null,
}

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

describe('detalle y matrícula de misión', () => {
  it('reutiliza la clave tras un 503 y muestra la confirmación que devuelve Missions', async () => {
    signIn()
    const attempts: string[] = []
    const enrollmentBodies: unknown[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (url.endsWith('/difficulties')) {
          return Promise.resolve(jsonResponse(200, difficultiesWithoutProgress()))
        }
        if (url.endsWith('/inventories/me/heroes')) {
          return Promise.resolve(
            jsonResponse(200, [{ heroId: HERO_ID, name: 'Heroína', abilities: [] }]),
          )
        }
        if (url.includes('/estimate?')) {
          return Promise.resolve(
            jsonResponse(200, {
              missionId: MISSION_ID,
              heroId: HERO_ID,
              difficulty: 'NORMAL',
              strategyVersion: null,
              runs: 30,
              successPercent: 73,
              defeatPercent: 20,
              timeoutPercent: 7,
              risk: 'MEDIUM',
              riskLabel: 'Pareja',
              averageTurns: 41,
              averageMinHealthPercent: 36,
              masterAppearancePercent: 0,
              abilities: [],
            }),
          )
        }
        if (url.includes('/strategies/')) {
          return Promise.resolve(
            jsonResponse(404, { code: 'STRATEGY_NOT_FOUND', message: 'Sin estrategia.' }),
          )
        }
        if (url.endsWith('/enrollments') && init?.method === 'POST') {
          const headers = init.headers as Record<string, string>
          attempts.push(headers['Idempotency-Key'] ?? '')
          enrollmentBodies.push(JSON.parse(init.body as string) as unknown)
          return Promise.resolve(
            attempts.length === 1
              ? jsonResponse(503, {
                  code: 'DEPENDENCY_UNAVAILABLE',
                  message: 'La reserva está pendiente. Intenta de nuevo.',
                })
              : jsonResponse(201, {
                  enrollmentId: 'enr_uno',
                  missionId: MISSION_ID,
                  heroId: HERO_ID,
                  difficulty: 'NORMAL',
                  status: 'IN_PROGRESS',
                  startedAt: '2026-10-01T15:00:00Z',
                  endsAt: '2026-10-02T03:00:00Z',
                }),
          )
        }
        return Promise.resolve(jsonResponse(200, detail))
      }),
    )
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/missions/:missionId" element={<MissionDetailPage />} />
      </Routes>,
      { route: `/missions/${MISSION_ID}` },
    )

    expect(await screen.findByRole('heading', { name: 'El Templo Olvidado' })).toBeInTheDocument()
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Héroe' }), HERO_ID)
    expect(
      await screen.findByText('Sin estrategia guardada: la IA usará ataque básico.'),
    ).toBeInTheDocument()
    await user.click(await screen.findByRole('radio', { name: 'Normal' }))
    // P-J7: la probabilidad de éxito se ve antes de enviar al héroe.
    expect(await screen.findByText('73 %')).toBeInTheDocument()
    expect(screen.getByText('Pareja')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Iniciar misión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La reserva está pendiente')
    await user.click(screen.getByRole('button', { name: 'Reintentar matrícula' }))

    await waitFor(() => {
      expect(attempts).toHaveLength(2)
    })
    expect(attempts[0]).toMatch(/^[0-9a-f-]{36}$/iu)
    expect(attempts[1]).toBe(attempts[0])
    expect(enrollmentBodies).toEqual([
      { heroId: HERO_ID, difficulty: 'NORMAL', strategyVersion: null },
      { heroId: HERO_ID, difficulty: 'NORMAL', strategyVersion: null },
    ])
    // P-J6 y P-J10: sin identificadores técnicos, con un acceso a seguir la misión.
    expect(await screen.findByText('¡Misión iniciada!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Seguir la misión' })).toHaveAttribute(
      'href',
      '/missions/progress/enr_uno',
    )
    expect(screen.queryByText(/enr_uno/u)).not.toBeInTheDocument()
    // La hora con «a. m.» ya trae su punto: no se añade otro.
    expect(screen.getByText(/^Termina el /u)).not.toHaveTextContent(/\.\.$/u)
    expect(screen.getByRole('button', { name: 'Iniciar misión' })).toBeDisabled()
  })

  it('muestra la probabilidad de Máster de la misión que calcula Missions y la de cada uno', async () => {
    signIn()
    const epic = { name: 'Frío concentrado', generalEffect: null, epicEffect: null }
    const withMasters: MissionDetail = {
      ...detail,
      // Decisión del PO: 15 % por misión, repartido entre dos candidatos.
      masterEncounter: {
        probability: 0.1499,
        candidates: [
          {
            name: 'Hechicera del Sello',
            heroType: 'MAGO_HIELO',
            probabilityByHeroType: { '*': 0.078 },
            epic,
          },
          {
            name: 'Coloso de Obsidiana',
            heroType: 'GUERRERO_TANQUE',
            probabilityByHeroType: { '*': 0.078 },
            epic: null,
          },
        ],
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (url.endsWith('/difficulties')) {
          return Promise.resolve(jsonResponse(200, difficultiesWithoutProgress()))
        }
        if (url.endsWith('/inventories/me/heroes')) {
          return Promise.resolve(jsonResponse(200, []))
        }
        return Promise.resolve(jsonResponse(200, withMasters))
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/missions/:missionId" element={<MissionDetailPage />} />
      </Routes>,
      { route: `/missions/${MISSION_ID}` },
    )

    // Intl puede separar el signo con un espacio de no separación o no separarlo.
    expect(
      await screen.findByText(/^Hay un 15\s?% de probabilidad de que aparezca uno/u),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/^7,8\s?% de aparecer$/u)).toHaveLength(2)
    expect(screen.getByText('Su épica aún no se puede entregar.')).toBeInTheDocument()
  })
})
