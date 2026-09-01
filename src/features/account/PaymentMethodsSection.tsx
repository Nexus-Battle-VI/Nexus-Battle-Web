import { Card } from '@/components/ui/Card'

/**
 * Metodos de pago (HU-05.4).
 *
 * Account no expone contrato de metodos de pago, y la Task limita esto a un
 * estado visual aprobado. NO se integra ninguna pasarela real, NO se piden
 * numeros de tarjeta y NO se muestra una tarjeta ficticia ("**** 4242") como si
 * fuera del usuario.
 */
export const PaymentMethodsSection = (): React.JSX.Element => (
  <Card title="Metodos de pago" description="Formas de pago asociadas a tu cuenta.">
    <p className="text-sm text-muted">
      <span className="font-medium text-ink">Todavia no disponible.</span> La gestion de metodos de
      pago se habilitara cuando el servicio de pagos este disponible. No se solicitan ni se
      almacenan datos financieros en esta pantalla.
    </p>
  </Card>
)
