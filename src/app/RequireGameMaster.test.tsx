import { afterEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { RequireGameMaster } from './RequireGameMaster'

afterEach(() => {
  useSession.setState({ roles: [], accessToken: null, expiresAt: null })
})

describe('RequireGameMaster', () => {
  it('permite la publicacion oficial al rol GAME_MASTER', () => {
    useSession.setState({ roles: ['GAME_MASTER'] })

    renderWithProviders(
      <RequireGameMaster>
        <h1>Publicar como Maestro de Juego</h1>
      </RequireGameMaster>,
    )

    expect(
      screen.getByRole('heading', { name: 'Publicar como Maestro de Juego' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  /**
   * A diferencia de RequireAdministrator/RequireModerator, ADMINISTRATOR y
   * SUPER_ADMINISTRATOR NO satisfacen GAME_MASTER (HU-66.1): es una
   * identidad comercial exclusiva, no un peldaño mas de la jerarquia
   * administrativa.
   */
  it.each(['PLAYER', 'MODERATOR', 'ADMINISTRATOR', 'SUPER_ADMINISTRATOR'])(
    'rechaza la publicacion oficial al rol %s',
    (role) => {
      useSession.setState({ roles: [role] })

      renderWithProviders(
        <RequireGameMaster>
          <h1>Publicar como Maestro de Juego</h1>
        </RequireGameMaster>,
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Acceso denegado')
      expect(
        screen.queryByRole('heading', { name: 'Publicar como Maestro de Juego' }),
      ).not.toBeInTheDocument()
    },
  )
})
