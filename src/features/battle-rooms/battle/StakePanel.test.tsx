import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { StakePanel } from './StakePanel'
import { ROOM_ID } from './fixtures'
import type { WalletSnapshot } from './api'
import type { BattleRoom, ParticipantStakeStatus } from '../types'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const WALLET: WalletSnapshot = {
  balance: 90,
  reserved: 0,
  available: 90,
  victoryProgress: 0,
  weeklyChestCount: 0,
  weeklyChestLimit: 2,
  threshold: 20,
}

const roomWithStake = (status: ParticipantStakeStatus | null, amount = 10): BattleRoom => ({
  id: ROOM_ID,
  mode: 'PVP',
  status: 'FINISHED',
  teams: [
    {
      label: 'A',
      capacity: 1,
      participants: [
        {
          kind: 'HUMAN',
          playerId: 'sujeto-ana',
          heroId: 'heroe-ana',
          joinedAt: '2026-09-22T10:00:00.000Z',
          displayName: 'Ana',
          ...(status === null ? {} : { stake: { amount, status } }),
        },
      ],
    },
    { label: 'B', capacity: 1, participants: [] },
  ],
  reward: { amount: 0 },
  createdBy: 'sujeto-ana',
  createdAt: '2026-09-22T10:00:00.000Z',
  version: 4,
  stakePool: { total: 0 },
})

const stubFetch = (room: BattleRoom, wallet: WalletSnapshot = WALLET): void => {
  const fetchImpl = vi.fn((url: string) => {
    if (url.includes('/wallet/me')) {
      return Promise.resolve(jsonResponse(wallet))
    }
    if (url.includes(`/rooms/${ROOM_ID}`)) {
      return Promise.resolve(jsonResponse(room))
    }
    return Promise.resolve(jsonResponse({ message: `Ruta inesperada: ${url}` }, 404))
  })
  vi.stubGlobal('fetch', fetchImpl)
}

const authenticate = (subject: string): void => {
  useSession.setState({ subject, accessToken: 'token-vigente', expiresAt: Date.now() + 900_000 })
}

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('StakePanel (HU-23)', () => {
  it('el ganador ve su apuesta ganada y el saldo que publica Wallet', async () => {
    stubFetch(roomWithStake('SETTLED_WON'))
    authenticate('sujeto-ana')

    renderWithProviders(<StakePanel roomId={ROOM_ID} subject="sujeto-ana" />)

    expect(await screen.findByText('Apuesta ganada: 10 créditos')).toBeInTheDocument()
    expect(await screen.findByText('90 créditos')).toBeInTheDocument()
  })

  it('el perdedor ve su apuesta perdida, sin saldo inventado', async () => {
    stubFetch(roomWithStake('CAPTURED'))
    authenticate('sujeto-ana')

    renderWithProviders(<StakePanel roomId={ROOM_ID} subject="sujeto-ana" />)

    expect(await screen.findByText('Perdiste tu apuesta de 10 créditos')).toBeInTheDocument()
  })

  it('NO_WINNER muestra la apuesta liberada (D3)', async () => {
    stubFetch(roomWithStake('RELEASED'))
    authenticate('sujeto-ana')

    renderWithProviders(<StakePanel roomId={ROOM_ID} subject="sujeto-ana" />)

    expect(await screen.findByText('Se liberó tu apuesta de 10 créditos')).toBeInTheDocument()
  })

  it('un estado no terminal se muestra como reservada, nunca como resultado adelantado', async () => {
    stubFetch(roomWithStake('ACTIVE'))
    authenticate('sujeto-ana')

    renderWithProviders(<StakePanel roomId={ROOM_ID} subject="sujeto-ana" />)

    expect(await screen.findByText('Apuesta reservada: 10 créditos')).toBeInTheDocument()
    expect(screen.queryByText(/ganada|perdiste|liberó/iu)).not.toBeInTheDocument()
  })

  it('sin apuesta propia no se renderiza ninguna seccion (regresion)', async () => {
    stubFetch(roomWithStake(null))
    authenticate('sujeto-ana')

    const { container } = renderWithProviders(<StakePanel roomId={ROOM_ID} subject="sujeto-ana" />)

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(container).toBeEmptyDOMElement()
  })

  it('sin sesion no se muestra nada', () => {
    stubFetch(roomWithStake('ACTIVE'))

    const { container } = renderWithProviders(<StakePanel roomId={ROOM_ID} subject={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})
