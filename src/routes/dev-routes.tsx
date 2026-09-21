import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router'
import type { RouteObject } from 'react-router'

/**
 * Harnesses de verificacion tecnica, no pantallas del producto (ver
 * `src/shared/visual-library/heroes/HeroesDevPreview.tsx` para EN-026.3 y
 * `src/shared/visual-library/products/ProductsDevPreview.tsx` para EN-026.4).
 *
 * Cada importacion perezosa y cada definicion de ruta vive dentro de la rama
 * `import.meta.env.DEV`. Vite elimina la rama completa en produccion, incluidos
 * los nombres de ruta, modulos de preview y fixtures; en desarrollo conserva
 * los harnesses fuera del bundle inicial.
 *
 * - `devRoutes`: cuelgan del shell autenticado (`AppLayout`), como el resto de
 *   pantallas internas.
 * - `publicDevRoutes`: cuelgan de la raiz, SIN `RequireSession`. La vista previa
 *   de "Mi cuenta" (HU-05.4) tiene que ser revisable sin una sesion real,
 *   porque el entorno local no puede establecer ninguna (ver informe). No es
 *   una puerta trasera: no monta `/account` productivo, no toca
 *   `RequireSession` y solo existe con `import.meta.env.DEV`.
 */
let resolvedDevRoutes: RouteObject[] = []
let resolvedPublicDevRoutes: RouteObject[] = []

