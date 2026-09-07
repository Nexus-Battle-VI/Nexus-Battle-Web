import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { fetchPendingCatalogNotifications, markCatalogNotificationsRead } from './api'

/**
 * Novedades de catalogo pendientes (HU-38, Task #185).
 *
 * SECUENCIA OBLIGATORIA: GET pending -> React presenta realmente el contenido
 * -> solo entonces POST read. El efecto que dispara `read` corre DESPUES de
 * que React confirmo el renderizado (useEffect corre tras el commit), nunca
 * antes.
 *
 * `notificationIds` del POST son el aplanado de TODAS las filas presentadas
 * -una fila consolidada representa varias notificaciones originales-, nunca
 * solo `id`.
 *
 * Un ref recuerda el ULTIMO lote ya enviado (por su conjunto exacto de ids) y
 * evita un segundo POST para el mismo lote en un re-render (StrictMode,
 * revalidacion en segundo plano).
 *
 * NO se invalida `pending` tras el exito: hacerlo refrescaria esta misma
 * vista y las notificaciones ya presentadas desaparecerian de golpe. Que no
 * vuelvan a aparecer se resuelve solo, porque el backend deja de devolverlas
 * en la SIGUIENTE carga (nuevo login/montaje). Si falla, no se oculta nada:
 * el ref no cambia el estado visible, y el intento se repite en la proxima
 * carga.
 */
export const usePendingCatalogNotifications = () => {
  const queryClient = useQueryClient()
  const subject = useSession((state) => state.subject)
  const key = queryKeys.notifications.pending(subject)

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchPendingCatalogNotifications(signal),
  })

  const items = query.data ?? []

  const markRead = useMutation({
    mutationFn: markCatalogNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.history(subject) })
    },
  })

  const sentBatchRef = useRef<string | null>(null)

  useEffect(() => {
    if (items.length === 0) return

    const flatIds = [...new Set(items.flatMap((item) => item.notificationIds))]

    if (flatIds.length === 0) return

    const batchKey = [...flatIds].sort().join(',')

    if (sentBatchRef.current === batchKey) return
    sentBatchRef.current = batchKey

    markRead.mutate(flatIds)
    // Deliberado: solo depende de `items`. Incluir `markRead` (una mutation
    // nueva en cada render) reintroduciria el efecto en cada revalidacion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  return {
    items,
    isLoading: query.isLoading,
    error: query.error,
  }
}
