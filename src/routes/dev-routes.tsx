import { lazy, Suspense } from 'react'
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
  const [{ HeroesDevPreviewLazy }, { ProductsDevPreviewLazy }, { accountPreviewChildren }] =
    await Promise.all([
      import('./HeroesDevPreviewLazy'),
      import('./ProductsDevPreviewLazy'),
      import('@/features/account/dev/previewRoutes'),
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
  ]
}

export const devRoutes = resolvedDevRoutes
export const publicDevRoutes = resolvedPublicDevRoutes
