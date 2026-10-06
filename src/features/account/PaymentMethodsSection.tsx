import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'
import { AccountPixelIcon } from './AccountPixelIcon'

/**
 * Metodos de pago (HU-05.4).
 *
 * Account no expone contrato de metodos de pago, y la Task limita esto a un
 * estado visual aprobado. NO se integra ninguna pasarela real, NO se piden
 * numeros de tarjeta y NO se muestra una tarjeta ficticia ("**** 4242") como si
 * fuera del usuario. El remaster visual (Sprint 3) solo viste este mismo
 * placeholder con los paneles/iconos del kit: cero datos nuevos.
 */
export const PaymentMethodsSection = (): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <Card
      className="account-panel"
      title={t('account:payments.title')}
      description={t('account:payments.description')}
    >
      <div className="account-empty-state flex flex-col items-center gap-3 py-6 text-center">
        <AccountPixelIcon icon="paymentMethods" size="lg" className="account-empty-state__icon" />
        <p className="text-sm text-muted">
          <span className="font-medium text-ink">{t('account:notAvailableYet')}</span>{' '}
          {t('account:payments.body')}
        </p>
      </div>
    </Card>
  )
}
