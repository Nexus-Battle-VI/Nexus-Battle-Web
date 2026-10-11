import type { AdminIconName } from '@/components/admin-kit'
import { adminNavigationForPrimaryRole } from '@/routes/routes'
import { canPublishOfficialAuctions } from '@/shared/rbac'

/**
 * Secciones de la Consola del Consejo (EN-031), agrupadas por tema.
 *
 * Quien decide QUE secciones ve cada rol sigue siendo `ADMIN_NAVIGATION`
 * (`routes.tsx`, filtrado por `adminNavigationForPrimaryRole`): aqui solo se
 * les da grupo, icono y pista. La publicacion de subastas oficiales no esta en
 * esa lista -no es un acceso administrativo sino de Game Master- y se anade
 * con su propia comprobacion (`canPublishOfficialAuctions`).
 */
export type AdminSectionGroup = 'content' | 'commerce' | 'community' | 'assistant' | 'security'

export interface AdminSection {
  readonly path: string
  readonly label: string
  readonly icon: AdminIconName
  readonly group: AdminSectionGroup
  /** Insignia de pendientes, si la seccion la tiene. */
  readonly badge?: 'moderation' | 'tickets'
}

const DETAILS: Readonly<Record<string, Omit<AdminSection, 'path' | 'label'>>> = {
  '/admin/missions': { icon: 'missions', group: 'content' },
  '/admin/banners': { icon: 'banners', group: 'content' },
  '/admin/products': { icon: 'products', group: 'commerce' },
  '/admin/auction-metrics': { icon: 'metrics', group: 'commerce' },
  '/auction/publish-official': { icon: 'official-auction', group: 'commerce' },
  '/admin/comments/moderation': { icon: 'moderation', group: 'community', badge: 'moderation' },
  '/admin/chatbot': { icon: 'chatbot-model', group: 'assistant' },
  '/admin/chatbot/knowledge': { icon: 'chatbot-knowledge', group: 'assistant' },
  '/admin/chatbot/analytics': { icon: 'chatbot-analytics', group: 'assistant' },
  '/admin/chatbot/tickets': { icon: 'chatbot-tickets', group: 'assistant', badge: 'tickets' },
  '/admin/roles': { icon: 'roles', group: 'security' },
}

export const ADMIN_SECTION_GROUPS: readonly AdminSectionGroup[] = [
  'content',
  'commerce',
  'community',
  'assistant',
  'security',
]

export const OFFICIAL_AUCTION_PATH = '/auction/publish-official'

export const adminSectionsFor = (
  role: string | null,
  roles: readonly string[],
): readonly AdminSection[] => {
  const items = adminNavigationForPrimaryRole(role).map((item) => ({
    path: item.path,
    label: item.label,
  }))
  if (canPublishOfficialAuctions(roles)) {
    items.push({ path: OFFICIAL_AUCTION_PATH, label: 'Publicar subasta oficial' })
  }
  return items.map((item) => ({
    ...item,
    ...(DETAILS[item.path] ?? { icon: 'console', group: 'content' }),
  }))
}
