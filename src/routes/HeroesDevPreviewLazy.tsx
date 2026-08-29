import { lazy } from 'react'

/**
 * Componente perezoso del harness de EN-026.3. Vive en su propio archivo
 * (que solo exporta este componente) porque `react-refresh/only-export-components`
 * no permite que un componente definido localmente conviva con exports que no
 * son componentes en el mismo modulo; `./dev-routes.tsx` exporta datos
 * (`devRoutes: RouteObject[]`), no un componente.
 */
export const HeroesDevPreviewLazy = lazy(() =>
  import('@/shared/visual-library/heroes/HeroesDevPreview').then((module) => ({
    default: module.HeroesDevPreview,
  })),
)
