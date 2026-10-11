import { useQuery } from '@tanstack/react-query'

import { fetchSupportTickets } from '@/features/admin/chatbot/api'
import { fetchModerationQueue } from '@/features/admin/comments/api'
import { MODERATION_QUEUE_PAGE_SIZE } from '@/features/admin/comments/ModerationQueuePage'
import { queryKeys } from '@/shared/query-keys'
import { canModerateComments, canViewAdminUsers } from '@/shared/rbac'
import { useSession } from '@/shared/session'

/** Datos de las insignias: viejos de mas de un minuto se vuelven a pedir al montar. */
const STALE_MS = 60_000

export interface AdminBadgeCounts {
  readonly moderation: number | null
  readonly tickets: number | null
}

/**
 * Insignias de pendientes de la Consola del Consejo (EN-031): comentarios por
 * moderar y tickets del chatbot.
 *
 * Sin endpoints nuevos ni sondeo: reutiliza las MISMAS consultas (clave y
 * funcion) que sus paginas, asi comparten cache. Cada una solo se pide si el
 * rol puede ver esa seccion -nunca provoca un 403-, y un fallo deja la
 * insignia sin numero en lugar de romper la consola.
 */
export const useAdminBadges = (): AdminBadgeCounts => {
  const roles = useSession((state) => state.roles)
  const moderationParams = { limit: MODERATION_QUEUE_PAGE_SIZE, offset: 0 }

  const moderation = useQuery({
    queryKey: queryKeys.community.moderationQueue(moderationParams),
    queryFn: ({ signal }) => fetchModerationQueue(moderationParams, signal),
    enabled: canModerateComments(roles),
    staleTime: STALE_MS,
  })

  const tickets = useQuery({
    queryKey: queryKeys.admin.chatbotTickets,
    queryFn: ({ signal }) => fetchSupportTickets(signal),
    enabled: canViewAdminUsers(roles),
    staleTime: STALE_MS,
  })

  return {
    moderation: moderation.data?.total ?? null,
    tickets: tickets.data?.length ?? null,
  }
}
