import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'
import { primaryRole } from '@/shared/rbac'
import { useSession } from '@/shared/session'

export interface RequireSuperAdministratorProps {
  readonly children: ReactNode
}

/**
 * Puerta de presentacion para HU-39. No autoriza la operacion: Account valida
 * el testimonio y responde 403 aunque alguien escriba la URL manualmente.
 */
export const RequireSuperAdministrator = ({
  children,
}: RequireSuperAdministratorProps): React.JSX.Element => {
  const roles = useSession((state) => state.roles)
  const { t } = useTranslation()

  if (primaryRole(roles) !== 'SUPER_ADMINISTRATOR') {
    return (
      <Card title={t('app:access.deniedTitle')}>
        <p role="alert" className="text-sm text-muted">
          {t('app:access.superAdministrator')}
        </p>
      </Card>
    )
  }

  return <>{children}</>
}
