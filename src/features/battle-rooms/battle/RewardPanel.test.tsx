import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { RewardPanel } from './RewardPanel'
import { ROOM_ID } from './fixtures'
import type { BattleRewardStatus, WalletSnapshot } from './api'

/**
 * Panel de creditos y cofre (HU-22, `hu-22-reward-contract-v1` S10). ADITIVO
 * a `BattleResultView` (HU-21): esa vista nunca muestra creditos (D4), este
 * panel es el unico lugar que lo hace. NO CALCULA NADA: todo numero llega
 * resuelto de Combat (`GET .../reward`) o Wallet (`GET /wallet/me`).
 */
const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const REWARD_NONE: BattleRewardStatus = {
  creditsEarned: null,
  balance: null,
  victoryProgress: null,
  weeklyChestCount: null,
  chestEarned: null,
  rewardDelivery: 'NONE',
  reward: null,
}

const REWARD_CREDITED_NO_CHEST: BattleRewardStatus = {
  creditsEarned: 2,
  balance: 16,
  victoryProgress: 12,
  weeklyChestCount: 0,
  chestEarned: false,
  rewardDelivery: 'NONE',
  reward: null,
}

const REWARD_PENDING_CHEST: BattleRewardStatus = {
  creditsEarned: 4,
  balance: 60,
  victoryProgress: 0,
  weeklyChestCount: 1,
  chestEarned: true,
  rewardDelivery: 'PENDING',
  reward: null,
}

const REWARD_CONFIRMED: BattleRewardStatus = {
  creditsEarned: 4,
  balance: 60,
  victoryProgress: 0,
  weeklyChestCount: 2,
  chestEarned: true,
  rewardDelivery: 'CONFIRMED',
  reward: { productId: 'p-1', sku: 'ARM-001', name: 'Armadura de Escamas' },
}

const REWARD_FAILED_AFTER_CREDIT: BattleRewardStatus = {
  creditsEarned: 4,
  balance: 60,
  victoryProgress: 0,
  weeklyChestCount: 1,
  chestEarned: true,
  rewardDelivery: 'FAILED',
  reward: null,
}

const REWARD_FAILED_BEFORE_CREDIT: BattleRewardStatus = {
  creditsEarned: 4,
  balance: null,
  victoryProgress: null,
  weeklyChestCount: null,
  chestEarned: null,
  rewardDelivery: 'FAILED',
  reward: null,
}

const WALLET: WalletSnapshot = {
  balance: 60,
  victoryProgress: 0,
  weeklyChestCount: 2,
  weeklyChestLimit: 2,
  threshold: 20,
}

const stubFetch = (reward: BattleRewardStatus, wallet: WalletSnapshot = WALLET): void => {
  const fetchImpl = vi.fn((url: string) => {
    if (url.includes('/reward')) {
      return Promise.resolve(jsonResponse(reward))
    }
    if (url.includes('/wallet/me')) {
      return Promise.resolve(jsonResponse(wallet))
    }
    return Promise.resolve(jsonResponse({ message: `Ruta inesperada: ${url}` }, 404))
  })
  vi.stubGlobal('fetch', fetchImpl)
}

