import { Card } from '@/components/ui/Card'
import { TotpEnrollment } from './security/TotpEnrollment'

/**
 * Pantalla del bounded context Account/Identity.
 *
 * La seguridad de la cuenta (segundo factor) YA es real: se inscribe el
 * autenticador aqui, por la UI del producto. El resto de la gestion de la cuenta
 * sigue siendo un marcador de posicion **declarado como tal** -no se simula
 * contenido, que confundiria una pantalla vacia honesta con una implementada-.
 */
export const AccountPage = (): React.JSX.Element => (
  <div className="space-y-4">
    <Card title="Seguridad" description="Segundo factor con una aplicacion autenticadora (TOTP).">
      <TotpEnrollment />
    </Card>

    <Card title="Cuenta" description="Registro, verificacion y roles de la cuenta de jugador.">
      <p className="text-sm text-muted">
        Esta pantalla todavia no esta implementada. Su funcionalidad corresponde al servicio
        <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-xs">Nexus-Battle-Account</code>y
        se desarrollara en su Historia de Usuario.
      </p>
    </Card>
  </div>
)
