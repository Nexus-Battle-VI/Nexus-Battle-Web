import type { RouteObject } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { NotFoundPage } from '@/app/NotFoundPage'
import { AuthCallbackPage } from '@/app/AuthCallbackPage'
import { AccountPage } from '@/features/account/AccountPage'
import { registerAccount } from '@/features/account/registration/api'
import { RegistrationPage } from '@/features/account/registration/RegistrationPage'
import { PlayerInventoryPage } from '@/features/player-inventory/PlayerInventoryPage'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { CommunityPage } from '@/features/community/CommunityPage'
import { CommercePage } from '@/features/commerce/CommercePage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { devRoutes } from './dev-routes'

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
  // HU-01 vive FUERA del layout de la aplicacion. Quien todavia no tiene
  // cuenta no puede tener catalogo, inventario ni pedidos: mostrarle esa
  // navegacion seria ofrecerle destinos que no le corresponden. Por eso no
  // aparece tampoco en `NAVIGATION`.
  //
  // Es tambien la puerta de entrada: la raiz de la aplicacion sirve la misma
  // pantalla. Quien abre la aplicacion sin sesion arranca en el registro, no
  // en el catalogo, que pertenece al area autenticada.
  { path: '/', element: <RegistrationPage onSubmit={registerAccount} /> },
  { path: '/register', element: <RegistrationPage onSubmit={registerAccount} /> },
  {
    // Ruta de layout SIN `path`: no consume ningun segmento de la URL, asi
    // que sus hijos siguen resolviendo a las mismas rutas absolutas
    // (`/catalog`, `/inventory`, ...) que tenian cuando el layout ocupaba
    // `/`. Solo cambia el mapeo de la raiz, no el resto del arbol.
    element: <AppLayout />,
    children: [
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'inventory', element: <PlayerInventoryPage /> },
      { path: 'community', element: <CommunityPage /> },
      { path: 'orders', element: <CommercePage /> },
      { path: 'account', element: <AccountPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      // La ruta de retorno del proveedor de identidad. No aparece en la
      // navegacion: no es una pantalla a la que se entre a proposito.
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      // Harness de EN-026.3, solo en desarrollo (ver `./dev-routes.tsx`). No
      // aparece en NAVIGATION ni en produccion.
      ...devRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
