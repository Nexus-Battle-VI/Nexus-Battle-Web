import { useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'

import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'
import { AccountPage } from '../AccountPage'
import type { OwnPersonalData } from '../api'
import { PREVIEW_ACCOUNT, PREVIEW_ADMIN_USERS } from './previewRoutes'

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
        <p className="bg-brand/10 px-4 py-2 text-center text-xs text-ink">
          Vista previa de desarrollo - fixture DEV con rol {role}. No es una sesion real.
        </p>
        <main className="mx-auto max-w-6xl px-4 py-8">
          <AccountPage />
        </main>
      </div>
    </QueryClientProvider>
  )
}
