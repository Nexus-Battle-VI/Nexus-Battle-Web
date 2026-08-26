import type { RouteObject } from 'react-router'
import { Navigate } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { NotFoundPage } from '@/app/NotFoundPage'
import { AuthCallbackPage } from '@/app/AuthCallbackPage'
import { RequireSession } from '@/app/RequireSession'
import { PublicOnlyRoute } from '@/app/PublicOnlyRoute'
import { RegistrationPendingPage } from '@/app/RegistrationPendingPage'
import { AccountPage } from '@/features/account/AccountPage'
import { PlayerInventoryPage } from '@/features/player-inventory/PlayerInventoryPage'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { CommunityPage } from '@/features/community/CommunityPage'
import { CommercePage } from '@/features/commerce/CommercePage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { EcommercePage } from '@/features/ecommerce/EcommercePage'
import { LoginPage } from '@/features/auth/login/LoginPage'
import { ModuleUnavailable } from '@/components/ui/ModuleUnavailable'

/**
 * Destino canonico posterior a un login exitoso (HU-02).
 *
 * El cliente aclaro que este mismo destino se reutilizara tras un registro
 * exitoso (HU-01) y tras un cambio de contrasena exitoso (HU-05): por eso vive
 * como una constante nombrada y no como una cadena repetida en cada punto que
 * necesita redirigir alli.
 */
export const ECOMMERCE_PATH = '/ecommerce'

/**
 * Navegacion posterior a la autenticacion.
 *
 * Los accesos son los que confirmo el cliente para la navegacion general del
 * producto (HU-02, Task #91 seccion 6), no los nombres tecnicos de los
 * bounded contexts: quien juega navega por funciones del producto, no por
 * microservicios. `/catalog`, `/community`, `/orders` y `/notifications`
 * siguen montadas mas abajo -no se elimino ninguna pantalla ya implementada-,
 * simplemente ya no aparecen en esta lista.
 */
export const NAVIGATION: readonly { path: string; label: string }[] = [
  { path: ECOMMERCE_PATH, label: 'E-commerce' },
  { path: '/play', label: 'Jugar Online' },
  { path: '/missions', label: 'Misiones' },
  { path: '/tournament', label: 'Torneo' },
  { path: '/inventory', label: 'Mi Inventario' },
  { path: '/auction', label: 'Subasta' },
  { path: '/account', label: 'Mi Cuenta' },
]

export const routes: RouteObject[] = [
  // Publicas: alcanzables sin sesion. `/login` se protege al reves (si ya hay
  // sesion, no tiene sentido volver a pedir credenciales).
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  { path: '/register', element: <RegistrationPendingPage /> },
  // La ruta de retorno del proveedor de identidad OIDC. No aparece en la
  // navegacion: no es una pantalla a la que se entre a proposito.
  { path: '/auth/callback', element: <AuthCallbackPage /> },

  {
    path: '/',
    element: (
      <RequireSession>
        <AppLayout />
      </RequireSession>
    ),
    children: [
      // El indice no muestra contenido propio: HU-02 fija que, tras
      // autenticarse, el destino siempre es E-commerce.
      { index: true, element: <Navigate to={ECOMMERCE_PATH} replace /> },
      { path: 'ecommerce', element: <EcommercePage /> },
      { path: 'play', element: <ModuleUnavailable title="Jugar Online" /> },
      { path: 'missions', element: <ModuleUnavailable title="Misiones" /> },
      { path: 'tournament', element: <ModuleUnavailable title="Torneo" /> },
      { path: 'inventory', element: <PlayerInventoryPage /> },
      { path: 'auction', element: <ModuleUnavailable title="Subasta" /> },
      { path: 'account', element: <AccountPage /> },
      // Pantallas de HUs anteriores. Se mantienen montadas y accesibles por
      // URL directa; solo se retiraron de `NAVIGATION` porque HU-02 exige que
      // la navegacion principal no nombre bounded contexts.
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'community', element: <CommunityPage /> },
      { path: 'orders', element: <CommercePage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
