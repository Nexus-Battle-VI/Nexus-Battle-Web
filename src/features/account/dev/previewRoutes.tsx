import type { RouteObject } from 'react-router'

import type { OwnAccount, OwnAccountEdit } from '../api'
import { ProfileSection } from '../ProfileSection'
import { SecuritySection } from '../SecuritySection'
import { PreferencesSection } from '../PreferencesSection'
import { SubscriptionsSection } from '../SubscriptionsSection'
import { PaymentMethodsSection } from '../PaymentMethodsSection'

/**
 * Rutas hijas de la VISTA PREVIA de desarrollo de "Mi cuenta" (HU-05.4).
 *
 * Son los mismos componentes de produccion; lo unico que cambia es que sus
 * transportes (`save`, `changePassword`) se inyectan resueltos para que los
 * formularios completen sin red -el entorno local no tiene sesion real-. Esto
 * SOLO se usa desde `publicDevRoutes` cuando `import.meta.env.DEV`.
 */

export const PREVIEW_ACCOUNT: OwnAccount = {
  id: 'dev-fixture-0000-0000-0000-000000000000',
  email: 'jugador.demo@nexus.test',
  displayName: 'Jugador Demo',
  firstNames: 'Jugador',
  lastNames: 'Demo',
  status: 'ACTIVE',
  roles: ['PLAYER'],
}

const fixtureSave = (edit: OwnAccountEdit): Promise<OwnAccount> =>
  Promise.resolve({ ...PREVIEW_ACCOUNT, displayName: edit.displayName })

const fixtureChangePassword = (): Promise<void> => Promise.resolve()

export const accountPreviewChildren: RouteObject[] = [
  { index: true, element: <ProfileSection save={fixtureSave} /> },
  {
    path: 'security',
    element: <SecuritySection changePassword={fixtureChangePassword} showLocalAuthNote />,
  },
  { path: 'preferences', element: <PreferencesSection /> },
  { path: 'subscriptions', element: <SubscriptionsSection /> },
  { path: 'payment-methods', element: <PaymentMethodsSection /> },
]
