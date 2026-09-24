import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'

import { useSession } from '@/shared/session'
import { jsonResponse } from '@/test/missions-fixtures'
import { renderWithProviders } from '@/test/render'

import { ActiveMissionsPanel } from './ActiveMissionsPanel'
import { MissionArt } from './art/MissionArt'
import { EpicAlbum } from './EpicAlbum'
import { UnusableAbilities } from './MissionEstimatePanel'
import { MissionFinishedNotice } from './MissionFinishedNotice'
import type { ActiveMission, MissionEstimate, MissionProgress } from './missionPlayApi'
import { MissionProgressPage } from './MissionProgressPage'

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

const ACTIVE: ActiveMission = {
  enrollmentId: 'enr_1',
  missionId: 'msn_camino_templo',
  missionName: 'Camino al Templo',
  category: 'STORY',
  imageRef: 'mision-camino-templo',
  heroId: 'heroe-1',
  heroName: 'Kaelen',
  difficulty: 'NORMAL',
  status: 'IN_PROGRESS',
  startedAt: '2026-10-01T15:00:00Z',
  endsAt: '2026-10-01T15:10:00Z',
  progressPercent: 40,
  remainingSeconds: 598,
}

const PROGRESS: MissionProgress = {
  enrollmentId: 'enr_1',
  missionId: 'msn_camino_templo',
  missionName: 'Camino al Templo',
  difficulty: 'NORMAL',
  status: 'IN_PROGRESS',
  startedAt: '2026-10-01T15:00:00Z',
  endsAt: '2026-10-01T15:10:00Z',
  serverTime: '2026-10-01T15:05:00Z',
  progressPercent: 50,
  remainingSeconds: 300,
  simulated: true,
  finished: false,
  reportAvailable: false,
  hero: { heroId: 'heroe-1', name: 'Kaelen', maxHealth: 40, health: 30 },
  entries: [
    { seq: 1, turn: 0, kind: 'ENCOUNTER_STARTED', encounter: 1, boss: false },
    {
      seq: 2,
      turn: 1,
      kind: 'HERO_ACTION',
      enemy: 'Bandidos del Camino',
      role: 'ENEMY',
      ability: null,
      hit: true,
      damage: 3,
    },
  ],
  lastSeq: 2,
  nextRevealAt: null,
}

beforeEach(() => {
  useSession.setState({
    subject: 'sujeto-ana',
    accessToken: 'jwt-vigente',
    expiresAt: Date.now() + 900_000,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('misiones en curso (P-J6)', () => {
  it('muestra cada misión con su progreso, la cuenta regresiva y el acceso a su bitácora', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(jsonResponse(200, { serverTime: ACTIVE.startedAt, items: [ACTIVE] })),
      ),
    )

    renderWithProviders(<ActiveMissionsPanel />)

    expect(await screen.findByRole('heading', { name: 'Misiones en curso' })).toBeInTheDocument()
    expect(screen.getByText('Camino al Templo')).toBeInTheDocument()
    expect(screen.getByText('Héroe: Kaelen')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Progreso de Camino al Templo' }),
    ).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByRole('timer')).toHaveTextContent(/Termina en 9:5\d/u)
    expect(screen.getByRole('link', { name: 'Seguir la misión' })).toHaveAttribute(
      'href',
      '/missions/progress/enr_1',
    )
  })

  it('sin misiones en curso, o con una respuesta inesperada, no ocupa espacio', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, [])))
    vi.stubGlobal('fetch', fetchMock)

    const { container } = renderWithProviders(<ActiveMissionsPanel />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    expect(container).toBeEmptyDOMElement()
  })
})

describe('seguimiento de una misión (P-J6)', () => {
  const renderPage = () =>
    renderWithProviders(
      <Routes>
        <Route path="/missions/progress/:enrollmentId" element={<MissionProgressPage />} />
      </Routes>,
      { route: '/missions/progress/enr_1' },
    )

  it('muestra la bitácora revelada, lo más reciente arriba, y pide solo lo nuevo', async () => {
    const pages: MissionProgress[] = [
      PROGRESS,
      {
        ...PROGRESS,
        entries: [
          { seq: 3, turn: 2, kind: 'DEFEATED', enemy: 'Bandidos del Camino', role: 'ENEMY' },
        ],
        lastSeq: 3,
      },
    ]
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        urls.push(urlOf(input))
        return Promise.resolve(jsonResponse(200, pages[urls.length - 1] ?? pages[1]))
      }),
    )

    const { queryClient } = renderPage()

    expect(await screen.findByRole('heading', { name: 'Camino al Templo' })).toBeInTheDocument()
    const lines = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(lines.map((line) => line.textContent)).toEqual([
      'Tu héroe ataca a Bandidos del Camino: 3 de daño.',
      'Comienza el encuentro 1.',
    ])
    expect(screen.getByText('30 / 40')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent(/Termina en (5:00|4:5\d)/u)
    expect(urls[0]).toMatch(/\/v1\/missions\/me\/progress\/enr_1\?after=0$/u)

    await queryClient.refetchQueries()

    expect(await screen.findByText('Bandidos del Camino cae derrotado.')).toBeInTheDocument()
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3)
    expect(urls[1]).toMatch(/\?after=2$/u)
  })

  it('al terminar lleva al reporte', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(200, {
            ...PROGRESS,
            status: 'COMPLETED',
            finished: true,
            reportAvailable: true,
            remainingSeconds: 0,
            entries: [{ seq: 9, turn: 30, kind: 'MISSION_FINISHED', victory: true }],
            lastSeq: 9,
          }),
        ),
      ),
    )

    renderPage()

    expect(await screen.findByText('La misión terminó.')).toBeInTheDocument()
    expect(screen.getByText('¡Misión cumplida!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el reporte de la misión' })).toHaveAttribute(
      'href',
      '/missions/reports/enr_1',
    )
  })

  it('antes de que Combat simule, avisa que el héroe se prepara', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(200, { ...PROGRESS, simulated: false, entries: [], lastSeq: 0 }),
        ),
      ),
    )

    renderPage()

    expect(
      await screen.findByText('Tu héroe se prepara: la bitácora aparece en unos segundos.'),
    ).toBeInTheDocument()
  })
})

