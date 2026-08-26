import { Suspense } from 'react'
import type { RouteObject } from 'react-router'

import { HeroesDevPreviewLazy } from './HeroesDevPreviewLazy'
import { ProductsDevPreviewLazy } from './ProductsDevPreviewLazy'

/**
 * Harnesses de verificacion tecnica, no pantallas del producto (ver
 * `src/shared/visual-library/heroes/HeroesDevPreview.tsx` para EN-026.3 y
 * `src/shared/visual-library/products/ProductsDevPreview.tsx` para EN-026.4).
 *
 * Cada `*Lazy` mantiene su harness fuera del bundle inicial incluso en
 * desarrollo. `devRoutes` solo se agrega al arbol de rutas cuando
 * `import.meta.env.DEV` es verdadero (ver `routes.tsx`); en una compilacion
 * de produccion, `import.meta.env.DEV` es `false` y estas entradas nunca se
 * agregan al arbol de rutas compilado.
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
