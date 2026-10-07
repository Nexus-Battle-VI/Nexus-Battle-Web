import { act, screen, waitFor, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'
import { renderWithProviders } from '@/test/render'
import {
  DEV_REGISTRATION_TOURNAMENT,
  registrationTeamFixture,
  devAvatarDownload,
  createRegistrationPreviewApis,
} from '@/features/tournament/dev/registrationFixtures'
import { TournamentRegistrationPage } from './TournamentRegistrationPage'
import type { EntryTeam, EntryView, RegistrationApi } from './api'

const A = 'dev-player-A'
const B = 'dev-player-B'
const T = DEV_REGISTRATION_TOURNAMENT.id
const confirmed = (method: 'FREE' | 'CREDITS' | 'SIMULATED_MONEY' = 'CREDITS'): EntryTeam => ({
  ...registrationTeamFixture('CONFIRMED'),
  slot: 8,
  confirmedAt: '2026-10-05T15:02:00Z',
  entryReceipt: {
    id: 'entry-receipt',
    kind: 'ENTRY_CONFIRMATION',
    tournamentId: T,
    teamId: 'dev-team-A-B',
    slot: 8,
    confirmedAt: '2026-10-05T15:02:00Z',
    payment:
      method === 'FREE'
        ? { method, amount: 0, chargeId: null, payerId: A, realMoneyMoved: false }
        : method === 'CREDITS'
          ? { method, amount: 100, chargeId: 'wallet-charge', payerId: A, realMoneyMoved: false }
          : {
              method,
              amountMinor: 125050,
              currency: 'COP',
              minorUnit: 2,
              chargeId: 'sim-charge',
              payerId: A,
              realMoneyMoved: false,
              reference: 'sim-intent',
              maskedCard: '****1111',
              simulated: true,
            },
  },
})
const setup = (team: EntryTeam | null = null) => {
  let current: EntryView = {
    tournament: DEV_REGISTRATION_TOURNAMENT,
    capacity: { confirmed: 7, reserved: 0, available: 1 },
    teams: team === null ? [] : [team],
  }
  const updateTeam = (next: EntryTeam) => {
    current = { ...current, teams: [next] }
    return next
  }
  const api = {
    list: vi.fn(() => Promise.resolve([current.tournament])),
    view: vi.fn(() => Promise.resolve(current)),
    create: vi.fn().mockResolvedValue(current.tournament),
    register: vi.fn<RegistrationApi['register']>((_id, input) =>
      Promise.resolve(
        updateTeam({
          ...registrationTeamFixture('AWAITING_CONSENT'),
          name: input.name,
          avatar: input.avatar,
          companionId: input.companionId ?? null,
        }),
      ),
    ),
    consent: vi.fn<RegistrationApi['consent']>((_id, _team, _op, accept) =>
      Promise.resolve(
        updateTeam(registrationTeamFixture(accept ? 'PENDING_PAYMENT' : 'CANCELLED')),
      ),
    ),
    cancel: vi.fn<RegistrationApi['cancel']>(() =>
      Promise.resolve(updateTeam(registrationTeamFixture('CANCELLED'))),
    ),
    enter: vi.fn<RegistrationApi['enter']>(() => Promise.resolve(updateTeam(confirmed()))),
  } satisfies RegistrationApi
  const brackets = { view: vi.fn().mockResolvedValue(null), publish: vi.fn() }
  const encounters = { list: vi.fn().mockResolvedValue([]), detail: vi.fn() }
  const links = {
    view: vi.fn((id: string) =>
      Promise.resolve({
        tournamentId: id,
        liveUrl: null,
        youtubeArchiveUrl: null,
        revision: 0,
        updatedAt: null,
      }),
    ),
    save: vi.fn(),
  }
  const progress = {
    view: vi.fn().mockResolvedValue({ bracket: null, champion: null, eliminatedTeamIds: [] }),
  }
  const prizes = {
    view: vi.fn().mockResolvedValue({ configuration: null, champion: null, delivery: null }),
    approve: vi.fn(),
    deliver: vi.fn(),
  }
  const props = {
    api,
    brackets,
    encounters,
    links,
    progress,
    prizes,
    avatarDownload: devAvatarDownload,
  }
  const renderPage = () => renderWithProviders(<TournamentRegistrationPage {...props} />)
  return {
    api,
    props,
    renderPage,
    setView: (next: EntryView) => {
      current = next
    },
    view: () => current,
    updateTeam,
  }
}
beforeEach(() => {
  sessionStorage.clear()
  useSession.setState({
    subject: A,
    displayName: null,
    roles: ['PLAYER'],
    accessToken: 'unit-test-token',
    expiresAt: Date.now() + 60000,
  })
})
afterEach(() => {
  cleanup()
  sessionStorage.clear()
  useSession.setState({
    subject: null,
    displayName: null,
    roles: [],
    accessToken: null,
    expiresAt: null,
  })
  vi.restoreAllMocks()
})
describe('recorrido de Torneo v2: pruebas de componentes con dobles, sin Cognito real', () => {
  it('separa vistas y consulta premio/enlaces solo al abrir la sección pertinente', async () => {
    const test = setup(confirmed())
    test.renderPage()
    await screen.findByText('Cupo 8 confirmado')
    expect(test.props.prizes.view).not.toHaveBeenCalled()
    expect(test.props.links.view).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Premio' }))
    await waitFor(() => {
      expect(test.props.prizes.view).toHaveBeenCalledWith(T, expect.any(AbortSignal))
    })
    expect(screen.queryByRole('region', { name: 'Inscripción del equipo' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mi equipo' }))
    expect(await screen.findByText('Cupo 8 confirmado')).toBeInTheDocument()
  })
  it('obtiene el nombre propio de sesión y declara el nombre ajeno pendiente', async () => {
    useSession.setState({ displayName: 'Sofía' })
    setup(confirmed()).renderPage()
    expect(await screen.findByText('Sofía (tú)')).toBeVisible()
    expect(screen.getByText('Nombre del compañero pendiente')).toBeVisible()
    expect(screen.getByText(`Creador: ${A}`)).not.toBeVisible()
    expect(
      screen.getByText('Comprobantes de inscripción y pago').closest('details'),
    ).not.toHaveAttribute('open')
  })
  it('crear torneo abre el formulario separado únicamente para administración', async () => {
    const test = setup()
    const player = test.renderPage()
    await screen.findByLabelText(/^Nombre del equipo/u)
    expect(screen.queryByRole('button', { name: 'Crear torneo' })).not.toBeInTheDocument()
    player.unmount()
    useSession.setState({ roles: ['ADMINISTRATOR'] })
    test.renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Crear torneo' }))
    expect(screen.getByRole('form', { name: 'Creación de torneo' })).toBeVisible()
    expect(
      screen.queryByRole('navigation', { name: 'Secciones del torneo' }),
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver al torneo' }))
    expect(await screen.findByRole('navigation', { name: 'Secciones del torneo' })).toBeVisible()
  })
  it('desde las llaves publicadas abre el historial de la justa por su ID recibido', async () => {
    const fixture = createRegistrationPreviewApis()
    const snapshot = await fixture.brackets.publish(T, 'qa-publish')
    const test = setup()
    test.setView({
      ...test.view(),
      tournament: { ...test.view().tournament, open: false, bracketPublished: true },
      capacity: { confirmed: 8, reserved: 0, available: 0 },
    })
    renderWithProviders(
      <TournamentRegistrationPage
        {...test.props}
        brackets={fixture.brackets}
        encounters={fixture.encounters}
      />,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Llaves' }))
    await userEvent.click(
      await within(await screen.findByRole('region', { name: 'Llaves del torneo' })).findByRole(
        'button',
        {
          name: /^E1 · Ronda/u,
        },
      ),
    )
    await userEvent.click(screen.getByRole('link', { name: 'Ver registro de E1' }))
    expect(await screen.findByText('Todavía no hay eventos conservados.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Registro del combate E1' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Registro de justas' })).getByRole('combobox', {
        name: 'Elegir justa',
      }),
    ).toHaveValue(snapshot.matches[0]!.encounterId)
    expect(snapshot.matches[0]!.encounterId).not.toBe('E1')
    expect(
      screen.queryByRole('button', { name: /Preparar|Iniciar combate|Elegir ganador/u }),
    ).not.toBeInTheDocument()
  })
  it('registra dos miembros con avatar de cuenta y comprobante distinto del cupo', async () => {
    const test = setup()
    test.renderPage()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/^Nombre del equipo/u), 'Alpha Team')
    await user.type(screen.getByLabelText(/^Código de tu compañero/u), B)
    await user.selectOptions(screen.getByLabelText('Avatar del equipo'), 'companion')
    await user.click(screen.getByRole('button', { name: 'Registrar equipo' }))
    expect(await screen.findByText('Esperando aceptación del compañero')).toBeInTheDocument()
    expect(test.api.register.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        name: 'Alpha Team',
        companionId: B,
        avatar: { kind: 'ACCOUNT_AVATAR', subject: B },
      }),
    )
    expect(test.api.register.mock.calls[0]?.[1]).not.toHaveProperty('ownerId')
    await user.click(screen.getByText('Comprobante de registro'))
    expect(screen.getByText('dev-registration-receipt')).toBeInTheDocument()
    expect(screen.queryByText(/Cupo 8 confirmado/u)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aceptar participar' })).not.toBeInTheDocument()
  })
  it('el compañero acepta desde su identidad y no obtiene controles de pago del creador', async () => {
    useSession.setState({ subject: B })
    const test = setup(registrationTeamFixture('AWAITING_CONSENT'))
    test.renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar participar' }))
    expect(await screen.findByText('Pendiente de confirmar el cupo')).toBeInTheDocument()
    expect(test.api.consent.mock.calls[0]).toEqual([T, 'dev-team-A-B', expect.any(String), true])
    expect(screen.queryByLabelText(/^Método de inscripción/u)).not.toBeInTheDocument()
    expect(test.api.enter).not.toHaveBeenCalled()
  })
  it('muestra precio/unidad antes de confirmar créditos y separa ambos recibos', async () => {
    const test = setup(registrationTeamFixture())
    test.renderPage()
    await userEvent.selectOptions(
      await screen.findByLabelText(/^Método de inscripción/u),
      'CREDITS',
    )
    expect(screen.getByText('Importe: 100 créditos. Paga el creador.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Pagar 100 créditos y confirmar' }))
    expect(await screen.findByText('Cupo 8 confirmado')).toBeInTheDocument()
    expect(test.api.enter.mock.calls[0]?.[2]).toEqual({
      operationId: expect.any(String),
      method: 'CREDITS',
    })
    expect(screen.getByText('Comprobante de inscripción: entry-receipt')).toBeInTheDocument()
    expect(screen.getByText('Comprobante de pago: wallet-charge')).toBeInTheDocument()
  })
  it('simula con importe de moneda configurada y no persiste tarjeta/CVV', async () => {
    const test = setup(registrationTeamFixture())
    test.api.enter.mockImplementation(() =>
      Promise.resolve(test.updateTeam(confirmed('SIMULATED_MONEY'))),
    )
    test.renderPage()
    const user = userEvent.setup()
    await user.selectOptions(
      await screen.findByLabelText(/^Método de inscripción/u),
      'SIMULATED_MONEY',
    )
    expect(
      screen.getByText('Importe: 1.250,50 COP · pago simulado. Paga el creador.'),
    ).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Titular de la tarjeta de prueba/u), 'Tarjeta Prueba')
    await user.type(screen.getByLabelText(/^Número de tarjeta de prueba/u), '4111111111111111')
    await user.type(screen.getByLabelText(/^Vencimiento de prueba/u), '12/30')
    await user.type(screen.getByLabelText(/^Código de seguridad de prueba/u), '987')
    await user.click(screen.getByRole('button', { name: /Pagar 1.250,50 COP/u }))
    expect(await screen.findByText('No se movió dinero real.')).toBeInTheDocument()
    expect(test.api.enter.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        method: 'SIMULATED_MONEY',
        card: {
          holder: 'Tarjeta Prueba',
          number: '4111111111111111',
          expiry: '12/30',
          securityCode: '987',
        },
      }),
    )
    expect(JSON.stringify(sessionStorage)).not.toMatch(/4111111111111111|987|Tarjeta Prueba/u)
  })
  it('tras una respuesta perdida y remontaje, comprueba el mismo pago sin reenviar tarjeta', async () => {
    const test = setup(registrationTeamFixture())
    test.api.enter.mockRejectedValueOnce(new TypeError('Respuesta perdida'))
    const first = test.renderPage()
    const user = userEvent.setup()
    await user.selectOptions(
      await screen.findByLabelText(/^Método de inscripción/u),
      'SIMULATED_MONEY',
    )
    for (const [label, value] of [
      ['Titular de la tarjeta de prueba', 'Test'],
      ['Número de tarjeta de prueba', '1111'],
      ['Vencimiento de prueba', '12/30'],
      ['Código de seguridad de prueba', '999'],
    ])
      await user.type(screen.getByLabelText(new RegExp(label!)), value!)
    await user.click(screen.getByRole('button', { name: /Pagar 1.250,50 COP/u }))
    expect(await screen.findByText('Respuesta perdida')).toBeInTheDocument()
    const operationId = test.api.enter.mock.calls[0]?.[2].operationId
    expect(screen.getByLabelText(/^Método de inscripción/u)).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar registro' })).toBeDisabled()
    expect(JSON.stringify(sessionStorage)).not.toMatch(/999|holder|securityCode|number/u)
    first.unmount()
    test.api.enter.mockImplementation(() =>
      Promise.resolve(test.updateTeam(confirmed('SIMULATED_MONEY'))),
    )
    test.renderPage()
    await user.click(await screen.findByRole('button', { name: 'Comprobar el mismo intento' }))
    expect(test.api.enter.mock.calls[1]?.[2]).toEqual({ operationId, method: 'SIMULATED_MONEY' })
    expect(await screen.findByText('Cupo 8 confirmado')).toBeInTheDocument()
  })
  it('rechazo durable: la corrección explícita permite un nuevo intento', async () => {
    const test = setup(registrationTeamFixture())
    test.api.enter.mockRejectedValueOnce(
      new HttpError(422, 'Saldo insuficiente', { code: 'INSUFFICIENT_BALANCE' }),
    )
    test.renderPage()
    const user = userEvent.setup()
    await user.selectOptions(await screen.findByLabelText(/^Método de inscripción/u), 'CREDITS')
    await user.click(screen.getByRole('button', { name: 'Pagar 100 créditos y confirmar' }))
    expect(await screen.findByText('Saldo insuficiente')).toBeInTheDocument()
    const firstId = test.api.enter.mock.calls[0]?.[2].operationId
    expect(screen.queryByText('Cupo 8 confirmado')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Corregir y realizar un nuevo intento' }))
    await user.click(screen.getByRole('button', { name: 'Pagar 100 créditos y confirmar' }))
    expect(await screen.findByText('Cupo 8 confirmado')).toBeInTheDocument()
    expect(test.api.enter.mock.calls[1]?.[2].operationId).not.toBe(firstId)
    expect(screen.queryByText('Saldo insuficiente')).not.toBeInTheDocument()
  })
  it('confirmación gratis no envía método, tarjeta ni importe inventado', async () => {
    const test = setup(registrationTeamFixture())
    test.setView({
      ...test.view(),
      tournament: {
        ...test.view().tournament,
        entryPolicy: { version: 1, free: true, methods: [] },
        entryFee: 0,
      },
    })
    test.api.enter.mockImplementation(() => Promise.resolve(test.updateTeam(confirmed('FREE'))))
    test.renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar cupo gratis' }))
    expect(test.api.enter.mock.calls[0]?.[2]).toEqual({ operationId: expect.any(String) })
    expect(await screen.findByText('Gratis · sin cobro')).toBeInTheDocument()
    expect(screen.queryByText(/Comprobante de pago/u)).not.toBeInTheDocument()
  })
  it('no ofrece otro cobro/cancelación mientras hay reserva/compensación ajena a este cliente', async () => {
    const test = setup(registrationTeamFixture('COMPENSATING'))
    test.renderPage()
    expect(
      await screen.findByText('Comprobando la devolución · cupo sin confirmar'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comprobar el mismo intento' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Cancelar registro' })).not.toBeInTheDocument()
    expect(test.api.enter).not.toHaveBeenCalled()
  })
  it('un cambio externo de consentimiento limpia el error antiguo y permite el siguiente paso', async () => {
    useSession.setState({ subject: B })
    const test = setup(registrationTeamFixture('AWAITING_CONSENT'))
    test.api.consent.mockRejectedValueOnce(new HttpError(503, 'Aceptación incierta', {}))
    const { queryClient } = test.renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar participar' }))
    expect(await screen.findByText('Aceptación incierta')).toBeInTheDocument()
    test.updateTeam(registrationTeamFixture())
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournament-registration', B, T] })
    })
    expect(await screen.findByText('Pendiente de confirmar el cupo')).toBeInTheDocument()
    expect(screen.queryByText('Aceptación incierta')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar registro' })).toBeEnabled()
  })
  it('cancelar deja histórico y permite un registro nuevo sin reutilizar el consentimiento', async () => {
    const test = setup(registrationTeamFixture('AWAITING_CONSENT'))
    test.renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar registro' }))
    expect(await screen.findByText('Equipo de prueba · Registro cancelado')).toBeInTheDocument()
    expect(await screen.findByLabelText(/^Nombre del equipo/u)).toHaveValue('')
    expect(screen.queryByText('Esperando aceptación del compañero')).not.toBeInTheDocument()
  })
  it('error de lectura tiene reintento y bloquea mutaciones sobre datos desactualizados', async () => {
    const test = setup()
    test.api.view.mockRejectedValueOnce(new Error('Red caída'))
    test.renderPage()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Volver a consultar inscripción' }),
    )
    expect(await screen.findByLabelText(/^Nombre del equipo/u)).toBeInTheDocument()
    expect(test.api.view).toHaveBeenCalledTimes(2)
  })
  it('la misma identidad no se registra como compañero', async () => {
    const test = setup()
    test.renderPage()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/^Código de tu compañero/u), A)
    expect(
      screen.getByText('Elige otro jugador; los dos integrantes deben ser distintos.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar equipo' })).toBeDisabled()
    expect(test.api.register).not.toHaveBeenCalled()
  })
  it('cambiar sesión descarta formularios y datos del actor anterior', async () => {
    const test = setup()
    test.renderPage()
    await userEvent.type(await screen.findByLabelText(/^Nombre del equipo/u), 'Nombre privado')
    act(() => {
      useSession.setState({ subject: B })
    })
    await waitFor(() => expect(screen.getByLabelText('Tu código de jugador')).toHaveValue(B))
    expect(await screen.findByLabelText(/^Nombre del equipo/u)).toHaveValue('')
  })
})
