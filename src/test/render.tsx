import type { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

/**
 * Renderiza un componente con los proveedores reales de la aplicacion.
 *
 * El cliente de consultas se crea por prueba y con reintentos deshabilitados:
 * compartirlo filtraria cache entre casos, y reintentar convertiria una prueba
 * de error en una espera de varios segundos.
 */
export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })

export interface RenderOptions {
  readonly route?: string
  readonly queryClient?: QueryClient
}

export const renderWithProviders = (ui: ReactElement, options: RenderOptions = {}) => {
  const queryClient = options.queryClient ?? createTestQueryClient()

  const Wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[options.route ?? '/']}>{children}</MemoryRouter>
    </QueryClientProvider>
  )

  return { ...render(ui, { wrapper: Wrapper }), queryClient }
}
