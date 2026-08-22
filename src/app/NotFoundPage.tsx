import { Link } from 'react-router'

import { Card } from '@/components/ui/Card'

export const NotFoundPage = (): React.JSX.Element => (
  <Card title="Pagina no encontrada">
    <p className="text-sm text-muted">La ruta solicitada no existe en esta aplicacion.</p>
    <Link to="/catalog" className="mt-4 inline-block text-sm font-medium text-brand underline">
      Volver al catalogo
    </Link>
  </Card>
)
