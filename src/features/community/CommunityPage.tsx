import { Card } from '@/components/ui/Card'

/**
 * Pantalla del bounded context Community.
 *
 * Es un marcador de posicion **declarado como tal**. La estructura de la
 * feature existe y la ruta esta conectada, pero la funcionalidad se
 * implementara en su Historia de Usuario correspondiente.
 *
 * No se simula contenido: una pantalla con datos inventados es indistinguible
 * de una implementada, y esa confusion es peor que una pantalla vacia honesta.
 */
export const CommunityPage = (): React.JSX.Element => (
  <Card title="Comunidad" description="Hilos de conversacion y mensajes.">
    <p className="text-sm text-muted">
      Esta pantalla todavia no esta implementada. Su funcionalidad corresponde al servicio
      <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-xs">Nexus-Battle-Community</code>y
      se desarrollara en su Historia de Usuario.
    </p>
  </Card>
)
