import { Card } from '@/components/ui/Card'

/**
 * Landing posterior a un login exitoso (HU-02).
 *
 * El cliente aclaro que, tras iniciar sesion, el destino es siempre esta
 * pantalla -y lo sera tambien tras un registro o un cambio de contrasena
 * exitosos, en HUs posteriores-. HU-02 no implementa carrito, checkout,
 * catalogo funcional ni pagos: eso pertenece a las Historias de Usuario del
 * bounded context de comercio. Por eso esta pantalla, hoy, declara
 * honestamente que no hay productos en lugar de inventar un catalogo.
 *
 * No reutiliza `CatalogPage`/`useProducts`: esa pantalla pertenece a otra
 * Historia de Usuario, ya consulta un servicio real y muestra un filtro y una
 * jerarquia de contenido que HU-02 no debe anticipar todavia.
 */
export const EcommercePage = (): React.JSX.Element => (
  <Card title="E-commerce">
    <p className="text-sm text-muted">No hay productos disponibles por el momento.</p>
  </Card>
)
