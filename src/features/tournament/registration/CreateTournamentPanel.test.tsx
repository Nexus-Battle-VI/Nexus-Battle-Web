import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { DEV_REGISTRATION_TOURNAMENT } from '@/features/tournament/dev/registrationFixtures'
import { CreateTournamentPanel } from './CreateTournamentPanel'
import type { RegistrationApi } from './api'

afterEach(() => {
  sessionStorage.clear()
})
const setup = () => {
  const create = vi.fn<RegistrationApi['create']>().mockResolvedValue(DEV_REGISTRATION_TOURNAMENT)
  const api = { create } as unknown as RegistrationApi
  const onCreated = vi.fn()
  const render = () =>
    renderWithProviders(
      <CreateTournamentPanel subject="admin-test" api={api} onCreated={onCreated} />,
    )
  return { create, onCreated, render }
}
const fillSchedule = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByRole('textbox', { name: 'Nombre del torneo' }), 'Torneo de prueba')
  for (const [name, value] of [
    ['Apertura de inscripción', '2026-10-05T10:00'],
    ['Cierre de inscripción', '2026-10-07T10:00'],
    ['Inicio del torneo', '2026-10-08T10:00'],
  ])
    await user.type(screen.getByLabelText(new RegExp(name!)), value!)
}
describe('configuración administrativa sin tarifas inventadas', () => {
  it('envía política explícita e importes independientes con precisión exacta', async () => {
    const test = setup()
    test.render()
    const user = userEvent.setup()
    await user.click(screen.getByText('Crear torneo · administración'))
    await fillSchedule(user)
    await user.selectOptions(screen.getByLabelText(/Política de inscripción/u), 'BOTH')
    await user.type(screen.getByLabelText(/Importe en créditos/u), '250')
    await user.type(screen.getByLabelText(/Importe de dinero simulado/u), '12.345')
    await user.type(screen.getByLabelText(/Código de moneda/u), 'USD')
    await user.type(screen.getByLabelText(/Decimales de la moneda/u), '3')
    await user.click(screen.getByRole('button', { name: 'Crear torneo' }))
    expect(test.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        entryPolicy: {
          version: 1,
          free: false,
          methods: [
            { method: 'CREDITS', amount: 250 },
            { method: 'SIMULATED_MONEY', amountMinor: 12345, currency: 'USD', minorUnit: 3 },
          ],
        },
        opensAt: new Date('2026-10-05T10:00').toISOString(),
      }),
    )
    expect(test.create.mock.calls[0]?.[0]).not.toHaveProperty('entryFee')
    expect(test.create.mock.calls[0]?.[0]).not.toHaveProperty('ownerId')
    expect(test.onCreated).toHaveBeenCalledWith(DEV_REGISTRATION_TOURNAMENT.id)
  })
  it('valida orden de fechas sin simular el calendario global del servidor', async () => {
    const test = setup()
    test.render()
    const user = userEvent.setup()
    await user.click(screen.getByText('Crear torneo · administración'))
    await fillSchedule(user)
    await user.selectOptions(screen.getByLabelText(/Política de inscripción/u), 'FREE')
    await user.clear(screen.getByLabelText(/Inicio del torneo/u))
    await user.type(screen.getByLabelText(/Inicio del torneo/u), '2026-10-06T10:00')
    await user.click(screen.getByRole('button', { name: 'Crear torneo' }))
    expect(
      await screen.findByText(
        'La apertura debe ser anterior al cierre y el cierre no puede superar el inicio.',
      ),
    ).toBeInTheDocument()
    expect(test.create).not.toHaveBeenCalled()
  })
  it('recupera datos e intención de creación al remontar tras respuesta perdida', async () => {
    const test = setup()
    test.create.mockRejectedValueOnce(new TypeError('Respuesta perdida'))
    const first = test.render()
    const user = userEvent.setup()
    await user.click(screen.getByText('Crear torneo · administración'))
    await fillSchedule(user)
    await user.selectOptions(screen.getByLabelText(/Política de inscripción/u), 'FREE')
    await user.click(screen.getByRole('button', { name: 'Crear torneo' }))
    expect(await screen.findByText('Respuesta perdida')).toBeInTheDocument()
    const id = test.create.mock.calls[0]?.[0].operationId
    first.unmount()
    test.render()
    await user.click(screen.getByText('Crear torneo · administración'))
    expect(screen.getByLabelText(/Nombre del torneo/u)).toHaveValue('Torneo de prueba')
    await user.click(screen.getByRole('button', { name: 'Comprobar creación' }))
    expect(test.create.mock.calls[1]?.[0].operationId).toBe(id)
    expect(test.create.mock.calls[1]?.[0].entryPolicy).toEqual({
      version: 1,
      free: true,
      methods: [],
    })
  })
})
