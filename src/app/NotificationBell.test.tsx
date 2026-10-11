import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { PresentedNotification } from '@/features/notifications/contract'
import { httpClient } from '@/lib/http'
import { useSession } from '@/shared/session'
import { renderWithProviders } from '@/test/render'

import { NotificationBell } from './NotificationBell'

const notification = (index: number, ids: readonly string[] = [`n-${String(index)}`]) =>
  ({
    id: `row-${String(index)}`,
    notificationIds: ids,
    changeType: index === 0 ? 'AUCTION_BID_OUTBID' : 'PRODUCT_CREATED',
    description: `Aviso ${String(index)}`,
    productId: null,
    implementedAt: '2026-10-11T12:00:00.000Z',
    consolidatedCount: ids.length,
  }) satisfies PresentedNotification

const signIn = (): void => {
  useSession.setState({
    subject: 'sujeto-ana',
    accessToken: 'token',
    expiresAt: Date.now() + 900_000,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('NotificationBell (EN-031)', () => {
  it('sin sesion no se muestra ni consulta nada', () => {
    const get = vi.spyOn(httpClient, 'get')

    const { container } = renderWithProviders(<NotificationBell />)

    expect(container).toBeEmptyDOMElement()
    expect(get).not.toHaveBeenCalled()
  })

  describe('con sesion', () => {
    beforeEach(signIn)

    it('anuncia el contador en su nombre accesible y consulta los pendientes', async () => {
      const get = vi
        .spyOn(httpClient, 'get')
        .mockResolvedValue({ items: [notification(0), notification(1)] })

      renderWithProviders(<NotificationBell />)

      const button = await screen.findByRole('button', { name: 'Notificaciones: 2 sin leer' })
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(get).toHaveBeenCalledWith('/v1/notifications/me/pending', expect.anything())
    })

    it('al abrir muestra como maximo cinco y marca como leidas SOLO esas, con todos sus ids', async () => {
      const user = userEvent.setup()
      const items = [
        notification(0, ['a', 'b']),
        notification(1),
        notification(2),
        notification(3),
        notification(4),
        notification(5),
        notification(6),
      ]
      vi.spyOn(httpClient, 'get').mockResolvedValue({ items })
      const post = vi.spyOn(httpClient, 'post').mockResolvedValue({ status: 'ok' })

      renderWithProviders(<NotificationBell />)
      await user.click(await screen.findByRole('button', { name: 'Notificaciones: 7 sin leer' }))

      const panel = screen.getByRole('region', { name: 'Notificaciones' })
      expect(panel.querySelectorAll('li')).toHaveLength(5)
      expect(screen.getByText('Y 2 más en el historial.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ver todas ›' })).toHaveAttribute(
        'href',
        '/notifications',
      )
      await waitFor(() => {
        expect(post).toHaveBeenCalledTimes(1)
      })
      expect(post).toHaveBeenCalledWith('/v1/notifications/me/read', {
        notificationIds: ['a', 'b', 'n-1', 'n-2', 'n-3', 'n-4'],
      })
    })

    it('Escape cierra el panel y devuelve el foco a la campana', async () => {
      const user = userEvent.setup()
      vi.spyOn(httpClient, 'get').mockResolvedValue({ items: [] })

      renderWithProviders(<NotificationBell />)
      const button = await screen.findByRole('button', { name: 'Notificaciones' })
      await user.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText('No tienes notificaciones nuevas.')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('region', { name: 'Notificaciones' })).not.toBeInTheDocument()
      expect(button).toHaveFocus()
    })

    it('sin pendientes no marca nada como leido', async () => {
      const user = userEvent.setup()
      vi.spyOn(httpClient, 'get').mockResolvedValue({ items: [] })
      const post = vi.spyOn(httpClient, 'post')

      renderWithProviders(<NotificationBell />)
      await user.click(await screen.findByRole('button', { name: 'Notificaciones' }))

      expect(post).not.toHaveBeenCalled()
    })

    it('si Notifications falla, la cabecera sigue en pie y el panel lo dice', async () => {
      const user = userEvent.setup()
      vi.spyOn(httpClient, 'get').mockRejectedValue(new Error('caido'))

      renderWithProviders(<NotificationBell />)
      const button = await screen.findByRole('button', { name: 'Notificaciones' })
      await user.click(button)

      expect(
        await screen.findByText('No se pudieron cargar tus notificaciones.'),
      ).toBeInTheDocument()
    })
  })
})