if (import.meta.env.DEV) {
  const [
    { HeroesDevPreviewLazy },
    { ProductsDevPreviewLazy },
    { accountPreviewChildren },
    { FIXED_ROOM_ID },
  ] = await Promise.all([
    import('./HeroesDevPreviewLazy'),
    import('./ProductsDevPreviewLazy'),
    import('@/features/account/dev/previewRoutes'),
    import('@/features/battle-rooms/dev/BattleRoomLobbyDevPreview'),
  ])
  const AccountDevPreviewLazy = lazy(() =>
    import('@/features/account/dev/AccountDevPreview').then((module) => ({
      default: module.AccountDevPreview,
    })),
  )
  const CreateProductDevPreviewLazy = lazy(() =>
    import('@/features/admin/products/dev/CreateProductDevPreview').then((module) => ({
      default: module.CreateProductDevPreview,
    })),
  )
  const HeroSelectionDevPreviewLazy = lazy(() =>
    import('@/features/player-inventory/dev/HeroSelectionDevPreview').then((module) => ({
      default: module.HeroSelectionDevPreview,
    })),
  )
  const ModerationQueueDevPreviewLazy = lazy(() =>
    import('@/features/admin/comments/dev/ModerationQueueDevPreview').then((module) => ({
      default: module.ModerationQueueDevPreview,
    })),
  )
  const CatalogNotificationsDevPreviewLazy = lazy(() =>
    import('@/features/notifications/dev/CatalogNotificationsDevPreview').then((module) => ({
      default: module.CatalogNotificationsDevPreview,
    })),
  )
  const BannerManagementDevPreviewLazy = lazy(() =>
    import('@/features/notifications/dev/BannerManagementDevPreview').then((module) => ({
      default: module.BannerManagementDevPreview,
    })),
  )
  const BattleRoomLobbyDevPreviewLazy = lazy(() =>
    import('@/features/battle-rooms/dev/BattleRoomLobbyDevPreview').then((module) => ({
      default: module.BattleRoomLobbyDevPreview,
    })),
  )
  const PowerMeterDevPreviewLazy = lazy(() =>
    import('@/features/battle-rooms/dev/PowerMeterDevPreview').then((module) => ({
      default: module.PowerMeterDevPreview,
    })),
  )
  const ChatPanelDevPreviewLazy = lazy(() =>
    import('@/features/chat/dev/ChatPanelDevPreview').then((module) => ({
      default: module.ChatPanelDevPreview,
    })),
  )

  resolvedDevRoutes = [
    {
      path: '__dev/visual-library/heroes',
      element: (
        <Suspense fallback={null}>
          <HeroesDevPreviewLazy />
        </Suspense>
      ),
    },
    {
      path: '__dev/visual-library/products',
      element: (
        <Suspense fallback={null}>
          <ProductsDevPreviewLazy />
        </Suspense>
      ),
    },
  ]

  resolvedPublicDevRoutes = [
    {
      path: '__dev/account',
      element: (
        <Suspense fallback={null}>
          <AccountDevPreviewLazy />
        </Suspense>
      ),
      children: accountPreviewChildren,
    },
    // HU-33: el alta de producto vive tras `RequireSession` y una guarda de rol
    // administrativo, que el entorno local no puede satisfacer. El envio se
    // resuelve dentro del propio preview y NO llega a Catalog.
    {
      path: '__dev/admin/products/new',
      element: (
        <Suspense fallback={null}>
          <CreateProductDevPreviewLazy />
        </Suspense>
      ),
    }, // HU-07: la seleccion de heroe vive tras `RequireSession` y necesita
    // Player/Inventory y Catalog. El preview monta el componente de produccion
    // con datos de ejemplo y sin red, para poder revisar el diseño en local.
    {
      path: '__dev/heroes',
      element: (
        <Suspense fallback={null}>
          <HeroSelectionDevPreviewLazy />
        </Suspense>
      ),
    },
    // HU-41.4: la cola de moderacion vive tras `RequireSession` y
    // `RequireModerator`, y necesita Community respondiendo de verdad. El
    // preview intercepta `fetch` para `/api/comments/*` y monta el componente
    // de produccion sin guardas, igual que el resto de este bloque.
    {
      path: '__dev/admin/comments/moderation',
      element: (
        <Suspense fallback={null}>
          <ModerationQueueDevPreviewLazy />
        </Suspense>
      ),
    },
    // HU-38 (Task #185): el resumen de novedades y el banner viven en
    // `CommercePage`, tras `RequireSession`, y necesitan Notifications
    // respondiendo de verdad. El preview intercepta `fetch` para
    // `/api/v1/notifications/*` y `/api/v1/banners`.
    {
      path: '__dev/hu38/notifications',
      element: (
        <Suspense fallback={null}>
          <CatalogNotificationsDevPreviewLazy />
        </Suspense>
      ),
    },
    // HU-38 (Task #181): la gestion del banner vive tras `RequireSession` y
    // `RequireAdministrator`. El preview intercepta `fetch` para
    // `/api/v1/admin/banners`.
    {
      path: '__dev/hu38/admin-banners',
      element: (
        <Suspense fallback={null}>
          <BannerManagementDevPreviewLazy />
        </Suspense>
      ),
    },
    // HU-15.3: el lobby de preparacion vive tras `RequireSession` y necesita
    // Combat respondiendo de verdad. El preview intercepta `fetch` para
    // `/api/v1/combat/rooms*` y falsea una sesion sin `accessToken` (para
    // que el WebSocket de tiempo real quede `disabled`, mismo criterio que
    // las pruebas de `BattleRoomLobbyPage`). `useParams` necesita un
    // `roomId` real en la URL: `__dev/hu15/lobby` redirige al id fijo que el
    // preview simula.
    {
      path: '__dev/hu15/lobby',
      element: <Navigate to={`__dev/hu15/lobby/${FIXED_ROOM_ID}`} replace />,
    },
    {
      path: '__dev/hu15/lobby/:roomId',
      element: (
        <Suspense fallback={null}>
          <BattleRoomLobbyDevPreviewLazy />
        </Suspense>
      ),
    },
    // HU-11: el medidor de Poder aun no esta montado en ninguna pantalla del
    // producto (no existe el inicio de batalla ni un evento de Combat que lleve
    // el Poder). El preview monta el componente de produccion con datos de
    // ejemplo y sin red, para revisar su diseno y como se ve el valor
    // actualizado.
    {
      path: '__dev/hu11/poder',
      element: (
        <Suspense fallback={null}>
          <PowerMeterDevPreviewLazy />
        </Suspense>
      ),
    },
    // HU-13: el chat real necesita una sesion de Cognito y a Combat respondiendo
    // por WebSocket. El preview monta el componente de produccion contra un
    // servidor FALSO que habla el protocolo del contrato y falsea una sesion
    // mientras esta montado. No prueba el servidor.
    {
      path: '__dev/hu13/chat',
      element: (
        <Suspense fallback={null}>
          <ChatPanelDevPreviewLazy />
        </Suspense>
      ),
    },
  ]
}

export const devRoutes = resolvedDevRoutes
export const publicDevRoutes = resolvedPublicDevRoutes
