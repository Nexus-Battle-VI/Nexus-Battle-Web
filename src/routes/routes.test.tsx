import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { NAVIGATION } from './routes'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { AccountPage } from '@/features/account/AccountPage'
import { PlayerInventoryPage } from '@/features/player-inventory/PlayerInventoryPage'
import { CommunityPage } from '@/features/community/CommunityPage'
import { CommercePage } from '@/features/commerce/CommercePage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'

describe('NAVIGATION', () => {
  it('declara una entrada por bounded context, sin duplicados', () => {
    const paths = NAVIGATION.map((item) => item.path)

    expect(paths).toEqual([
      '/catalog',
      '/inventory',
      '/community',
      '/orders',
      '/account',
      '/notifications',
    ])
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('Pantallas todavia no implementadas', () => {
  /**
   * Estas pantallas son marcadores de posicion. La prueba verifica justamente
   * eso: que **declaran** no estar implementadas y nombran el servicio
   * responsable, en lugar de mostrar datos inventados que las harian
   * indistinguibles de una pantalla terminada.
   */
  it.each([
    ['Cuenta', 'Nexus-Battle-Account', <AccountPage key="account" />],
    ['Inventario', 'Nexus-Battle-Player-Inventory', <PlayerInventoryPage key="inventory" />],
    ['Comunidad', 'Nexus-Battle-Community', <CommunityPage key="community" />],
    ['Pedidos', 'Nexus-Battle-Commerce', <CommercePage key="commerce" />],
    ['Notificaciones', 'Nexus-Battle-Notifications', <NotificationsPage key="notifications" />],
  ])('%s declara su estado y nombra el servicio %s', (title, service, element) => {
    renderWithProviders(element)

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText(/todavia no esta implementada/u)).toBeInTheDocument()
    expect(screen.getByText(service)).toBeInTheDocument()
  })
})

describe('useDebouncedValue', () => {
  it('devuelve el valor inicial de inmediato', () => {
    const { result } = renderHook(() => useDebouncedValue('inicial', 50))

    expect(result.current).toBe('inicial')
  })

  it('propaga el valor solo despues del retraso', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 50), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'b' })
    expect(result.current).toBe('a')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    expect(result.current).toBe('b')
  })

  it('descarta los valores intermedios y conserva solo el ultimo', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 50), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'b' })
    rerender({ value: 'c' })
    rerender({ value: 'd' })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    expect(result.current).toBe('d')
  })
})
