import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'
import { AccountPixelIcon } from './AccountPixelIcon'

/**
 * Suscripciones (HU-05.4).
 *
 * Account no expone ningun contrato de suscripciones (revisado en su
 * controlador y DTOs). La Task es explicita: si la funcionalidad sigue
 * pendiente, NO se inventa -ni plan, ni precio, ni fecha, ni renovacion-. Se
 * declara el estado y ya. El remaster visual (Sprint 3) solo viste este mismo
 * placeholder con los paneles/iconos del kit: cero datos nuevos.
 */
export const SubscriptionsSection = (): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <Card
      className="account-panel"
      title={t('account:subscriptions.title')}
      description={t('account:subscriptions.description')}
    >
      <div className="account-empty-state flex flex-col items-center gap-3 py-6 text-center">
        <AccountPixelIcon icon="subscriptions" size="lg" className="account-empty-state__icon" />
        <p className="text-sm text-muted">
          <span className="font-medium text-ink">{t('account:notAvailableYet')}</span>{' '}
          {t('account:subscriptions.body')}
        </p>
      </div>
    </Card>
  )
}
