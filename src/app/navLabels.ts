/**
 * Etiqueta traducida de cada acceso de navegacion, por ruta. La comparten la
 * barra principal (`PrimaryNav`), el desplegable de administracion
 * (`AdminNavMenu`) y el cajon movil (`MobileNavDrawer`).
 *
 * `routes.tsx` conserva el `label` en español de cada acceso como respaldo:
 * asi un acceso nuevo sin traduccion sigue mostrandose, en español, en lugar
 * de desaparecer, y esta tabla no obliga a tocar la lista de rutas (que otras
 * features editan).
 */
export const NAV_LABEL_KEYS: Readonly<Record<string, string>> = {
  '/ecommerce': 'app:nav.ecommerce',
  '/play': 'app:nav.play',
  '/missions': 'app:nav.missions',
  '/tournament': 'app:nav.tournament',
  '/inventory': 'app:nav.inventory',
  '/auction': 'app:nav.auction',
}

export const ADMIN_NAV_LABEL_KEYS: Readonly<Record<string, string>> = {
  '/admin/missions': 'app:nav.editMissions',
  '/admin/products': 'app:nav.manageProducts',
  '/admin/banners': 'app:nav.banners',
  '/admin/roles': 'app:nav.roles',
  '/admin/auction-metrics': 'app:nav.auctionMetrics',
  '/admin/comments/moderation': 'app:nav.moderation',
  // EN-031: las cuatro del chatbot no tenian traduccion (salian siempre en español).
  '/admin/chatbot': 'app:nav.chatbotModel',
  '/admin/chatbot/knowledge': 'app:nav.chatbotKnowledge',
  '/admin/chatbot/analytics': 'app:nav.chatbotAnalytics',
  '/admin/chatbot/tickets': 'app:nav.chatbotTickets',
  '/auction/publish-official': 'app:nav.officialAuction',
  '/admin': 'app:nav.console',
}
