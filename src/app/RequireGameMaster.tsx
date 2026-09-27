import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'
import { canPublishOfficialAuctions } from '@/shared/rbac'
import { useSession } from '@/shared/session'

export interface RequireGameMasterProps {
  readonly children: ReactNode
}

/**
 * Puerta de presentacion para la publicacion oficial (HU-66.5/66.6).
 *
 * NO AUTORIZA NADA, mismo criterio que `RequireAdministrator`: Auction exige
 * el rol GAME_MASTER MAS el subject configurado (HU-66.1) y rechaza con 403
 * aunque alguien escriba la URL a mano; esto solo evita mostrar un formulario
 * que la persona no va a poder enviar.
 */
export const RequireGameMaster = ({ children }: RequireGameMasterProps): React.JSX.Element => {
  const roles = useSession((state) => state.roles)
  const { t } = useTranslation()

  if (!canPublishOfficialAuctions(roles)) {
    return (
      <Card title={t('app:access.deniedTitle')}>
        <p role="alert" className="text-sm text-muted">
          {t('app:access.gameMaster')}
        </p>
      </Card>
    )
  }

  return <>{children}</>
}
