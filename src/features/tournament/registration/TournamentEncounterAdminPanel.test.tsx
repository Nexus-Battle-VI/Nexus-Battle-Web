import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { HttpError } from '@/lib/http'
import {
  createEncounterAdminFixture,
  DEV_ADMIN_TOURNAMENT_ID,
} from '@/features/tournament/dev/encounterAdminFixtures'
import { createRegistrationPreviewApis } from '@/features/tournament/dev/registrationFixtures'
import { explainAdminError } from './encounterAdminErrors'
import { TournamentEncounterAdminPanel } from './TournamentEncounterAdminPanel'
import { TournamentEncountersPanel } from './TournamentEncountersPanel'
import { TournamentRegistrationPage } from './TournamentRegistrationPage'

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})
const ID = DEV_ADMIN_TOURNAMENT_ID
const row = (label: string): HTMLElement => screen.getByRole('listitem', { name: `Justa ${label}` })
const renderPanel = (fixture = createEncounterAdminFixture()) => {
  renderWithProviders(
    <TournamentEncounterAdminPanel
      id={ID}
      subject="dev-admin"
      encounters={fixture.encounters}
      admin={fixture.admin}
    />,
  )
  return fixture
}

describe('HU-85.3 administración de justas simultáneas', () => {
  it('lista las catorce justas con su estado y las acciones Preparar e Iniciar', async () => {
    renderPanel()
    expect(screen.getByRole('status')).toHaveTextContent('Consultando justas')
    expect(await screen.findByRole('listitem', { name: 'Justa E1' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem', { name: /^Justa / })).toHaveLength(14)
    expect(within(row('E1')).getByText('Equipos definidos; preparación pendiente')).toBeVisible()
    expect(within(row('E1')).getByRole('button', { name: 'Preparar E1' })).toBeEnabled()
    expect(within(row('E1')).getByRole('button', { name: 'Iniciar E1' })).toBeDisabled()
    expect(within(row('E5')).getByText(/Faltan participantes/u)).toBeVisible()
  })

  it('E1 y E2 se preparan e inician a la vez, sin esperarse ni depender de la transmisión', async () => {
    const fixture = renderPanel(createEncounterAdminFixture({ delayMs: 400 }))
    const user = userEvent.setup()
    await screen.findByRole('listitem', { name: 'Justa E1' })
    await user.click(within(row('E1')).getByRole('button', { name: 'Preparar E1' }))
    await user.click(within(row('E2')).getByRole('button', { name: 'Preparar E2' }))
    // Ambas acciones están en vuelo al mismo tiempo: cada fila tiene su propia operación.
    expect(within(row('E1')).getByRole('button', { name: 'Preparar E1' })).toBeDisabled()
    expect(within(row('E2')).getByRole('button', { name: 'Preparar E2' })).toBeDisabled()
    await waitFor(() => {
      expect(within(row('E1')).getByRole('button', { name: 'Iniciar E1' })).toBeEnabled()
      expect(within(row('E2')).getByRole('button', { name: 'Iniciar E2' })).toBeEnabled()
    })
    await user.click(within(row('E1')).getByRole('button', { name: 'Iniciar E1' }))
    await user.click(within(row('E2')).getByRole('button', { name: 'Iniciar E2' }))
    await waitFor(() => {
      expect(within(row('E1')).getByText('En curso')).toBeVisible()
      expect(within(row('E2')).getByText('En curso')).toBeVisible()
    })
    expect(fixture.calls).toEqual({ prepare: 2, start: 2 })
    expect(within(row('E1')).getByText(/Iniciada por dev-admin/u)).toBeVisible()
    expect(within(row('E3')).getByRole('button', { name: 'Preparar E3' })).toBeEnabled()
  }, 20000)

  it('rechaza preparar una semifinal sin participantes y explica por qué', async () => {
    const fixture = renderPanel()
    const user = userEvent.setup()
    await screen.findByRole('listitem', { name: 'Justa E5' })
    await user.click(within(row('E5')).getByRole('button', { name: 'Preparar E5' }))
    const alert = await within(row('E5')).findByRole('alert')
    expect(alert).toHaveTextContent('todavía no tiene a sus dos equipos definidos')
    expect(alert).toHaveTextContent('No se creó ninguna sala')
    expect(alert).toHaveTextContent('no hay ganador')
    expect(fixture.calls.prepare).toBe(0)
    expect(within(row('E5')).queryByText(/Sala de Combat/u)).not.toBeInTheDocument()
    expect(within(row('E5')).getByRole('button', { name: 'Iniciar E5' })).toBeDisabled()
  })

  it('con Combat caído conserva la misma operación al reintentar y no duplica la sala', async () => {
    const fixture = createEncounterAdminFixture()
    const prepare = vi.spyOn(fixture.admin, 'prepare')
    renderPanel(fixture)
    const user = userEvent.setup()
    await screen.findByRole('listitem', { name: 'Justa E3' })
    fixture.setCombatDown(true)
    await user.click(within(row('E3')).getByRole('button', { name: 'Preparar E3' }))
    expect(await within(row('E3')).findByRole('alert')).toHaveTextContent(
      'Combat no está disponible',
    )
    fixture.setCombatDown(false)
    await user.click(within(row('E3')).getByRole('button', { name: 'Preparar E3' }))
    await waitFor(() => {
      expect(within(row('E3')).getByText(/Sala de Combat: dev-room-E3/u)).toBeVisible()
    })
    const operations = prepare.mock.calls.map((call) => call[2])
    expect(operations).toHaveLength(2)
    expect(operations[0]).toBe(operations[1])
    expect(fixture.calls.prepare).toBe(1)
  })

  it('muestra error de carga con reintento y no cae en silencio', async () => {
    const fixture = createEncounterAdminFixture()
    const list = vi.spyOn(fixture.encounters, 'list').mockRejectedValueOnce(new Error('caído'))
    renderPanel(fixture)
    expect(await screen.findByText(/No se pudo consultar las justas/u)).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Volver a consultar justas' }))
    expect(await screen.findByRole('listitem', { name: 'Justa E1' })).toBeVisible()
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('la vista de consulta no ofrece controles administrativos', async () => {
    const fixture = createEncounterAdminFixture()
    renderWithProviders(
      <TournamentEncountersPanel id={ID} subject="dev-admin" api={fixture.encounters} />,
    )
    expect(await screen.findByText('E1 · Ronda 1')).toBeVisible()
    expect(screen.queryByRole('button', { name: /^(Preparar|Iniciar)/u })).not.toBeInTheDocument()
  })

  it('solo los administradores ven el panel dentro de /tournament', async () => {
    const { api, brackets } = createRegistrationPreviewApis()
    const fixture = createEncounterAdminFixture()
    const page = (roles: readonly string[]) => (
      <TournamentRegistrationPage
        api={api}
        brackets={brackets}
        encounters={fixture.encounters}
        encounterAdmin={fixture.admin}
        identity={{ subject: 'dev-user', roles }}
      />
    )
    const first = renderWithProviders(page(['PLAYER']))
    expect(await screen.findByRole('region', { name: 'Registro de justas' })).toBeVisible()
    expect(
      screen.queryByRole('region', { name: 'Administración de justas' }),
    ).not.toBeInTheDocument()
    first.unmount()
    renderWithProviders(page(['ADMINISTRATOR']))
    expect(await screen.findByRole('region', { name: 'Administración de justas' })).toBeVisible()
  })
})

describe('explicación de rechazos del servidor', () => {
  const failure = (status: number, body: object) => new HttpError(status, 'mensaje', body)
  it.each([
    [409, { code: 'ENCOUNTER_NOT_PREPARED' }, 'Primero hay que preparar'],
    [409, { code: 'ENCOUNTER_FINISHED' }, 'ya terminó'],
    [409, { code: 'BRACKET_NOT_PUBLISHED' }, 'llaves publicadas'],
    [409, { code: 'OPERATION_CONFLICT' }, 'otra acción'],
    [404, { code: 'ENCOUNTER_NOT_FOUND' }, 'no pertenece a este torneo'],
    [409, { code: 'COMBAT_ROOM_CONFLICT' }, 'no reconoce la sala'],
    [403, {}, 'no tiene permiso'],
    [500, { code: 'OTRO' }, 'mensaje'],
  ])('%i %j', (status, body, text) => {
    expect(explainAdminError(failure(status, body))).toContain(text)
  })
  it('lista los bloqueos que informa Combat sin inventar participantes', () => {
    const text = explainAdminError(
      failure(422, {
        code: 'COMBAT_REJECTED_PARTICIPANTS',
        blockers: [{ playerId: 'p3', reason: 'NO_EQUIPPED_HERO' }, { code: 'X' }, 'raro'],
      }),
    )
    expect(text).toContain('p3 (NO_EQUIPPED_HERO)')
    expect(text).toContain('un participante (X)')
    expect(text).toContain('No se vinculó ninguna sala')
    expect(explainAdminError(failure(422, { code: 'COMBAT_REJECTED_PARTICIPANTS' }))).toContain(
      'sin detalle',
    )
  })
  it('un fallo de red no afirma ningún resultado', () => {
    expect(explainAdminError(new Error('red'))).toContain('Reintenta')
  })
})
