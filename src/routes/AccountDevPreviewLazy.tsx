import { lazy } from 'react'

/**
 * Componente perezoso de la vista previa de "Mi cuenta" (HU-05.4). Igual que los
 * otros harnesses de desarrollo, vive en su propio archivo por
 * `react-refresh/only-export-components` (`./dev-routes.tsx` exporta datos, no un
 * componente) y se mantiene fuera del bundle inicial incluso en desarrollo.
 */
export const AccountDevPreviewLazy = lazy(() =>
  import('@/features/account/dev/AccountDevPreview').then((module) => ({
    default: module.AccountDevPreview,
  })),
)
