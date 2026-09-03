import { afterEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { RequireAdministrator } from './RequireAdministrator'

afterEach(() => {
  useSession.setState({ roles: [], accessToken: null, expiresAt: null })
})

describe('RequireAdministrator', () => {
  it.each(['ADMINISTRATOR', 'SUPER_ADMINISTRATOR'])(
    'permite el contenido administrativo al rol primario %s',
    (role) => {
      useSession.setState({ roles: ['PLAYER', role] })

      renderWithProviders(
        <RequireAdministrator>
          <h1>Contenido administrativo</h1>
        </RequireAdministrator>,
      )

      expect(screen.getByRole('heading', { name: 'Contenido administrativo' })).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    },
  )

  it.each(['PLAYER', 'MODERATOR'])(
    'rechaza el contenido administrativo al rol primario %s',
    (role) => {
      useSession.setState({ roles: ['PLAYER', role] })

      renderWithProviders(
        <RequireAdministrator>
          <h1>Contenido administrativo</h1>
        </RequireAdministrator>,
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Acceso denegado')
      expect(
        screen.queryByRole('heading', { name: 'Contenido administrativo' }),
      ).not.toBeInTheDocument()
    },
  )
})