/** El `subject` de sesion (de donde `useWallet` deduce el testimonio) coincide siempre con el prop (de donde viene el `battle-rooms/battle` que renderiza el panel): ambos salen del mismo JWT en produccion. */
const authenticate = (subject: string): void => {
  useSession.setState({ subject, accessToken: 'token-vigente', expiresAt: Date.now() + 900_000 })
}

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('RewardPanel — visibilidad (HU-22)', () => {
  it('sin sesion (espectador anonimo) no renderiza nada', () => {
    stubFetch(REWARD_CREDITED_NO_CHEST)

    const { container } = renderWithProviders(<RewardPanel battleId={ROOM_ID} subject={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('sin RewardWorkflow propio (espectador con sesion, o AI) no renderiza nada', async () => {
    authenticate('sujeto-ajeno')
    stubFetch(REWARD_NONE)

    const { container } = renderWithProviders(
      <RewardPanel battleId={ROOM_ID} subject="sujeto-ajeno" />,
    )

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })

  it('con creditos propios muestra el panel', async () => {
    authenticate('sujeto-ana')
    stubFetch(REWARD_CREDITED_NO_CHEST)

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    expect(await screen.findByText('+2 créditos')).toBeInTheDocument()
  })
})

describe('RewardPanel — creditos y saldo', () => {
  it('un solo credito usa singular', async () => {
    authenticate('sujeto-ana')
    stubFetch({ ...REWARD_CREDITED_NO_CHEST, creditsEarned: 1 })

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    expect(await screen.findByText('+1 crédito')).toBeInTheDocument()
  })

  it('mientras el saldo no se confirmo, dice "Confirmando…" y no inventa un numero', async () => {
    authenticate('sujeto-ana')
    stubFetch({ ...REWARD_PENDING_CHEST, balance: null })

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    expect(await screen.findByText('Confirmando…')).toBeInTheDocument()
  })

  it('el saldo confirmado se muestra tal cual llego de Wallet', async () => {
    authenticate('sujeto-ana')
    stubFetch(REWARD_CREDITED_NO_CHEST)

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    expect(await screen.findByText('16 créditos')).toBeInTheDocument()
  })
})

describe('RewardPanel — progreso del cofre (HU-22 §8)', () => {
  it('el meter expone min/max/now/valuetext y el texto visible coincide', async () => {
    authenticate('sujeto-ana')
    stubFetch(REWARD_CREDITED_NO_CHEST, { ...WALLET, victoryProgress: 12, threshold: 20 })

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    const meter = await screen.findByRole('meter', { name: 'Progreso hacia el próximo cofre' })

    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '20')
    expect(meter).toHaveAttribute('aria-valuenow', '12')
    expect(meter).toHaveAttribute('aria-valuetext', '12 / 20')
    expect(screen.getByText('12 / 20')).toBeInTheDocument()
  })

  it('el limite semanal alcanzado se anuncia en texto, no solo con color', async () => {
    authenticate('sujeto-ana')
    stubFetch(REWARD_CONFIRMED, { ...WALLET, weeklyChestCount: 2, weeklyChestLimit: 2 })

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    expect(await screen.findByText('Límite semanal alcanzado')).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('sin limite alcanzado no muestra el aviso', async () => {
    authenticate('sujeto-ana')
    stubFetch(REWARD_CREDITED_NO_CHEST, { ...WALLET, weeklyChestCount: 0, weeklyChestLimit: 2 })

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    await screen.findByText('16 créditos')
    expect(screen.queryByText('Límite semanal alcanzado')).toBeNull()
  })
})

describe('RewardPanel — entrega del cofre (HU-22 §9): PENDING nunca dice "entregado"', () => {
  it('PENDING muestra "Cofre obtenido" sin afirmar que ya esta en el inventario', async () => {
    authenticate('sujeto-ana')
    stubFetch(REWARD_PENDING_CHEST)

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    await screen.findByText('Cofre obtenido')
    expect(screen.queryByText(/añadida a tu inventario/u)).toBeNull()
  })

  it('CONFIRMED muestra el nombre real del producto entregado', async () => {
    authenticate('sujeto-ana')
    stubFetch(REWARD_CONFIRMED)

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    expect(
      await screen.findByText('Armadura de Escamas añadida a tu inventario ✓'),
    ).toBeInTheDocument()
  })

  it('sin cofre (NONE ya asentado) no muestra ninguna tarjeta de entrega', async () => {
    authenticate('sujeto-ana')
    stubFetch(REWARD_CREDITED_NO_CHEST)

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    await screen.findByText('16 créditos')
    expect(screen.queryByText('Cofre obtenido')).toBeNull()
  })
})

describe('RewardPanel — FAILED (HU-22, corregido en revision): terminal, nunca "entregado" ni "procesando" eterno', () => {
  it('el credito ya confirmado (balance conocido) dice que ya se acredito, pero no la entrega', async () => {
    authenticate('sujeto-ana')
    stubFetch(REWARD_FAILED_AFTER_CREDIT)

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    expect(await screen.findByText(/ya se acreditaron/u)).toBeInTheDocument()
    expect(screen.queryByText('Cofre obtenido')).toBeNull()
    expect(screen.queryByText(/añadida a tu inventario/u)).toBeNull()
    // El saldo real sigue visible: fallar la entrega no revierte el credito.
    expect(screen.getByText('60 créditos')).toBeInTheDocument()
  })

  it('el credito nunca se confirmo (balance desconocido) no afirma que ya se acredito', async () => {
    authenticate('sujeto-ana')
    stubFetch(REWARD_FAILED_BEFORE_CREDIT)

    renderWithProviders(<RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />)

    await screen.findByText('Confirmando…')
    expect(screen.queryByText(/ya se acreditaron/u)).toBeNull()
    expect(screen.queryByText('Cofre obtenido')).toBeNull()
  })
})

describe('RewardPanel — accesibilidad y movimiento', () => {
  it('la transicion de aparicion respeta `prefers-reduced-motion`', async () => {
    stubFetch(REWARD_CREDITED_NO_CHEST)

    const { container } = renderWithProviders(
      <RewardPanel battleId={ROOM_ID} subject="sujeto-ana" />,
    )

    await screen.findByText('16 créditos')
    const section = container.querySelector('section')

    expect(section?.className).toContain('motion-safe:transition-shadow')
  })
})
