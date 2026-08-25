import type { RouteObject } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { NotFoundPage } from '@/app/NotFoundPage'
import { AuthCallbackPage } from '@/app/AuthCallbackPage'
import { AccountPage } from '@/features/account/AccountPage'
import { PlayerInventoryPage } from '@/features/player-inventory/PlayerInventoryPage'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { CommunityPage } from '@/features/community/CommunityPage'
import { CommercePage } from '@/features/commerce/CommercePage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'

/**
 * Rutas de la aplicacion.
 *
 * Hay **una ruta por bounded context**, lo que mantiene visible la frontera
 * entre servicios tambien en la interfaz. No se agrupan pantallas de contextos
 * distintos bajo la misma ruta.
 */
export const NAVIGATION: readonly { path: string; label: string }[] = [
  { path: '/catalog', label: 'Catalogo' },
  { path: '/inventory', label: 'Inventario' },
  { path: '/community', label: 'Comunidad' },
  { path: '/orders', label: 'Pedidos' },
  { path: '/account', label: 'Cuenta' },
  { path: '/notifications', label: 'Notificaciones' },
]

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <CatalogPage /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'inventory', element: <PlayerInventoryPage /> },
      { path: 'community', element: <CommunityPage /> },
      { path: 'orders', element: <CommercePage /> },
      { path: 'account', element: <AccountPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      // La ruta de retorno del proveedor de identidad. No aparece en la
      // navegacion: no es una pantalla a la que se entre a proposito.
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
