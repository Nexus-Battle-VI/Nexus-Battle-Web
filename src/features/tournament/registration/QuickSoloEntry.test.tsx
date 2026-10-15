import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { registrationTeamFixture } from '@/features/tournament/dev/registrationFixtures'
import { MODALITIES_CONTRACT_VERSION, type EntryTeam, type RegistrationApi } from './api'
import { QuickSoloEntry } from './QuickSoloEntry'

const pending: EntryTeam = {
  ...registrationTeamFixture(),
  name: 'Carlos',
  ownerId: 'Carlos',
  companionId: null,
  avatar: { kind: 'ACCOUNT_AVATAR', subject: 'Carlos' },
  members: [
    { subject: 'Carlos', position: 0, consentAt: '2026-10-14T12:00:00Z', consentVersion: 'v3' },
  ],
}
const confirmed: EntryTeam = {
  ...pending,
  status: 'CONFIRMED',
  slot: 1,
  entryReceipt: {
    id: 'entry-receipt',
    kind: 'ENTRY_CONFIRMATION',
    tournamentId: pending.tournamentId,
    teamId: pending.id,
    slot: 1,
    confirmedAt: '2026-10-14T12:00:01Z',
    payment: {
      method: 'FREE',
      amount: 0,
      chargeId: null,
      payerId: 'Carlos',
      realMoneyMoved: false,
    },
  },
}
const setup = (team?: EntryTeam) => {
  const register = vi.fn<RegistrationApi['register']>().mockResolvedValue(pending)
  const enter = vi.fn<RegistrationApi['enter']>().mockResolvedValue(confirmed)
  const onResult = vi.fn().mockResolvedValue(undefined)
  const props = {
    subject: 'Carlos',
    id: 'T',
    displayName: 'Carlos',
    team,
    generation: '',
    contractVersion: MODALITIES_CONTRACT_VERSION,
    api: { register, enter } as unknown as RegistrationApi,
    open: true,
    available: 8,
    canMutate: true,
    bracketPublished: false,
    onResult,
    onBracket: vi.fn(),
  }
  return {
    register,
    enter,
    onResult,
    props,
    render: () => renderWithProviders(<QuickSoloEntry {...props} />),
  }
}
beforeEach(() => {
  sessionStorage.clear()
  useSession.setState({
    subject: 'Carlos',
    roles: ['PLAYER'],
    accessToken: 'qa-unit',
    expiresAt: Date.now() + 60000,
  })
})
afterEach(() => {
  cleanup()
  useSession.setState({ subject: null, roles: [], accessToken: null, expiresAt: null })
  sessionStorage.clear()
  vi.restoreAllMocks()
})

it('un clic registra y confirma gratis con dos intenciones distintas y comprobante real', async () => {
  const test = setup()
  test.render()
  expect(screen.getByLabelText(/Nombre de tu participación/u)).toHaveValue('Carlos')
  expect(screen.getByLabelText(/Nombre de tu participación/u)).not.toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Inscribirme gratis' }))
  expect(await screen.findByRole('heading', { name: '¡Ya estás dentro!' })).toBeVisible()
  expect(test.register).toHaveBeenCalledOnce()
  expect(test.enter).toHaveBeenCalledOnce()
  expect(test.register.mock.calls[0]![1]).toEqual({
    operationId: expect.any(String),
    name: 'Carlos',
    invitedMemberIds: [],
    avatar: { kind: 'ACCOUNT_AVATAR', subject: 'Carlos' },
  })
  expect(test.enter.mock.calls[0]![2]).toEqual({ operationId: expect.any(String) })
  expect(test.enter.mock.calls[0]![2].operationId).not.toBe(
    test.register.mock.calls[0]![1].operationId,
  )
  expect(screen.getByText('Cupo 1')).toBeVisible()
  expect(screen.getByText('Cupo: entry-receipt')).not.toBeVisible()
})
it('recupera el mismo intento de cupo al remontar tras una respuesta perdida, sin registrar otra vez', async () => {
  const test = setup()
  test.enter.mockRejectedValueOnce(new TypeError('Respuesta perdida'))
  const first = test.render()
  await userEvent.click(screen.getByRole('button', { name: 'Inscribirme gratis' }))
  expect(await screen.findByText('Respuesta perdida')).toBeVisible()
  expect(screen.queryByRole('heading', { name: '¡Ya estás dentro!' })).not.toBeInTheDocument()
  const original = test.enter.mock.calls[0]!
  first.unmount()
  test.props.team = pending
  test.render()
  await userEvent.click(screen.getByRole('button', { name: 'Comprobar inscripción' }))
  expect(await screen.findByRole('heading', { name: '¡Ya estás dentro!' })).toBeVisible()
  expect(test.enter.mock.calls[1]).toEqual(original)
  expect(test.register).toHaveBeenCalledOnce()
})
it('repite el registro con el mismo ID si su respuesta se pierde antes de conocer el equipo', async () => {
  const test = setup()
  test.register.mockRejectedValueOnce(new TypeError('Sin respuesta'))
  const first = test.render()
  await userEvent.click(screen.getByRole('button', { name: 'Inscribirme gratis' }))
  expect(await screen.findByText('Sin respuesta')).toBeVisible()
  expect(test.enter).not.toHaveBeenCalled()
  const original = test.register.mock.calls[0]!
  first.unmount()
  test.render()
  await userEvent.click(screen.getByRole('button', { name: 'Comprobar inscripción' }))
  await screen.findByRole('heading', { name: '¡Ya estás dentro!' })
  expect(test.register.mock.calls[1]).toEqual(original)
})
it('no confirma el cupo de una sesión anterior cuando cambia la cuenta durante el registro', async () => {
  const test = setup()
  let resolve!: (team: EntryTeam) => void
  test.register.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const first = test.render()
  await userEvent.click(screen.getByRole('button', { name: 'Inscribirme gratis' }))
  first.unmount()
  useSession.setState({ subject: 'GABO', accessToken: 'otra-sesion' })
  await act(async () => {
    resolve(pending)
    await Promise.resolve()
  })
  expect(test.enter).not.toHaveBeenCalled()
  expect(test.onResult).not.toHaveBeenCalled()
})
it('permite escribir el nombre completo si Account no devolvió un apodo', async () => {
  const test = setup()
  test.props.displayName = ''
  test.render()
  const name = screen.getByLabelText(/Nombre de tu participación/u)
  await userEvent.type(name, 'Carlos compañero')
  expect(name).toBeVisible()
  expect(name).toHaveValue('Carlos compañero')
})
it('un torneo lleno impide registrar y no anuncia un cupo confirmado', async () => {
  const test = setup()
  test.props.available = 0
  test.render()
  expect(screen.getByRole('button', { name: 'Inscribirme gratis' })).toBeDisabled()
  expect(screen.getByText('No hay cupos disponibles.')).toBeVisible()
  await waitFor(() => {
    expect(test.register).not.toHaveBeenCalled()
  })
})
it('al volver a la inscripción confirmada no pide esperar unas llaves ya publicadas', () => {
  const test = setup(confirmed)
  test.props.bracketPublished = true
  test.render()
  expect(screen.getByText('Tus llaves están listas. Consulta tu próximo encuentro.')).toBeVisible()
  expect(screen.queryByText(/Espera las llaves/u)).not.toBeInTheDocument()
})