describe('aviso de misión terminada (P-J6)', () => {
  it('avisa cuando una misión deja de estar en curso, con acceso a su reporte', async () => {
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        calls += 1
        return Promise.resolve(
          jsonResponse(200, { serverTime: ACTIVE.startedAt, items: calls === 1 ? [ACTIVE] : [] }),
        )
      }),
    )
    const user = userEvent.setup()

    const { queryClient } = renderWithProviders(<MissionFinishedNotice />)
    // Con la primera respuesta ya leída: volver a pedir antes cancelaría la primera.
    await waitFor(() => {
      expect(queryClient.getQueryData(['missions', 'active', 'sujeto-ana'])).toBeDefined()
    })
    // Al abrir la aplicación no se avisa de nada.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await queryClient.refetchQueries({ queryKey: ['missions', 'active'] })

    expect(await screen.findByText('«Camino al Templo» terminó.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el reporte' })).toHaveAttribute(
      'href',
      '/missions/reports/enr_1',
    )

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText('«Camino al Templo» terminó.')).not.toBeInTheDocument()
  })
})

describe('habilidades que no sirven en misiones (P-J4)', () => {
  const estimate = (abilities: MissionEstimate['abilities']): MissionEstimate => ({
    missionId: 'msn_camino_templo',
    heroId: 'heroe-1',
    difficulty: 'NORMAL',
    strategyVersion: null,
    runs: 30,
    successPercent: 90,
    defeatPercent: 10,
    timeoutPercent: 0,
    risk: 'LOW',
    riskLabel: 'Favorable',
    averageTurns: 20,
    averageMinHealthPercent: 60,
    masterAppearancePercent: 0,
    abilities,
  })

  it('las nombra con el motivo de Combat', () => {
    render(
      <UnusableAbilities
        estimate={estimate([
          { abilityId: 'a', name: 'Golpe de tormenta', usable: true, reason: null },
          {
            abilityId: 'b',
            name: 'Pare de fuego',
            usable: false,
            reason: 'un efecto condicionado no se evalua.',
          },
        ])}
      />,
    )

    expect(screen.getByRole('note')).toHaveTextContent(
      'Pare de fuego: Un efecto condicionado no se evalua.',
    )
    expect(screen.queryByText(/Golpe de tormenta/u)).not.toBeInTheDocument()
  })

  it('si todas sirven, o aún no hay estimación, no dice nada', () => {
    const { container, rerender } = render(<UnusableAbilities estimate={undefined} />)
    expect(container).toBeEmptyDOMElement()

    rerender(
      <UnusableAbilities
        estimate={estimate([{ abilityId: 'a', name: 'Golpe', usable: true, reason: null }])}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('álbum de épicas (P-J3)', () => {
  it('cuenta las que se tienen y dice dónde ganar las demás', () => {
    render(
      <MemoryRouter>
        <EpicAlbum
          entries={[
            {
              epicRef: 'toma-y-lleva',
              name: 'Toma y lleva',
              generalEffect: '+1 al ataque para todos los héroes.',
              epicEffect: null,
              heroType: 'PICARO_VENENO',
              masterName: 'Sombra del Olvido',
              missionId: 'msn_templo_olvidado',
              missionName: 'El Templo Olvidado',
              obtained: true,
            },
            {
              epicRef: 'golpe-de-defensa',
              name: 'Golpe de defensa',
              generalEffect: null,
              epicEffect: null,
              heroType: 'GUERRERO_TANQUE',
              masterName: 'Coloso de Obsidiana',
              missionId: 'msn_camara_sellada',
              missionName: 'La Cámara Sellada',
              obtained: false,
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Tienes 1 de 2/u)).toBeInTheDocument()
    expect(screen.getByText('Obtenida')).toBeInTheDocument()
    expect(screen.getByText('Por conseguir')).toBeInTheDocument()
    expect(screen.getByText('Potencia a: Pícaro Veneno')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'El Templo Olvidado' })).toHaveAttribute(
      'href',
      '/missions/msn_templo_olvidado',
    )
    // Sin frases que pidan artículo: «Máster: nombre · misión».
    expect(screen.getByText('Máster: Coloso de Obsidiana ·')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'La Cámara Sellada' })).toHaveAttribute(
      'href',
      '/missions/msn_camara_sellada',
    )
  })

  it('sin épicas que ganar no ocupa espacio', () => {
    const { container } = render(<EpicAlbum entries={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('ilustraciones de las misiones (P-J11)', () => {
  const sceneOf = (imageRef: string | null, category: 'STORY' | 'CHALLENGE' | null) =>
    render(<MissionArt imageRef={imageRef} category={category} />)
      .container.querySelector('svg')
      ?.getAttribute('data-scene')

  it('cada misión tiene su escena y una desconocida usa la de su categoría', () => {
    expect(sceneOf('mision-templo-olvidado', 'STORY')).toBe('mision-templo-olvidado')
    expect(sceneOf('imagen-nueva', 'CHALLENGE')).toBe('categoria-CHALLENGE')
    expect(sceneOf(null, null)).toBe('categoria-STORY')
  })

  it('es decorativa: el nombre ya está en el texto', () => {
    const { container } = render(<MissionArt imageRef={null} category="STORY" />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
