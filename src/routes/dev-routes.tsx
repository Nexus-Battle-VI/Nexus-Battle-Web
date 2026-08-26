import { Suspense } from 'react'
import type { RouteObject } from 'react-router'

import { HeroesDevPreviewLazy } from './HeroesDevPreviewLazy'

/**
 * Harness de verificacion tecnica de EN-026.3, no una pantalla del producto
 * (ver `src/shared/visual-library/heroes/HeroesDevPreview.tsx`).
 *
 * `HeroesDevPreviewLazy` (definido en `./HeroesDevPreviewLazy.tsx`, ver ese
 * archivo) mantiene el harness fuera del bundle inicial incluso en
 * desarrollo. `devRoutes` solo se agrega al arbol de rutas cuando
 * `import.meta.env.DEV` es verdadero (ver `routes.tsx`); en una compilacion
 * de produccion, `import.meta.env.DEV` es `false` y esta entrada nunca se
 * agrega al arbol de rutas compilado.
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
    ]
  : []
