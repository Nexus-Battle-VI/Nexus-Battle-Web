import { QueryClient } from '@tanstack/react-query'

import { HttpError } from '@/lib/http'

/**
 * Configuracion de TanStack Query para el producto.
 *
 * La decision relevante es **no reintentar los errores del cliente**: un 400 o
 * un 404 no mejoran repitiendo la peticion, y reintentarlos solo retrasa el
 * mensaje de error y multiplica la carga sobre el servicio.
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof HttpError && error.isClientError) {
            return false
          }

          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
