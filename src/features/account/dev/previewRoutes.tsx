import type { RouteObject } from 'react-router'

import { RequireAdministrator } from '@/app/RequireAdministrator'
import { AdminUsersSection } from '@/features/account/admin-users/AdminUsersSection'
import type { AdminAccountsResponse } from '@/features/account/admin-users/api'
import { StatisticsDevPreview } from '@/features/account/statistics/StatisticsDevPreview'
import type { HttpDownload } from '@/lib/http'
import type { Language } from '@/shared/i18n/languages'
import type { OwnAccount, OwnAccountEdit } from '../api'
import { ProfileSection } from '../ProfileSection'
import { SecuritySection } from '../SecuritySection'
import { PreferencesSection } from '../PreferencesSection'
import { SubscriptionsSection } from '../SubscriptionsSection'
import { PaymentMethodsSection } from '../PaymentMethodsSection'
import { PrivacySection } from '../PrivacySection'

/**
 * Rutas hijas de la VISTA PREVIA de desarrollo de "Mi cuenta" (HU-05.4 / HU-06.4).
 *
 * Son los mismos componentes de produccion; lo unico que cambia es que sus
 * transportes (`save`, `changePassword`) se inyectan resueltos para que los
 * formularios completen sin red -el entorno local no tiene sesion real-, y que
 * "Estadisticas y logros" recibe un estado de ejemplo por props
 * (`StatisticsDevPreview`) en lugar de un backend. Esto SOLO se usa desde
 * `publicDevRoutes` cuando `import.meta.env.DEV`.
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

export const PREVIEW_ADMIN_USERS: AdminAccountsResponse = {
  items: [
    {
      id: 'dev-admin-001',
      email: 'capitana.panel@nexus.test',
      displayName: 'Capitana Panel',
      firstNames: 'Ana Maria',
      lastNames: 'Vega',
      status: 'ACTIVE',
      roles: ['PLAYER', 'ADMINISTRATOR'],
      registeredAt: '2026-08-01T10:00:00.000Z',
    },
    {
      id: 'dev-moderator-002',
      email: 'moderadora.panel@nexus.test',
      displayName: 'Moderadora Panel',
      firstNames: 'Bruno',
      lastNames: 'Rojas',
      status: 'SUSPENDED',
      roles: ['PLAYER', 'MODERATOR'],
      registeredAt: '2026-07-15T15:30:00.000Z',
    },
  ],
  statusCounts: { pendingVerification: 0, active: 1, suspended: 1 },
}

const fixtureSave = (edit: OwnAccountEdit): Promise<OwnAccount> =>
  Promise.resolve({ ...PREVIEW_ACCOUNT, ...edit })

const fixtureChangePassword = (): Promise<void> => Promise.resolve()

/**
 * Formas estructurales de `TotpAssociation` (`../security/api`) y del recibo
 * de eliminacion (`../privacy/api`). No se importan esos tipos directamente
 * -la regla de arquitectura del repo prohibe que una feature entre a una
 * subcarpeta de otra feature con `../*\/`- pero el tipado estructural de
 * TypeScript hace que esta forma, al coincidir campo a campo, sea compatible
 * con los props reales (`onEnroll`, `requestDeletion`) sin duplicar logica.
 */
interface PreviewTotpAssociation {
  readonly otpauthUri: string
  readonly secret: string
}
interface PreviewDeletionReceipt {
  readonly id: string
  readonly status: 'RECEIVED' | 'IN_PROGRESS' | 'FAILED' | 'CLOSED'
  readonly receivedAt: string
}

// TOTP: el secreto es un valor de ejemplo, SIN valor real -ningun backend lo
// valida-, solo sirve para comprobar el layout del QR/clave manual sin tocar
// `POST /accounts/mfa/totp(/verification)`.
const fixtureTotpEnroll = (): Promise<PreviewTotpAssociation> =>
  Promise.resolve({
    otpauthUri:
      'otpauth://totp/NexusBattlesVI:dev-fixture?secret=DEVPREVIEWFIXTUREONLY&issuer=NexusBattlesVI',
    secret: 'DEVPREVIEWFIXTUREONLY',
  })
const fixtureTotpConfirm = (): Promise<void> => Promise.resolve()

// Idioma: devuelve la cuenta de fixture con el idioma solicitado, SIN llamar
// `PATCH /accounts/me`. Evita el bug visual de que el preview revierta el
// idioma elegido (la mutacion real fallaria sin sesion y `onError` restaura el
// idioma anterior).
const fixtureSaveLanguage = (preferredLanguage: Language): Promise<OwnAccount> =>
  Promise.resolve({ ...PREVIEW_ACCOUNT, preferredLanguage })

// Exportacion: no descarga ningun archivo real ni llama
// `GET /accounts/me/privacy/export`. Solo ejercita la transicion visual
// (idle -> loading -> success) que pide la vista previa.
const fixtureExportPersonalData = (): Promise<HttpDownload> =>
  Promise.resolve({
    content: new Blob(['fixture DEV, no es un export real'], { type: 'text/plain' }),
    filename: null,
    mediaType: 'text/plain',
  })
const fixtureSaveExport = (): void => {
  // Deliberadamente no-op: no se dispara ninguna descarga real del navegador.
}

// Eliminacion de cuenta: receta de fixture, SIN llamar
// `POST /accounts/me/deletion-requests`. Permite revisar la zona de peligro y
// el estado "recibida" sin abrir una solicitud real.
const fixtureRequestDeletion = (): Promise<PreviewDeletionReceipt> =>
  Promise.resolve({
    id: 'dev-deletion-request-0000',
    status: 'RECEIVED',
    receivedAt: new Date().toISOString(),
  })

export const accountPreviewChildren: RouteObject[] = [
  { index: true, element: <ProfileSection save={fixtureSave} /> },
  {
    path: 'security',
    element: (
      <SecuritySection
        changePassword={fixtureChangePassword}
        onTotpEnroll={fixtureTotpEnroll}
        onTotpConfirm={fixtureTotpConfirm}
        showLocalAuthNote
      />
    ),
  },
  {
    path: 'preferences',
    element: <PreferencesSection savePreferredLanguage={fixtureSaveLanguage} />,
  },
  { path: 'statistics', element: <StatisticsDevPreview /> },
  { path: 'subscriptions', element: <SubscriptionsSection /> },
  { path: 'payment-methods', element: <PaymentMethodsSection /> },
  {
    path: 'privacy',
    element: (
      <PrivacySection
        exportPersonalData={fixtureExportPersonalData}
        saveExport={fixtureSaveExport}
        requestDeletion={fixtureRequestDeletion}
      />
    ),
  },
  {
    path: 'admin-users',
    element: (
      <RequireAdministrator>
        <AdminUsersSection />
      </RequireAdministrator>
    ),
  },
]
