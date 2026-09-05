import { Navigate, type RouteObject } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { NotFoundPage } from '@/app/NotFoundPage'
import { AuthCallbackPage } from '@/app/AuthCallbackPage'
import { RequireSession } from '@/app/RequireSession'
import { RequireAdministrator } from '@/app/RequireAdministrator'
import { RequireSuperAdministrator } from '@/app/RequireSuperAdministrator'
import { RequireModerator } from '@/app/RequireModerator'
import { PublicOnlyRoute } from '@/app/PublicOnlyRoute'
import { AccountPage } from '@/features/account/AccountPage'
import { accountSectionRoutes } from '@/features/account/routes'
import { registerAccount } from '@/features/account/registration/api'
import { RegistrationPage } from '@/features/account/registration/RegistrationPage'
import { PlayerInventoryPage } from '@/features/player-inventory/PlayerInventoryPage'
import { HeroSelectionPage } from '@/features/player-inventory/HeroSelectionPage'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { ProductDetailPage } from '@/features/catalog/ProductDetailPage'
import { CommunityPage } from '@/features/community/CommunityPage'
import { CommercePage } from '@/features/commerce/CommercePage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { LoginPage } from '@/features/auth/login/LoginPage'
import { RecoveryPage } from '@/features/auth/recovery/RecoveryPage'
import { RoleManagementPage } from '@/features/admin/roles/RoleManagementPage'
import { CreateProductPage } from '@/features/admin/products/CreateProductPage'
import { AdjustInventoryPage } from '@/features/admin/products/AdjustInventoryPage'
import { ModerationQueuePage } from '@/features/admin/comments/ModerationQueuePage'
import { ModuleUnavailable } from '@/components/ui/ModuleUnavailable'

const { devRoutes, publicDevRoutes } = import.meta.env.DEV
  ? await import('./dev-routes')
  : { devRoutes: [], publicDevRoutes: [] }

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
 * Raiz del area "Mi cuenta" (HU-05.4).
 *
 * Vive como constante nombrada -igual que `ECOMMERCE_PATH`- porque mas de un
 * punto necesita reconocer esta jerarquia: hoy, `AppHeader` oculta el conmutador
 * de tema global en `/account` y en cualquier descendiente (`/account/preferences`,
 * `/account/security`, ...), porque ese control vivira dentro de "Preferencias" y
 * mostrar los dos seria redundante. Solo se oculta el CONTROL; el sistema de tema
 * (`@/shared/theme`) sigue intacto.
 */
export const ACCOUNT_PATH = '/account'

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
export interface NavigationItem {
  readonly path: string
  readonly label: string
  readonly requiredPrimaryRole?: 'SUPER_ADMINISTRATOR' | 'ADMINISTRATOR' | 'MODERATOR'
}

export const NAVIGATION: readonly NavigationItem[] = [
  { path: ECOMMERCE_PATH, label: 'E-commerce' },
  { path: '/play', label: 'Jugar Online' },
  { path: '/missions', label: 'Misiones' },
  { path: '/tournament', label: 'Torneo' },
  { path: '/inventory', label: 'Mi Inventario' },
  // HU-07. Entra en la navegacion porque preparar al heroe es un paso previo a
  // jugar y no cuelga de ningun otro flujo: sin acceso propio solo se llegaria
  // escribiendo la URL. El prototipo de Figma no la enumera porque su barra de
  // navegacion es anterior a la que HU-02 dejo acordada.
  { path: '/heroes', label: 'Mi Héroe' },
  { path: '/auction', label: 'Subasta' },
  // "Mi Cuenta" ya no vive en la navegacion central (HU-05.4): el acceso a la
  // cuenta es `SessionControl`. La ruta `/account` sigue montada mas abajo.
  {
    path: '/admin/products/new',
    label: 'Crear producto',
    requiredPrimaryRole: 'ADMINISTRATOR',
  },
  {
    path: '/admin/roles',
    label: 'Gestionar roles',
    requiredPrimaryRole: 'SUPER_ADMINISTRATOR',
  },
  // HU-41.10 (Management#312): acceso visible a la cola de moderacion para
  // Moderador, Administrador y Super Administrador -nunca Jugador-. Antes
  // solo se llegaba escribiendo la URL a mano.
  {
    path: '/admin/comments/moderation',
    label: 'Moderación de comentarios',
    requiredPrimaryRole: 'MODERATOR',
  },
]

