import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useSession } from '@/shared/session'
import { renderWithProviders } from '@/test/render'

import { CreateBattleRoomPanel } from './CreateBattleRoomPanel'
import type { BattleRoom } from './types'

const room = (): BattleRoom => ({
  id: 'e5f0d655-cd1f-411b-8350-2a5dc6e5ced6',
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    { label: 'A', capacity: 1, participants: [] },
    { label: 'B', capacity: 1, participants: [] },
  ],
  reward: { amount: 0 },
  createdBy: 'sujeto-ana',
  createdAt: '2026-01-01T00:00:00.000Z',
  version: 1,
  stakePool: { total: 0 },
})

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

interface Harness {
  readonly fetchImpl: ReturnType<typeof vi.fn>
  readonly postBodyOf: () => Record<string, unknown>
}

const setup = (available = 100): Harness => {
  const fetchImpl = vi.fn((input: string, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : String(input)

    if (init?.method === 'POST') {
      return Promise.resolve(jsonResponse(201, room()))
    }

    if (url.endsWith('/v1/wallet/me')) {
      return Promise.resolve(
        jsonResponse(200, {
          balance: available,
          reserved: 0,
          available,
          victoryProgress: 0,
          weeklyChestCount: 0,
          weeklyChestLimit: 2,
          threshold: 20,
        }),
      )
    }

    return Promise.resolve(jsonResponse(200, []))
  })
  vi.stubGlobal('fetch', fetchImpl)
  useSession.setState({
    subject: 'sujeto-ana',
    accessToken: 'token-vigente',
    expiresAt: Date.now() + 900_000,
  })

  return {
    fetchImpl,
    postBodyOf: () => {
      const postCall = fetchImpl.mock.calls.find(([, init]) => init?.method === 'POST')
      const body = postCall?.[1]?.body as string | undefined

      return JSON.parse(body ?? '{}') as Record<string, unknown>
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('CreateBattleRoomPanel — apuesta (HU-23)', () => {
  it('el campo de apuesta aparece en JcJ y NO existe en JcE (D4)', async () => {
    setup()
    const user = userEvent.setup()

    renderWithProviders(<CreateBattleRoomPanel />)

    expect(screen.getByLabelText('Apostar créditos (opcional)')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Jugador vs Máquina/u }))

    expect(screen.queryByLabelText('Apostar créditos (opcional)')).not.toBeInTheDocument()
  })

  it('sin apuesta el cuerpo es EXACTAMENTE el de antes de HU-23 (regresion)', async () => {
    const harness = setup()
    const user = userEvent.setup()

    renderWithProviders(<CreateBattleRoomPanel />)
    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    await waitFor(() => {
      expect(harness.fetchImpl).toHaveBeenCalledWith(
        '/api/v1/combat/rooms',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    expect(harness.postBodyOf()).toEqual({
      mode: 'PVP',
      teamConfigs: [{ capacity: 1 }, { capacity: 1 }],
      reward: { amount: 0 },
    })
  })

  it('con apuesta el creador se declara participante HUMAN con su monto, sin playerId', async () => {
    const harness = setup()
    const user = userEvent.setup()

    renderWithProviders(<CreateBattleRoomPanel />)
    await user.clear(screen.getByLabelText('Apostar créditos (opcional)'))
    await user.type(screen.getByLabelText('Apostar créditos (opcional)'), '15')
    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    await waitFor(() => {
      expect(harness.fetchImpl).toHaveBeenCalledWith(
        '/api/v1/combat/rooms',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    const body = harness.postBodyOf()

    expect(body).not.toHaveProperty('createdBy')
    expect(body).not.toHaveProperty('playerId')
    expect(body).toEqual({
      mode: 'PVP',
      teamConfigs: [
        { capacity: 1, initialParticipants: [{ kind: 'HUMAN', stake: { amount: 15 } }] },
        { capacity: 1 },
      ],
      reward: { amount: 0 },
    })
  })

  it('avisa (sin bloquear) cuando el monto supera el disponible que publica Wallet', async () => {
    setup(5)
    const user = userEvent.setup()

    renderWithProviders(<CreateBattleRoomPanel />)
    await user.clear(screen.getByLabelText('Apostar créditos (opcional)'))
    await user.type(screen.getByLabelText('Apostar créditos (opcional)'), '10')

    expect(await screen.findByText('Tu saldo disponible es 5 créditos.')).toBeInTheDocument()
    // No bloquea el envio: la validacion autoritativa es de Wallet.
    expect(screen.getByRole('button', { name: 'Crear sala de batalla' })).toBeEnabled()
  })

  it('un monto invalido se avisa y NO se envia nada', async () => {
    const harness = setup()
    const user = userEvent.setup()

    renderWithProviders(<CreateBattleRoomPanel />)
    await user.clear(screen.getByLabelText('Apostar créditos (opcional)'))
    await user.type(screen.getByLabelText('Apostar créditos (opcional)'), '1.5')
    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/número entero/u)
    expect(
      harness.fetchImpl.mock.calls.some(
        (call) => (call[1] as RequestInit | undefined)?.method === 'POST',
      ),
    ).toBe(false)
  })
})
