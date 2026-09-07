import { afterEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { RequireModerator } from './RequireModerator'

afterEach(() => {
  useSession.setState({ roles: [], accessToken: null, expiresAt: null })
})

describe('RequireModerator', () => {
  it.each(['MODERATOR', 'ADMINISTRATOR', 'SUPER_ADMINISTRATOR'])(
    'permite la cola de moderación al rol primario %s',
    (role) => {
      useSession.setState({ roles: ['PLAYER', role] })

      renderWithProviders(
        <RequireModerator>
          <h1>Cola de moderación</h1>
        </RequireModerator>,
      )

      expect(screen.getByRole('heading', { name: 'Cola de moderación' })).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    },
  )

  it('rechaza la cola de moderación a un Jugador', () => {
    useSession.setState({ roles: ['PLAYER'] })

    renderWithProviders(
      <RequireModerator>
        <h1>Cola de moderación</h1>
      </RequireModerator>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Acceso denegado')
    expect(screen.queryByRole('heading', { name: 'Cola de moderación' })).not.toBeInTheDocument()
  })
})
