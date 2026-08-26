import { Link } from 'react-router'

import { Card } from '@/components/ui/Card'

/**
 * Destino publico de "Crear cuenta" mientras HU-01 no forma parte de esta
 * rama.
 *
 * El registro de cuenta de jugador (HU-01) se desarrolla en su propia rama y
 * todavia no esta integrado en `develop`: por eso esta pantalla no reproduce
 * ningun formulario de registro, que seria alcance de otra Historia de
 * Usuario. Se declara el estado real en lugar de simular un registro que no
 * existe todavia aqui.
 */
export const RegistrationPendingPage = (): React.JSX.Element => (
  <div className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10 text-ink">
    <Card title="Crear cuenta" className="w-full max-w-md">
      <p className="text-sm text-muted">
        El registro de cuenta de jugador todavía no está integrado en esta rama. Su implementación
        corresponde a HU-01 — Registro de cuenta de jugador.
      </p>
      <Link to="/login" className="mt-4 inline-block text-sm font-medium text-brand underline">
        Volver a iniciar sesión
      </Link>
    </Card>
  </div>
)
