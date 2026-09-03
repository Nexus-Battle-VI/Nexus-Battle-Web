import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import {
  discardSavedCart,
  fetchSavedCart,
  restoreSavedCart,
  saveCart,
  SavedCartUnavailableError,
  type SavedCart,
} from './api'

export interface SavedCartState {
  readonly saved: SavedCart | null
  readonly isLoading: boolean
  /** `true` cuando la sesion no permite guardar entre sesiones. */
  readonly unavailable: boolean
  readonly error: unknown
  readonly save: () => void
  readonly restore: () => void
  readonly discard: () => void
  readonly isBusy: boolean
  readonly actionError: unknown
}

/**
 * Carrito guardado entre sesiones.
 *
 * Guardar y descartar solo tocan el carrito guardado. **Recuperar tambien
 * invalida el carrito vigente**, porque vuelca lo guardado sobre el: dejar el
 * anterior en cache mostraria un contenido que ya no es el del servicio.
 *
 * `unavailable` distingue «no puedes usar esto sin sesion» de «algo fallo».
 * Sin esa distincion, quien entra sin sesion veria un error rojo generico en
 * una pantalla que funciona correctamente.
 */
export const useSavedCart = (): SavedCartState => {
  const queryClient = useQueryClient()
  const subject = useSession((state) => state.subject)
  const key = queryKeys.commerce.savedCart(subject)

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchSavedCart(signal),
    // Sin sesion la respuesta es siempre la misma: no tiene sentido insistir.
    retry: false,
  })

  const refreshSaved = (): void => {
    void queryClient.invalidateQueries({ queryKey: key })
  }

  const save = useMutation({ mutationFn: saveCart, onSuccess: refreshSaved })
  const discard = useMutation({ mutationFn: discardSavedCart, onSuccess: refreshSaved })
  const restore = useMutation({
    mutationFn: restoreSavedCart,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.commerce.cart(subject) })
      void queryClient.invalidateQueries({ queryKey: ['commerce', 'checkout', subject] })
    },
  })

  const actionError = save.error ?? restore.error ?? discard.error
  const unavailable =
    query.error instanceof SavedCartUnavailableError ||
    actionError instanceof SavedCartUnavailableError

  return {
    saved: query.data ?? null,
    isLoading: query.isLoading,
    unavailable,
    // Un `401` no se propaga como error: ya lo comunica `unavailable`.
    error: query.error instanceof SavedCartUnavailableError ? null : query.error,
    save: save.mutate,
    restore: restore.mutate,
    discard: discard.mutate,
    isBusy: save.isPending || restore.isPending || discard.isPending,
    actionError: actionError instanceof SavedCartUnavailableError ? null : actionError,
  }
}
