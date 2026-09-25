import { Card } from '@/components/ui/Card'
import { useTranslation } from 'react-i18next'

/**
 * Suscripciones (HU-05.4).
 *
 * Account no expone ningun contrato de suscripciones (revisado en su
 * controlador y DTOs). La Task es explicita: si la funcionalidad sigue
 * pendiente, NO se inventa -ni plan, ni precio, ni fecha, ni renovacion-. Se
 * declara el estado y ya.
 */
export const SubscriptionsSection = (): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <Card
      title={t('account:subscriptions.title')}
      description={t('account:subscriptions.description')}
    >
      <p className="text-sm text-muted">
        <span className="font-medium text-ink">{t('account:notAvailableYet')}</span>{' '}
        {t('account:subscriptions.body')}
      </p>
    </Card>
  )
}
