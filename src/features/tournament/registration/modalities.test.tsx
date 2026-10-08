import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import {
  createRegistrationPreviewApis,
  DEV_REGISTRATION_TOURNAMENT,
  devAvatarDownload,
  registrationTeamFixture,
} from '@/features/tournament/dev/registrationFixtures'
import { HttpError } from '@/lib/http'
import { MODALITIES_CONTRACT_VERSION, type RegistrationApi, type TournamentMode } from './api'
import { RegisterTeamForm } from './RegisterTeamForm'
import { CreateTournamentPanel } from './CreateTournamentPanel'
import { TeamRegistrationCard } from './TeamRegistrationCard'
import { calendarPreview } from './calendar'
import { layoutBracket, SIDE_PORTS } from './bracketLayout'
import { BracketTree } from './BracketTree'

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})
describe('modalidades y consentimiento individual · adaptadores de prueba', () => {
  it.each([
    ['SOLO', 0],
    ['DUO', 1],
    ['TRIO', 2],
  ] as const)(
    'registra %s con %i invitados sin enviar actor, precio o estado',
    async (mode, count) => {
      const register = vi
        .fn<RegistrationApi['register']>()
        .mockResolvedValue(registrationTeamFixture())
      renderWithProviders(
        <RegisterTeamForm
          id="T"
          subject="owner"
          api={{ register } as unknown as RegistrationApi}
          mode={mode}
          contractVersion={MODALITIES_CONTRACT_VERSION}
          generation=""
          canMutate
          onResult={vi.fn()}
          avatarDownload={devAvatarDownload}
        />,
      )
      const form = screen.getByRole('form', { name: 'Registro del equipo' })
      const texts = within(form).getAllByRole('textbox')
      expect(texts).toHaveLength(count + 1)
      await userEvent.type(texts[0]!, 'Equipo legítimo')
      for (let i = 0; i < count; i++) await userEvent.type(texts[i + 1]!, `invited-${String(i)}`)
      await userEvent.click(
        within(form).getByRole('button', {
          name: mode === 'SOLO' ? 'Registrar participación' : 'Registrar equipo',
        }),
      )
      const input = register.mock.calls[0]?.[1]
      expect(input).toEqual({
        name: 'Equipo legítimo',
        invitedMemberIds: Array.from({ length: count }, (_, i) => `invited-${String(i)}`),
        avatar: { kind: 'ACCOUNT_AVATAR', subject: 'owner' },
        operationId: expect.any(String),
      })
    },
  )
  it('retiene el mismo intento tras 503 y no comparte borrador entre modalidades', async () => {
    const register = vi
      .fn<RegistrationApi['register']>()
      .mockRejectedValue(new HttpError(503, 'Pendiente', {}))
    const props = {
      id: 'T',
      subject: 'owner',
      api: { register } as unknown as RegistrationApi,
      contractVersion: MODALITIES_CONTRACT_VERSION,
      generation: '',
      canMutate: true,
      onResult: vi.fn(),
      avatarDownload: devAvatarDownload,
    }
    const first = renderWithProviders(<RegisterTeamForm {...props} mode="TRIO" />)
    await userEvent.type(screen.getByLabelText(/^Nombre del equipo/u), 'Trío persistido')
    await userEvent.type(screen.getByLabelText(/^Código del integrante 2/u), 'p2')
    await userEvent.type(screen.getByLabelText(/^Código del integrante 3/u), 'p3')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar equipo' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Comprobar el mismo registro' }),
    )
    expect(register.mock.calls[0]?.[1]).toEqual(register.mock.calls[1]?.[1])
    first.unmount()
    const solo = renderWithProviders(<RegisterTeamForm {...props} mode="SOLO" />)
    expect(screen.getByLabelText(/^Nombre de tu participación/u)).toHaveValue('')
    solo.unmount()
    renderWithProviders(<RegisterTeamForm {...props} mode="TRIO" />)
    expect(screen.getByLabelText(/^Nombre del equipo/u)).toHaveValue('Trío persistido')
  })
  it('el tercer integrante consiente solo por su sesión y no obtiene controles de pago', async () => {
    const consent = vi.fn<RegistrationApi['consent']>().mockResolvedValue(registrationTeamFixture())
    const team = {
      ...registrationTeamFixture('AWAITING_CONSENT'),
      members: ['dev-player-A', 'p2', 'p3'].map((subject, position) => ({
        subject,
        position,
        consentAt: position === 0 ? '2026-10-07T12:00:00Z' : null,
        consentVersion: position === 0 ? 'team-registration-v3' : null,
      })),
    }
    renderWithProviders(
      <TeamRegistrationCard
        id="T"
        subject="p3"
        team={team}
        open
        available={8}
        canMutate
        policy={DEV_REGISTRATION_TOURNAMENT.entryPolicy}
        api={{ consent } as unknown as RegistrationApi}
        onResult={vi.fn()}
        avatarDownload={devAvatarDownload}
      />,
    )
    expect(
      within(
        screen.getByRole('list', { name: 'Integrantes y consentimiento de inscripción' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(3)
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar participar' }))
    expect(consent).toHaveBeenCalledWith('T', team.id, expect.any(String), true)
    expect(screen.queryByRole('form', { name: 'Confirmación del cupo' })).not.toBeInTheDocument()
  })
  it.each(['SOLO', 'DUO', 'TRIO'] as const)(
    'crea %s con vista previa separando apertura e inicio',
    async (mode: TournamentMode) => {
      const create = vi
        .fn<RegistrationApi['create']>()
        .mockResolvedValue(DEV_REGISTRATION_TOURNAMENT)
      renderWithProviders(
        <CreateTournamentPanel
          subject="admin"
          api={{ create } as unknown as RegistrationApi}
          onCreated={vi.fn()}
          initiallyOpen
        />,
      )
      await userEvent.selectOptions(screen.getByLabelText('Modalidad del torneo'), mode)
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Nombre del torneo' }),
        'Torneo real',
      )
      await userEvent.selectOptions(screen.getByLabelText(/^Política de inscripción/u), 'FREE')
      for (const [label, value] of [
        ['Apertura de inscripción', '2026-10-07T18:00'],
        ['Cierre de inscripción', '2026-10-07T18:59'],
        ['Apertura de la primera aceptación', '2026-10-07T19:00'],
      ])
        fireEvent.change(screen.getByLabelText(new RegExp(label!)), { target: { value } })
      expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(7)
      await userEvent.click(screen.getByRole('button', { name: 'Crear torneo' }))
      expect(create.mock.calls[0]?.[0]).toMatchObject({
        tournamentMode: mode,
        startsAt: new Date('2026-10-07T19:00').toISOString(),
        entryPolicy: { version: 1, free: true, methods: [] },
      })
    },
  )
  it('la vista previa muestra 19:02, 19:12 y 19:52; no decide justas', () => {
    const preview = calendarPreview('2026-10-08T00:00:00Z')
    expect(preview).toHaveLength(6)
    expect(preview[0]?.plannedStartAt).toBe('2026-10-08T00:02:00.000Z')
    expect(preview[1]?.plannedStartAt).toBe('2026-10-08T00:12:00.000Z')
    expect(preview[5]?.plannedStartAt).toBe('2026-10-08T00:52:00.000Z')
  })
})
describe('árbol generado desde fuentes y destinos', () => {
  it('conserva 14 justas, ocho seeds y cada arista llega al lado de su fuente, incluidos cruces y final', async () => {
    const bracket = await createRegistrationPreviewApis().brackets.publish('T', 'op')
    const layout = layoutBracket(bracket.matches)
    expect(bracket.matches).toHaveLength(14)
    expect(bracket.seeds).toHaveLength(8)
    expect(layout.edges).toHaveLength(20)
    expect(layout.edges.every((e) => e.consistent)).toBe(true)
    for (const match of bracket.matches)
      match.sources.forEach((source, side) => {
        if (source.kind === 'SEED') return
        const edge = layout.edges.find((e) => e.to === match.id && e.side === side)
        expect(edge).toMatchObject({ from: source.matchId, kind: source.kind, side })
        expect(edge?.path).toContain(
          `V ${String(layout.positions.get(match.id)!.y + SIDE_PORTS[side as 0 | 1])} H ${String(layout.positions.get(match.id)!.x)}`,
        )
      })
    expect(
      layout.edges
        .filter((e) => ['E9', 'E10', 'Final'].includes(e.to))
        .map(({ from, to, side, kind }) => ({ from, to, side, kind })),
    ).toEqual([
      { from: 'E6', to: 'E9', side: 0, kind: 'LOSER' },
      { from: 'E7', to: 'E9', side: 1, kind: 'WINNER' },
      { from: 'E5', to: 'E10', side: 0, kind: 'LOSER' },
      { from: 'E8', to: 'E10', side: 1, kind: 'WINNER' },
      { from: 'E11', to: 'Final', side: 0, kind: 'WINNER' },
      { from: 'E13', to: 'Final', side: 1, kind: 'WINNER' },
    ])
    const select = vi.fn()
    renderWithProviders(
      <BracketTree
        bracket={bracket}
        selection=""
        onSelect={select}
        statusLabel={() => 'Pendiente'}
        timeLabel={() => 'Horario pendiente'}
        winnerLabel={() => null}
      />,
    )
    expect(screen.getAllByRole('button', { name: / · Ronda /u })).toHaveLength(7)
    await userEvent.click(screen.getByRole('button', { name: /^Perdedores/u }))
    const node = screen.getByRole('button', { name: /^E9 · Ronda/u })
    node.focus()
    await userEvent.keyboard('{Enter}')
    expect(select).toHaveBeenCalledWith('E9')
    await userEvent.click(screen.getByRole('button', { name: 'Ver por rondas' }))
    expect(screen.getAllByRole('button', { name: / · Ronda /u })).toHaveLength(2)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Ronda de las llaves' }),
      '3',
    )
    expect(screen.getByRole('button', { name: /^E9 · Ronda/u })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^E10 · Ronda/u })).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Árbol desplazable de llaves' }),
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Todas/u }))
    await userEvent.click(screen.getByRole('button', { name: 'Ver árbol' }))
    expect(screen.getAllByRole('button', { name: / · Ronda /u })).toHaveLength(14)
    await userEvent.click(screen.getByRole('button', { name: 'Final · 1', exact: true }))
    expect(screen.getAllByRole('button', { name: / · Ronda /u })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /^Final · Ronda/u })).toBeInTheDocument()
  })
})
