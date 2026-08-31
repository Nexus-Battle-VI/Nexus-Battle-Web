import type { ReactElement } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'

import { createTestQueryClient } from '@/test/render'
import type { OwnAccount } from './api'

/**
 * Utilidades de prueba de "Mi cuenta".
 *
 * `renderAccountSection` monta una seccion como hija de una ruta que le entrega
 * la cuenta por contexto de outlet -igual que hace `AccountPage` en produccion-,
 * dentro de un `QueryClientProvider` con reintentos desactivados.
 */

export const FIXTURE_ACCOUNT: OwnAccount = {
  id: 'acc-1',
  email: 'ana@nexus.test',
  displayName: 'Ana Ramirez',
  firstNames: 'Ana',
  lastNames: 'Ramirez',
  status: 'ACTIVE',
  roles: ['PLAYER'],
}

export const renderAccountSection = (
  element: ReactElement,
  account: OwnAccount = FIXTURE_ACCOUNT,
) => {
  const queryClient = createTestQueryClient()
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Outlet context={{ account }} />,
        children: [{ index: true, element }],
      },
    ],
    { initialEntries: ['/'] },
  )

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  }
}
