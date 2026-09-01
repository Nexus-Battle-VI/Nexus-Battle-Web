import type { RouteObject } from 'react-router'

import { ProfileSection } from './ProfileSection'
import { SecuritySection } from './SecuritySection'
import { PreferencesSection } from './PreferencesSection'
import { SubscriptionsSection } from './SubscriptionsSection'
import { PaymentMethodsSection } from './PaymentMethodsSection'

/**
 * Rutas hijas de "Mi cuenta" (HU-05.4).
 *
 * Se declaran una sola vez aqui y las consume tanto el arbol real (`routes.tsx`
 * las monta bajo `account`) como la vista previa de desarrollo. "Perfil" es la
 * ruta indice: `/account` ES el perfil, sin un `/account/profile` redundante.
 */
export const accountSectionRoutes: RouteObject[] = [
  { index: true, element: <ProfileSection /> },
  { path: 'security', element: <SecuritySection /> },
  { path: 'preferences', element: <PreferencesSection /> },
  { path: 'subscriptions', element: <SubscriptionsSection /> },
  { path: 'payment-methods', element: <PaymentMethodsSection /> },
]