/**
 * Jerarquia de los roles administrativos, de mayor a menor.
 *
 * Existe porque un acceso que exige `ADMINISTRATOR` tambien debe verlo un
 * Super Administrador. Comparar por igualdad -como se hacia cuando el unico
 * acceso restringido era el suyo- se lo ocultaria, y el sintoma seria confuso:
 * la ruta funciona si se escribe a mano, pero no aparece en la navegacion.
 *
 * `MODERATOR` entra por debajo de `ADMINISTRATOR` (HU-41.10): Community
 * tambien acepta Administrador y Super Administrador en las rutas de
 * moderacion, asi que un acceso que exige `MODERATOR` debe ser visible para
 * los tres, no solo para quien tiene exactamente ese rol.
 */
const ADMINISTRATIVE_RANK: Readonly<Record<string, number>> = {
  SUPER_ADMINISTRATOR: 3,
  ADMINISTRATOR: 2,
  MODERATOR: 1,
}

export const navigationForPrimaryRole = (role: string | null): readonly NavigationItem[] =>
  NAVIGATION.filter((item) => {
    if (item.requiredPrimaryRole === undefined) {
      return true
    }

    const held = role === null ? 0 : (ADMINISTRATIVE_RANK[role] ?? 0)

    return held >= (ADMINISTRATIVE_RANK[item.requiredPrimaryRole] ?? 0)
  })

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
  {
    path: '/recover',
    element: (
      <PublicOnlyRoute>
        <RecoveryPage />
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

  // Vista previa de desarrollo, fuera de `RequireSession` y solo con
  // `import.meta.env.DEV` (ver `./dev-routes`). Vacio en produccion.
  ...publicDevRoutes,

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
      { path: 'ecommerce', element: <CommercePage /> },
      { path: 'play', element: <ModuleUnavailable title="Jugar Online" /> },
      { path: 'missions', element: <ModuleUnavailable title="Misiones" /> },
      { path: 'tournament', element: <ModuleUnavailable title="Torneo" /> },
      { path: 'inventory', element: <PlayerInventoryPage /> },
      // Seleccion y preparacion del heroe (HU-07). Equipar sigue viviendo en
      // `/inventory`: esta pantalla elige el heroe y enseña con que entraria.
      { path: 'heroes', element: <HeroSelectionPage /> },
      { path: 'auction', element: <ModuleUnavailable title="Subasta" /> },
      // "Mi cuenta" (HU-05.4): shell con navegacion interna. Cada seccion es una
      // ruta hija con su propia URL (`/account`, `/account/security`, ...); ver
      // `@/features/account/routes`.
      { path: 'account', element: <AccountPage />, children: accountSectionRoutes },
      {
        path: 'admin/roles',
        element: (
          <RequireSuperAdministrator>
            <RoleManagementPage />
          </RequireSuperAdministrator>
        ),
      },
      // Catalogo administrativo (HU-33). La guarda es de presentacion: Catalog
      // exige ademas evidencia de segundo factor y responde 403 por su cuenta.
      {
        path: 'admin/products/new',
        element: (
          <RequireAdministrator>
            <CreateProductPage />
          </RequireAdministrator>
        ),
      },
      // Ajuste de tiraje (HU-34). NO entra en `NAVIGATION`: se llega con un
      // producto concreto en la mano, y un enlace de menu sin identificador no
      // lleva a ninguna parte.
      {
        path: 'admin/products/:productId/inventory',
        element: (
          <RequireAdministrator>
            <AdjustInventoryPage />
          </RequireAdministrator>
        ),
      },
      // Cola de moderacion de comentarios (HU-41.4). Entra en `NAVIGATION`
      // desde HU-41.10: a diferencia del ajuste de tiraje, esta pantalla no
      // depende de un producto concreto, asi que un enlace de menu si lleva a
      // alguna parte.
      {
        path: 'admin/comments/moderation',
        element: (
          <RequireModerator>
            <ModerationQueuePage />
          </RequireModerator>
        ),
      },
      // Pantallas de HUs anteriores. Se mantienen montadas y accesibles por
      // URL directa; solo se retiraron de `NAVIGATION` porque HU-02 exige que
      // la navegacion principal no nombre bounded contexts.
      { path: 'catalog', element: <CatalogPage /> },
      // Ficha de producto con comentarios y calificación (HU-40, HU-40.4).
      // NO entra en `NAVIGATION`: se llega con un producto concreto en la
      // mano, mismo criterio que `admin/products/:productId/inventory`.
      { path: 'catalog/:productId', element: <ProductDetailPage /> },
      { path: 'community', element: <CommunityPage /> },
      { path: 'orders', element: <Navigate to={ECOMMERCE_PATH} replace /> },
      { path: 'notifications', element: <NotificationsPage /> },
      // Harness de EN-026.3, solo en desarrollo (ver `./dev-routes.tsx`). No
      // aparece en NAVIGATION ni en produccion.
      ...devRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
