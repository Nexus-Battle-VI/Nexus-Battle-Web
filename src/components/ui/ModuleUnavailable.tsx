import { Card } from './Card'

export interface ModuleUnavailableProps {
  readonly title: string
}

/**
 * Acceso ya visible en la navegacion para un modulo que todavia no existe.
 *
 * El cliente confirmo que un acceso puede existir en la navegacion aunque el
 * modulo detras todavia no este implementado (Jugar Online, Misiones, Torneo,
 * Subasta). A diferencia de los marcadores de posicion de un bounded context
 * (`AccountPage`, `PlayerInventoryPage`...), estos no nombran un servicio
 * responsable: ese servicio todavia no existe en la organizacion, y
 * atribuirselo a uno inventado seria peor que no nombrarlo.
 */
export const ModuleUnavailable = ({ title }: ModuleUnavailableProps): React.JSX.Element => (
  <Card title={title}>
    <p className="text-sm text-muted">
      <span className="font-medium text-ink">Módulo no disponible.</span> Esta funcionalidad todavía
      no está disponible en este incremento.
    </p>
  </Card>
)
