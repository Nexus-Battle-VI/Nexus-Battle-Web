import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useSession } from '@/shared/session'
import { renderWithProviders } from '@/test/render'

import { NotificationsRemasterPreview } from './NotificationsRemasterPreview'

afterEach(() => {
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

/**
 * La vista previa (EN-031) llega a su contenido sin red y, al desmontarse,
 * devuelve la sesion como estaba: no puede dejar una sesion de ejemplo viva.
 */
describe('vista previa del remaster de notificaciones (EN-031)', () => {
  it('muestra la campana con su contador y las notificaciones de ejemplo', async () => {
    renderWithProviders(<NotificationsRemasterPreview />)

    expect(
      await screen.findByRole('button', { name: 'Notificaciones: 8 sin leer' }),
    ).toBeInTheDocument()
    expect(
      (await screen.findAllByText('Ganaste una subasta por 2.300 créditos.')).length,
    ).toBeGreaterThan(0)
  })

  it('al desmontarse restaura la sesion anterior', () => {
    const { unmount } = renderWithProviders(<NotificationsRemasterPreview />)
    expect(useSession.getState().subject).toBe('sujeto-vista-previa')

    unmount()

    expect(useSession.getState().subject).toBeNull()
  })
})
