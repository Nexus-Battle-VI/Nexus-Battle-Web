import { Card } from '@/components/ui/Card'
import { useTranslation } from 'react-i18next'

/**
 * Metodos de pago (HU-05.4).
 *
 * Account no expone contrato de metodos de pago, y la Task limita esto a un
 * estado visual aprobado. NO se integra ninguna pasarela real, NO se piden
 * numeros de tarjeta y NO se muestra una tarjeta ficticia ("**** 4242") como si
 * fuera del usuario.
 */
export const PaymentMethodsSection = (): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <Card title={t('account:payments.title')} description={t('account:payments.description')}>
      <p className="text-sm text-muted">
        <span className="font-medium text-ink">{t('account:notAvailableYet')}</span>{' '}
        {t('account:payments.body')}
      </p>
    </Card>
  )
}
