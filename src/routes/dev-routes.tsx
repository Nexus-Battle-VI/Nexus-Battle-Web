import { Suspense } from 'react'
import type { RouteObject } from 'react-router'

import { HeroesDevPreviewLazy } from './HeroesDevPreviewLazy'
import { ProductsDevPreviewLazy } from './ProductsDevPreviewLazy'
import { AccountDevPreviewLazy } from './AccountDevPreviewLazy'
import { accountPreviewChildren } from '@/features/account/dev/previewRoutes'

/**
 * Harnesses de verificacion tecnica, no pantallas del producto (ver
 * `src/shared/visual-library/heroes/HeroesDevPreview.tsx` para EN-026.3 y
 * `src/shared/visual-library/products/ProductsDevPreview.tsx` para EN-026.4).
 *
 * Cada `*Lazy` mantiene su harness fuera del bundle inicial incluso en
 * desarrollo. Todas estas entradas solo se agregan al arbol de rutas cuando
 * `import.meta.env.DEV` es verdadero (ver `routes.tsx`); en una compilacion de
 * produccion, `import.meta.env.DEV` es `false` y NUNCA entran al arbol
 * compilado.
 *
 * - `devRoutes`: cuelgan del shell autenticado (`AppLayout`), como el resto de
 *   pantallas internas.
 * - `publicDevRoutes`: cuelgan de la raiz, SIN `RequireSession`. La vista previa
 *   de "Mi cuenta" (HU-05.4) tiene que ser revisable sin una sesion real,
 *   porque el entorno local no puede establecer ninguna (ver informe). No es
 *   una puerta trasera: no monta `/account` productivo, no toca
 *   `RequireSession` y solo existe con `import.meta.env.DEV`.
 */
export const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
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
  : []

export const publicDevRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '__dev/account',
        element: (
          <Suspense fallback={null}>
            <AccountDevPreviewLazy />
          </Suspense>
        ),
        children: accountPreviewChildren,
      },
    ]
  : []
