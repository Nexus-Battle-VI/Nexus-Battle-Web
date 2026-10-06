import { useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { useTheme, type Theme } from '@/shared/theme'
import { AccountPage } from '../AccountPage'
import type { OwnPersonalData } from '../api'
import { PREVIEW_ACCOUNT, PREVIEW_ADMIN_USERS } from './previewRoutes'

/**
 * Barra DEV de QA visual (ronda 1 de correccion). Extiende el aviso de
 * fixture ya existente con un control Claro/Oscuro para no depender de
 * entrar a Preferencias para cambiar de tema durante el QA.
 *
 * Usa el store REAL de tema (`@/shared/theme`) -el mismo que
 * `PreferencesSection`-, nunca un estado propio: cambiar aqui es
 * exactamente la misma accion que cambiar en Preferencias. No hace ninguna
 * peticion de red. Todo este archivo solo se alcanza bajo `import.meta.env.DEV`
 * (ver `dev-routes.tsx`), por lo que nunca entra al bundle productivo.
 */
const DEV_THEME_OPTIONS: readonly { readonly value: Theme; readonly label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

const AccountDevToolbar = ({ role }: { readonly role: string }): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  const setTheme = useTheme((state) => state.setTheme)

  return (
    <div className="account-dev-toolbar">
      <p className="account-dev-toolbar__notice">
        Vista previa de desarrollo — fixture DEV con rol {role}. No es una sesión real.
      </p>
      <div
        role="group"
        aria-label="Tema de la vista previa (solo DEV)"
        className="account-dev-toolbar__theme"
      >
        {DEV_THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={theme === option.value}
            onClick={() => {
              setTheme(option.value)
            }}
            className="account-dev-toolbar__theme-btn"
          >
            <span aria-hidden>{option.value === 'light' ? '☀' : '☽'}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Preview DEV de Mi cuenta. `role` permite revisar la presentacion RBAC sin
 * alterar rutas productivas ni convertir fixtures en fallback de red.
 */
const PREVIEW_ROLES = ['PLAYER', 'MODERATOR', 'ADMINISTRATOR', 'SUPER_ADMINISTRATOR'] as const
type PreviewRole = (typeof PREVIEW_ROLES)[number]

const isPreviewRole = (value: string | null): value is PreviewRole =>
  PREVIEW_ROLES.some((role) => role === value)

const PREVIEW_PERSONAL_DATA: OwnPersonalData = {
  email: 'jugador.demo@nexus.test',
  displayName: 'Jugador Demo',
  firstNames: 'Jugador',
  lastNames: 'Demo',
  roles: ['PLAYER'],
  termsAccepted: true,
}

export const AccountDevPreview = (): React.JSX.Element => {
  const [searchParams] = useSearchParams()
  const rawRole = searchParams.get('role')
  const role: PreviewRole = isPreviewRole(rawRole) ? rawRole : 'ADMINISTRATOR'
  const roles = useMemo<readonly string[]>(
    () => (role === 'PLAYER' ? ['PLAYER'] : ['PLAYER', role]),
    [role],
  )
  const account = useMemo(() => ({ ...PREVIEW_ACCOUNT, roles }), [roles])
  const personalData = useMemo(() => ({ ...PREVIEW_PERSONAL_DATA, roles }), [roles])
  const [previewQueryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
      }),
  )

  previewQueryClient.setQueryData(queryKeys.account.me, account)
  previewQueryClient.setQueryData(queryKeys.account.privacy, personalData)
  previewQueryClient.setQueryData(queryKeys.account.adminUsers(''), PREVIEW_ADMIN_USERS)

  useEffect(() => {
    const previousRoles = useSession.getState().roles
    useSession.setState({ roles })

    return () => {
      useSession.setState({ roles: previousRoles })
    }
  }, [roles])

  return (
    <QueryClientProvider client={previewQueryClient}>
      <div className="min-h-dvh">
        <AccountDevToolbar role={role} />
        {/*
         * Mismo contenedor que `AppLayout.tsx` usa en produccion para `/account*`
         * (`account-main mx-auto w-full px-3 py-4 sm:px-4`, maximo 1680px via
         * `.account-main` en `account.css`) -antes el preview usaba `max-w-6xl`
         * propio, una geometria mas angosta que la real; QA visual necesita ver
         * EXACTAMENTE el layout de produccion, no una aproximacion.
         */}
        <main className="account-main mx-auto w-full px-3 py-4 sm:px-4">
          <AccountPage />
        </main>
      </div>
    </QueryClientProvider>
  )
}
