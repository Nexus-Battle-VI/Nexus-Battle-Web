import { MutationCache, QueryClient } from '@tanstack/react-query'

import { HttpError } from '@/lib/http'

import { playSfx } from './sound'

/**
 * Sonido de cada mutacion terminada (EN-031): exito o error. Una mutacion
 * que se lanza sola, sin que la persona haya pulsado nada (marcar como leido),
 * lo desactiva con `meta: { sfx: false }`. El motor ya decide si de verdad
 * suena (apagado por defecto, gesto previo, pestana visible).
 */
const wantsSound = (meta: Readonly<Record<string, unknown>> | undefined): boolean =>
  meta?.sfx !== false

/**
 * Configuracion de TanStack Query para el producto.
 *
 * La decision relevante es **no reintentar los errores del cliente**: un 400 o
 * un 404 no mejoran repitiendo la peticion, y reintentarlos solo retrasa el
 * mensaje de error y multiplica la carga sobre el servicio.
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        if (wantsSound(mutation.meta)) playSfx('success')
      },
      onError: (_error, _variables, _context, mutation) => {
        if (wantsSound(mutation.meta)) playSfx('error')
      },
    }),
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
