import type { RouteObject } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { NotFoundPage } from '@/app/NotFoundPage'
import { AuthCallbackPage } from '@/app/AuthCallbackPage'
import { RequireSession } from '@/app/RequireSession'
import { PublicOnlyRoute } from '@/app/PublicOnlyRoute'
import { AccountPage } from '@/features/account/AccountPage'
import { registerAccount } from '@/features/account/registration/api'
import { RegistrationPage } from '@/features/account/registration/RegistrationPage'
import { PlayerInventoryPage } from '@/features/player-inventory/PlayerInventoryPage'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { CommunityPage } from '@/features/community/CommunityPage'
import { CommercePage } from '@/features/commerce/CommercePage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { EcommercePage } from '@/features/ecommerce/EcommercePage'
import { LandingPage } from '@/features/landing/LandingPage'
import { LoginPage } from '@/features/auth/login/LoginPage'
import { ModuleUnavailable } from '@/components/ui/ModuleUnavailable'
import { devRoutes } from './dev-routes'

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
 *
 * Tambien la reutiliza `LandingPage`: son los mismos destinos, solo que quien
 * los ve sin sesion recibe el aviso "Para continuar" de `RequireSession` en
 * lugar del contenido real.
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
  // Publicas: alcanzables sin sesion. `/` y `/login` se protegen al reves (si
  // ya hay sesion, no tiene sentido volver a mostrarlas). `/register` no se
  // protege: HU-01 no exige cerrar sesion antes de registrar una cuenta
  // nueva, y esta rama no inventa esa regla.
  {
    path: '/',
    element: (
      <PublicOnlyRoute>
        <LandingPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  // HU-01 real: valida nombres, apellidos, correo, contrasena, apodo (incluida
  // la lista negra), avatar, preguntas de seguridad y terminos, y envia el
  // registro a Account.
  //
  // Es PUBLICA y no se envuelve en ninguna guarda de identidad: con el alta
  // server-side (ADR-004) `POST /api/accounts` ya NO exige testimonio -es
  // Account quien crea la identidad en el proveedor a partir del formulario-, y
  // exigir sesion antes rechazaria justo a quien todavia no tiene cuenta. La
  // antigua puerta al hosted UI desaparecio con ese cambio.
  {
    path: '/register',
    element: <RegistrationPage onSubmit={registerAccount} />,
  },
  // La ruta de retorno del proveedor de identidad OIDC. No aparece en la
  // navegacion ni la enlaza ningun control: se conserva por si una compilacion
  // futura reactiva el flujo de codigo, pero el alta y el login del producto
  // ocurren enteros en la UI propia.
  { path: '/auth/callback', element: <AuthCallbackPage /> },

  // Ruta de layout SIN `path`: no consume ningun segmento de la URL, asi que
  // sus hijos siguen resolviendo a las mismas rutas absolutas (`/ecommerce`,
  // `/inventory`, ...). Es el shell autenticado; `RequireSession` decide si
  // se muestra o si en su lugar aparece el aviso "Para continuar".
  {
    element: (
      <RequireSession>
        <AppLayout />
      </RequireSession>
    ),
    children: [
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
      // Harness de EN-026.3, solo en desarrollo (ver `./dev-routes.tsx`). No
      // aparece en NAVIGATION ni en produccion.
      ...devRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
