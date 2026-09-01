import { Card } from '@/components/ui/Card'

/**
 * Suscripciones (HU-05.4).
 *
 * Account no expone ningun contrato de suscripciones (revisado en su
 * controlador y DTOs). La Task es explicita: si la funcionalidad sigue
 * pendiente, NO se inventa -ni plan, ni precio, ni fecha, ni renovacion-. Se
 * declara el estado y ya.
 */
export const SubscriptionsSection = (): React.JSX.Element => (
  <Card title="Suscripciones" description="Plan y estado de tu suscripcion a Nexus Battles VI.">
    <p className="text-sm text-muted">
      <span className="font-medium text-ink">Todavia no disponible.</span> Cuando exista un servicio
      de suscripciones, aqui podras consultar tu plan y gestionarlo.
    </p>
  </Card>
)
